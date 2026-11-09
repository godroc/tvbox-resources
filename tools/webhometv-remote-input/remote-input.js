(function (root) {
  'use strict';
  var doc = root.document;
  var endpoint = '/webhometv/input-api';
  var token = '', timer = null, target = null, revision = '', busy = false, session = 0;
  var status, link, qr, pairButton, inbox;
  var inboxSignature = '', lastPushCount = 0;
  var editableTypes = /^(text|search|password|url|tel|email|number|date|datetime-local|month|time|week)$/;

  function editable(node) {
    if (!node || !node.isConnected || node.disabled || !node.getClientRects().length) return false;
    if (node.tagName !== 'TEXTAREA' && !(node.tagName === 'INPUT' && editableTypes.test(node.type))) return false;
    if (!node.readOnly) return true;
    return node.id === 'query' || (node.hasAttribute('data-gg-gated') && node.__ggOriginallyReadonly === false);
  }

  function randomID() {
    var bytes = new Uint8Array(12);
    root.crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (n) { return ('0' + n.toString(16)).slice(-2); }).join('');
  }

  function activeField() {
    var node = !doc.hidden && editable(doc.activeElement) ? doc.activeElement : null;
    if (node !== target) {
      target = node;
      revision = node ? randomID() : '';
    }
    return node;
  }

  function fieldName(node) {
    var label = node.labels && node.labels[0];
    return (node.getAttribute('aria-label') || (label && label.textContent) || node.placeholder || node.id || '文本输入').trim().slice(0, 100);
  }

  function call(path, data, auth) {
    return fetch(endpoint + path, {
      method: 'POST', cache: 'no-store',
      headers: {'Content-Type': 'application/json', Authorization: auth ? 'Bearer ' + auth : ''},
      body: JSON.stringify(data || {})
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function apply(message) {
    var node = activeField();
    if (!node || !message || message.id !== revision || (node.type === 'password' && location.protocol !== 'https:')) return;
    var limit = node.maxLength;
    node.value = limit >= 0 ? message.text.slice(0, limit) : message.text;
    node.dispatchEvent(new Event('input', {bubbles: true}));
  }

  function pushLabel(url) {
    try {
      var parsed = new URL(url);
      return parsed.hostname || parsed.protocol.slice(0, -1);
    } catch (error) {
      return '链接';
    }
  }

  function showInbox(pushes) {
    var count = pushes.length;
    var nav = doc.querySelector('[data-action="push"]');
    if (nav && (count !== lastPushCount || nav.textContent.indexOf('推送') < 0)) {
      nav.textContent = count ? '推送 ' + count : '推送';
    }
    lastPushCount = count;
    var signature = pushes.map(function (p) { return p.id; }).join('|');
    if (signature === inboxSignature) return;
    inboxSignature = signature;
    var focused = doc.activeElement;
    var lostFocus = inbox.contains(focused);
    var previousKey = lostFocus && focused.getAttribute('data-push-id');
    inbox.textContent = '';
    inbox.hidden = !count;
    if (count) {
      var title = doc.createElement('p');
      title.textContent = '手机推送（' + count + '）';
      inbox.appendChild(title);
    }
    pushes.forEach(function (push, index) {
      var row = doc.createElement('div');
      var use = doc.createElement('button');
      var dismiss = doc.createElement('button');
      use.type = dismiss.type = 'button';
      use.className = dismiss.className = 'subbutton';
      use.textContent = (index + 1) + ' · ' + pushLabel(push.url) + ' · 选用';
      dismiss.textContent = '移除';
      use.setAttribute('data-push-id', push.id);
      dismiss.setAttribute('data-push-id', push.id + '-dismiss');
      dismiss.setAttribute('aria-label', '移除第 ' + (index + 1) + ' 条推送');
      function remove() {
        if (token) call('/dismiss-push', {id: push.id}, token).catch(function () {});
      }
      use.onclick = function () {
        var field = doc.getElementById('pushURL');
        field.value = push.url;
        field.dispatchEvent(new Event('input', {bubbles: true}));
        var submit = doc.querySelector('#pushForm button[type="submit"]');
        if (submit) submit.focus();
        remove();
      };
      dismiss.onclick = remove;
      row.appendChild(use);
      row.appendChild(dismiss);
      inbox.appendChild(row);
      if (previousKey === push.id) use.focus();
      if (previousKey === push.id + '-dismiss') dismiss.focus();
    });
    if (lostFocus && !inbox.contains(doc.activeElement)) {
      var next = inbox.querySelector('button') || doc.querySelector('#pushForm button[type="submit"]');
      if (next) next.focus();
    }
  }

  function tick() {
    if (!token || busy) return;
    var currentSession = session, auth = token, node = activeField();
    var field = node ? {id: revision, label: fieldName(node), sensitive: node.type === 'password'} : null;
    busy = true;
    call('/target', {field: field}, auth).then(function (r) {
      if (currentSession !== session) return;
      status.textContent = r.paired ? '手机已连接。用遥控器选中要输入的框。' : '请用手机相机扫码';
      showInbox(Array.isArray(r.pushes) ? r.pushes : []);
      qr.hidden = r.paired;
      link.hidden = r.paired;
      if (r.paired && field && (!field.sensitive || location.protocol === 'https:')) {
        return call('/pull', {}, auth).then(function (r) { if (currentSession === session) apply(r.message); });
      }
    }).catch(function (error) {
      if (currentSession !== session) return;
      if (error.message === 'HTTP 401') end('配对已过期');
      else status.textContent = '连接暂不可用，正在重试';
    }).then(function () { if (currentSession === session) busy = false; });
  }

  function end(message) {
    var old = token;
    session++;
    token = '';
    target = null;
    revision = '';
    busy = false;
    clearInterval(timer);
    link.hidden = true;
    qr.hidden = true;
    qr.removeAttribute('src');
    status.textContent = message || '手机未连接';
    pairButton.textContent = '连接手机键盘';
    showInbox([]);
    if (old) call('/close', {}, old).catch(function () {});
  }

  function mount() {
    var host = doc.querySelector('[data-settings-panel="device"]');
    var pushForm = doc.getElementById('pushForm');
    if (!host || !pushForm) return;
    inbox = doc.createElement('div');
    inbox.className = 'field';
    inbox.id = 'phonePushInbox';
    inbox.hidden = true;
    pushForm.parentNode.insertBefore(inbox, pushForm);
    var section = doc.createElement('div');
    section.className = 'field';
    pairButton = doc.createElement('button');
    pairButton.type = 'button';
    pairButton.className = 'subbutton';
    pairButton.textContent = '连接手机键盘';
    status = doc.createElement('p');
    status.className = 'field-note';
    status.textContent = '手机未连接';
    qr = doc.createElement('img');
    qr.alt = '用手机相机扫描，连接 WebHomeTV 手机键盘';
    qr.width = 220;
    qr.height = 220;
    qr.style.background = '#fff';
    qr.style.display = 'block';
    qr.style.maxWidth = '100%';
    qr.hidden = true;
    link = doc.createElement('p');
    link.className = 'field-note';
    link.hidden = true;
    section.appendChild(pairButton);
    section.appendChild(status);
    section.appendChild(qr);
    section.appendChild(link);
    host.appendChild(section);
    pairButton.onclick = function () {
      if (token) { end(); return; }
      pairButton.disabled = true;
      call('/pair', {}, '').then(function (r) {
        session++;
        token = r.token;
        pairButton.textContent = '断开手机键盘';
        status.textContent = '请用手机相机扫码';
        qr.src = r.qr;
        qr.hidden = false;
        link.textContent = '备用：' + r.address + '　配对码：' + r.code;
        link.hidden = false;
        timer = setInterval(tick, 650);
        tick();
      }).catch(function () { status.textContent = '此入口暂未启用手机键盘'; })
        .then(function () { pairButton.disabled = false; });
    };
    doc.addEventListener('focusin', activeField);
    doc.addEventListener('focusout', function () { target = null; revision = ''; });
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) { target = null; revision = ''; } });
    root.addEventListener('pagehide', function () { end(); });
  }
  root.GGRemoteInput = {mount: mount};
})(window);
