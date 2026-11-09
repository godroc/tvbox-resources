"""In-memory, short-lived keyboard pairing for one WebHome page."""
import base64
import io
import json
import os
import re
import secrets
import threading
import time
import sys
from pathlib import Path
from urllib.parse import urlsplit
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, str(Path(__file__).with_name("qrcode-8.2-py3-none-any.whl")))
import qrcode
from qrcode.image.svg import SvgPathImage

PAIR_ORIGIN = os.environ.get('PAIR_ORIGIN', 'http://192.168.50.252:8100').rstrip('/')
LOCK = threading.Lock()
SESSIONS = {}
TOKENS = {}
SESSION_TTL = 1800
MESSAGE_TTL = 20
PUSH_TTL = 1800
MAX_PUSHES = 8
MAX_BODY = 24 * 1024


def expire(now):
    for code, item in list(SESSIONS.items()):
        if item['expires'] <= now:
            del SESSIONS[code]
            for token in (item['tv'], item.get('phone')):
                TOKENS.pop(token, None)
        else:
            if item.get('message') and item['message']['expires'] <= now:
                item['message'] = None
            item['pushes'] = [push for push in item['pushes'] if push['expires'] > now]


def push_address(value):
    if not isinstance(value, str):
        return None
    value = value.strip()
    if not 1 <= len(value) <= 4000 or any(ord(c) < 32 or c.isspace() for c in value):
        return None
    try:
        url = urlsplit(value)
        if url.scheme in ('http', 'https') and url.hostname and url.username is None and url.password is None:
            _ = url.port
            return value
        if re.match(r'^(magnet:\?xt=urn:btih:|ed2k://|thunder://).+', value, re.I):
            return value
    except ValueError:
        pass
    return None


def dispatch(path, data, token, secure):
    now = time.monotonic()
    with LOCK:
        expire(now)
        if path == '/pair':
            if len(SESSIONS) >= 16:
                return 429, {'error': 'busy'}
            ident = secrets.token_urlsafe(12)
            tv = secrets.token_urlsafe(32)
            number = next(n for n in range(1, 17) if all(item['number'] != n for item in SESSIONS.values()))
            item = {'tv': tv, 'number': number, 'expires': now + SESSION_TTL,
                    'field': None, 'message': None, 'pushes': []}
            SESSIONS[ident] = item
            TOKENS[tv] = ('tv', item)
            address = PAIR_ORIGIN + '/k/'
            image = qrcode.make(address, image_factory=SvgPathImage, border=4)
            svg = io.BytesIO()
            image.save(svg)
            encoded = base64.b64encode(svg.getvalue()).decode('ascii')
            return 200, {'address': address, 'number': number, 'qr': 'data:image/svg+xml;base64,' + encoded, 'token': tv}
        if path == '/discover':
            return 200, {'devices': [{'id': ident, 'number': item['number']}
                                     for ident, item in SESSIONS.items()
                                     if not item.get('phone')]}
        if path == '/join':
            ident = data.get('device')
            item = SESSIONS.get(ident) if isinstance(ident, str) else None
            if not item or item.get('phone'):
                return 409, {'error': 'device_busy'}
            phone = secrets.token_urlsafe(32)
            item['phone'] = phone
            TOKENS[phone] = ('phone', item)
            return 200, {'token': phone}
        role, item = TOKENS.get(token, (None, None))
        if item is None:
            return 401, {'error': 'pair_expired'}
        if path == '/connection' and role == 'phone':
            return 200, {'connected': True}
        if path == '/close' and role == 'tv':
            item['expires'] = now
            expire(now)
            return 200, {}
        if path == '/target' and role == 'tv':
            field = data.get('field')
            if field is not None:
                if not isinstance(field, dict) or not isinstance(field.get('id'), str) or not re.fullmatch(r'[0-9a-f]{24}', field['id']):
                    return 400, {'error': 'invalid_field'}
                label = field.get('label')
                if not isinstance(label, str) or not 1 <= len(label) <= 100:
                    return 400, {'error': 'invalid_field'}
                field = {'id': field['id'], 'label': label, 'sensitive': field.get('sensitive') is True}
            if field != item['field']:
                item['message'] = None
            item['field'] = field
            item['expires'] = now + SESSION_TTL
            pushes = [{'id': p['id'], 'url': p['url']} for p in item['pushes']]
            return 200, {'paired': bool(item.get('phone')), 'pushes': pushes}
        if path == '/push' and role == 'phone':
            url = push_address(data.get('url'))
            if url is None:
                return 400, {'error': 'invalid_url'}
            if any(p['url'] == url for p in item['pushes']):
                return 200, {'queued': True}
            if len(item['pushes']) >= MAX_PUSHES:
                return 409, {'error': 'inbox_full'}
            item['pushes'].append({'id': secrets.token_urlsafe(12), 'url': url, 'expires': now + PUSH_TTL})
            return 202, {'queued': True}
        if path == '/dismiss-push' and role == 'tv':
            item['pushes'] = [p for p in item['pushes'] if p['id'] != data.get('id')]
            return 200, {}
        if path == '/state' and role == 'phone':
            return 200, {'field': item['field'], 'secure': secure}
        if path == '/send' and role == 'phone':
            field, text = item['field'], data.get('text')
            if not field or data.get('id') != field['id']:
                return 409, {'error': 'focus_changed'}
            if field['sensitive'] and not secure:
                return 403, {'error': 'https_required'}
            if not isinstance(text, str) or len(text) > 4000:
                return 400, {'error': 'invalid_text'}
            item['message'] = {'id': field['id'], 'text': text, 'expires': now + MESSAGE_TTL}
            return 202, {'queued': True}
        if path == '/pull' and role == 'tv':
            message = item['message']
            if item['field'] and item['field']['sensitive'] and not secure:
                return 403, {'error': 'https_required'}
            item['message'] = None
            return 200, {'message': {'id': message['id'], 'text': message['text']} if message else None}
        return 404, {'error': 'not_found'}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_POST(self):
        self.connection.settimeout(5)
        try:
            size = int(self.headers.get('Content-Length', 0))
            if self.headers.get_content_type() != 'application/json' or not 1 <= size <= MAX_BODY:
                raise ValueError()
            body = json.loads(self.rfile.read(size))
            if not isinstance(body, dict):
                raise ValueError()
        except (ValueError, OSError):
            status, result = 400, {'error': 'invalid_request'}
        else:
            token = self.headers.get('Authorization', '').removeprefix('Bearer ')
            # Set by the same-origin TLS reverse proxy on a private network.
            secure = self.headers.get('X-Forwarded-Proto') == 'https'
            status, result = dispatch(self.path, body, token, secure)
        payload = json.dumps(result).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


if __name__ == '__main__':
    ThreadingHTTPServer(('0.0.0.0', 8111), Handler).serve_forever()
