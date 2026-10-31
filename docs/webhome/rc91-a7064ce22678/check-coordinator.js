(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GGCheckCoordinator = factory();
}(this, function () {
  'use strict';

  var STATES = { ok: true, bad: true, locked: true, unsupported: true, uncertain: true, rate_limited: true };

  function asTime(value) {
    if (typeof value === 'number' && isFinite(value)) return value < 1000000000000 ? value * 1000 : value;
    if (typeof value === 'string') { var parsed = Date.parse(value); return isFinite(parsed) ? parsed : 0; }
    return 0;
  }

  function identify(item) {
    var raw = item && typeof item.url === 'string' ? item.url.replace(/^\s+|\s+$/g, '') : '';
    if (!raw) return null;
    var url = raw, extracted = '', canonical = '';
    try {
      if (typeof URL === 'function') {
        var parsed = new URL(raw);
        extracted = parsed.searchParams.get('pwd') || parsed.searchParams.get('password') || '';
        parsed.hash = '';
        parsed.searchParams.delete('pwd');
        parsed.searchParams.delete('password');
        canonical = parsed.href;
      }
    } catch (ignore) {}
    if (!canonical) {
      var hash = url.indexOf('#');
      if (hash >= 0) url = url.slice(0, hash);
      canonical = url.replace(/([?&])(pwd|password)=[^&]*/ig, '$1').replace(/[?&]+$/, '');
      var match = /(?:[?&])(pwd|password)=([^&]*)/i.exec(raw);
      if (match) { try { extracted = decodeURIComponent(match[2].replace(/\+/g, ' ')); } catch (ignore2) { extracted = match[2]; } }
    }
    var explicit = item && item.password !== null && typeof item.password !== 'undefined' ? String(item.password) : '';
    var password = explicit || extracted;
    return { key: encodeURIComponent(canonical) + '|' + encodeURIComponent(password)+'|mode:'+encodeURIComponent(item&&item._checkMode||''), password: password };
  }

  function usableCache(value, now) {
    if (!value || typeof value !== 'object') return null;
    var state = String(value.state || '').toLowerCase();
    var checked = asTime(value.checked), expires = asTime(value.expires);
    if (!STATES[state] || state === 'uncertain' || state === 'rate_limited') return null;
    if (!checked || !expires || checked > now + 60000 || expires <= now || expires <= checked) return null;
    return state;
  }

  function resultState(value) {
    var state = String(value || 'unknown').toLowerCase();
    return STATES[state] ? state : 'unknown';
  }

  function create(options) {
    options = options || {};
    if (typeof options.checkBatch !== 'function') throw new TypeError('checkBatch must be a function');
    var checkBatch = options.checkBatch;
    var cached = typeof options.cached === 'function' ? options.cached : function () { return null; };
    var eligible = typeof options.eligible === 'function' ? options.eligible : function(){return true;};
    var requestedLimit = Number(options.maxConcurrent);
    var maxConcurrent = isFinite(requestedLimit) && requestedLimit > 0 ? Math.max(1,Math.min(2, Math.floor(requestedLimit))) : 2;
    var requestedMax = Number(options.maxBatch);
    var maxBatch = isFinite(requestedMax) && requestedMax > 0 ? Math.max(1,Math.min(40, Math.floor(requestedMax))) : 40;
    var requestedSize = Number(options.batchSize);
    var batchSize = isFinite(requestedSize) && requestedSize > 0 ? Math.max(1,Math.min(maxBatch, Math.floor(requestedSize))) : Math.min(20, maxBatch);
    var inflight = Object.create(null), queue = [], active = 0, epoch=0, paused=false;
    var cacheHits=0;var completed = 0, totalTimeMs = 0, lastDurationMs = 0;

    function stats() {
      return {cacheHits:cacheHits, pending: queue.length, active: active, completed: completed, lastDurationMs: lastDurationMs, totalTimeMs: totalTimeMs };
    }

    function finishBatch(batch, states, started) {
      var ended = Date.now(), elapsed = Math.max(0, ended - started), i, entry, state;
      active--;
      lastDurationMs = elapsed;
      totalTimeMs += elapsed;
      for (i = 0; i < batch.length; i++) {
        entry = batch[i];
        state = resultState(states && states[i]);
        if (inflight[entry.key] === entry) delete inflight[entry.key];
        completed++;
        entry.resolve(state);
      }
      pump();
    }

    function pump() {
      while (!paused && active < maxConcurrent && queue.length) {
        var batch = queue.splice(0, Math.min(batchSize, queue.length));
        batch=batch.filter(function(entry){if(eligible(entry.item))return true;if(inflight[entry.key]===entry)delete inflight[entry.key];if(options.onSkip)options.onSkip(entry.item);entry.resolve('unknown');return false;});if(!batch.length)continue;
        var items = batch.map(function (entry) { return entry.item; });
        var started = Date.now();
        active++;
        (function (current, requestItems, startTime, currentEpoch) {
          var request;
          try { request = Promise.resolve(checkBatch(requestItems, function(){return currentEpoch===epoch&&!paused;})); }
          catch (error) { request = Promise.reject(error); }
          request.then(function (states) {
            if(currentEpoch===epoch)finishBatch(current, Array.isArray(states) ? states : [], startTime);
          }, function () {
            if(currentEpoch===epoch)finishBatch(current, [], startTime);
          });
        }(batch, items, started, epoch));
      }
    }

    function check(items, config) {
      items = Array.isArray(items) ? items : [];
      config = config || {};
      var now = Date.now(), entries = [], fresh = [], i, item, identity, hit, entry;
      for (i = 0; i < items.length; i++) {
        item = items[i];
        identity = identify(item);
        if (!identity) { entries.push(Promise.resolve('unknown')); continue; }
        entry = inflight[identity.key];
        if (entry) {if(config.priority===true){var queuedIndex=queue.indexOf(entry);if(queuedIndex>=0){queue.splice(queuedIndex,1);queue.unshift(entry);}} entries.push(entry.promise); continue; }
        try { hit = usableCache(cached(item), now); } catch (ignore) { hit = null; }
        if (hit) {cacheHits++; entries.push(Promise.resolve(hit)); continue; }
        entry = { key: identity.key, item: item, resolve: null, promise: null };
        entry.promise = new Promise(function (resolve) { entry.resolve = resolve; });
        inflight[identity.key] = entry;
        entries.push(entry.promise);
        fresh.push(entry);
      }
      if (fresh.length) {
        if (config.priority === true) queue = fresh.concat(queue);
        else queue = queue.concat(fresh);
        pump();
      }
      return Promise.all(entries);
    }

    function prioritize(items){var picked=[];(items||[]).forEach(function(item){var found=identify(item);if(!found)return;var prefix=found.key.split('|mode:')[0]+'|mode:';for(var i=queue.length-1;i>=0;i--)if(queue[i].key.indexOf(prefix)===0)picked.unshift(queue.splice(i,1)[0]);});if(picked.length)queue=picked.concat(queue);}
    function cancel(){epoch++;queue.forEach(function(entry){entry.resolve('unknown');});queue=[];Object.keys(inflight).forEach(function(key){inflight[key].resolve('unknown');});inflight=Object.create(null);active=0;}
    function pause(){paused=true;cancel();} function resume(){paused=false;pump();}
    return { check: check, prioritize:prioritize, stats: stats, cancel:cancel, pause:pause, resume:resume };
  }

  return { create: create };
}));
