(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GGOverlayHistory = factory();
}(this, function () {
  'use strict';

  var SELECTOR = '.modal[role="dialog"],.discovery-modal,.ref-dialog,.catalog-detail';
  var CLOSE_SELECTORS = {
    modal: '[data-close]',
    discovery: '.discovery-close',
    ref: '.ref-close',
    catalog: '.catalog-detail-close'
  };

  function mount(options) {
    options = options || {};
    var doc = options.document || (typeof document !== 'undefined' ? document : null);
    var win = doc && doc.defaultView;
    if (!doc || !win || !win.history || !win.history.pushState) throw new Error('GGOverlayHistory.mount requires browser history');

    var history = win.history, origin = win.location.protocol + '//' + win.location.host;
    var token = 'ggo-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000000000);
    var destroyed = false, observer = null, scanTimer = null, trackedDepth = 0, layers = [], processingPop = false;

    function sameOrigin() {
      return win.location.protocol + '//' + win.location.host === origin;
    }

    function cleanUrl(value) {
      var hashAt = value.indexOf('#'), hash = hashAt < 0 ? '' : value.slice(hashAt), base = hashAt < 0 ? value : value.slice(0, hashAt);
      var queryAt = base.indexOf('?'), path = queryAt < 0 ? base : base.slice(0, queryAt), query = queryAt < 0 ? '' : base.slice(queryAt + 1);
      var parts = query ? query.split('&') : [], kept = [], i, key;
      for (i = 0; i < parts.length; i++) {
        key = parts[i].split('=')[0];
        if (key !== 'gg_overlay') kept.push(parts[i]);
      }
      return path + (kept.length ? '?' + kept.join('&') : '') + hash;
    }

    function urlAtDepth(depth) {
      var value = cleanUrl(win.location.href);
      if (!depth) return value;
      var hashAt = value.indexOf('#'), hash = hashAt < 0 ? '' : value.slice(hashAt), base = hashAt < 0 ? value : value.slice(0, hashAt);
      return base + (base.indexOf('?') < 0 ? '?' : '&') + 'gg_overlay=' + depth + hash;
    }

    function stateFor(depth) {
      var state = history.state, copy = {}, key;
      if (state && typeof state === 'object') for (key in state) if (Object.prototype.hasOwnProperty.call(state, key)) copy[key] = state[key];
      copy.ggOverlayHistoryOwner = token;
      copy.ggOverlayHistoryDepth = depth;
      return copy;
    }

    function visible(node) {
      var current = node, style;
      if (!doc.documentElement.contains(node)) return false;
      while (current && current.nodeType === 1) {
        if (current.hidden || current.getAttribute('aria-hidden') === 'true') return false;
        style = win.getComputedStyle ? win.getComputedStyle(current) : null;
        if (style && (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse')) return false;
        current = current.parentElement;
      }
      return !node.getClientRects || node.getClientRects().length > 0;
    }

    function createsStackingContext(node, style) {
      var position = style.position, z = style.zIndex;
      if (node === doc.documentElement) return true;
      if (position === 'fixed' || position === 'sticky' || (position !== 'static' && z !== 'auto')) return true;
      if (parseFloat(style.opacity) < 1 || style.transform !== 'none' || style.filter !== 'none') return true;
      if (style.isolation === 'isolate') return true;
      return false;
    }

    function stackingPath(node) {
      var chain = [], current = node, result = [], i, style, z;
      while (current && current.nodeType === 1) { chain.unshift(current); current = current.parentElement; }
      for (i = 0; i < chain.length; i++) {
        style = win.getComputedStyle ? win.getComputedStyle(chain[i]) : null;
        if (!style || !createsStackingContext(chain[i], style)) continue;
        z = parseInt(style.zIndex, 10);
        result.push(isNaN(z) ? 0 : z);
      }
      return result;
    }

    function compareLayers(a, b) {
      var left = stackingPath(a), right = stackingPath(b), length = Math.min(left.length, right.length), i, relation;
      for (i = 0; i < length; i++) if (left[i] !== right[i]) return left[i] - right[i];
      if (left.length !== right.length) return left.length - right.length;
      if (a === b) return 0;
      relation = a.compareDocumentPosition(b);
      return relation & 2 ? 1 : -1;
    }

    function visibleLayers() {
      var nodes = doc.querySelectorAll(SELECTOR), result = [], i;
      for (i = 0; i < nodes.length; i++) if (visible(nodes[i])) result.push(nodes[i]);
      result.sort(compareLayers);
      return result;
    }

    function closeButton(layer) {
      var selector = layer.matches && layer.matches('.modal') ? CLOSE_SELECTORS.modal :
        layer.matches && layer.matches('.discovery-modal') ? CLOSE_SELECTORS.discovery :
        layer.matches && layer.matches('.ref-dialog') ? CLOSE_SELECTORS.ref : CLOSE_SELECTORS.catalog;
      return layer.querySelector(selector);
    }

    function closeToDepth(depth) {
      var current = visibleLayers(), button, guard = current.length + 1;
      while (current.length > depth && guard-- > 0) {
        button = closeButton(current[current.length - 1]);
        if (!button) break;
        button.click();
        current = visibleLayers();
      }
      layers = current;
      trackedDepth = current.length;
    }

    function onPopState(event) {
      var state, target;
      if (destroyed || !sameOrigin()) return;
      state = event && event.state;
      target = state && state.ggOverlayHistoryOwner === token ? parseInt(state.ggOverlayHistoryDepth, 10) : 0;
      if (isNaN(target) || target < 0) target = 0;
      processingPop = true;
      closeToDepth(target);
      processingPop = false;
    }

    function scan() {
      var current, depth;
      if (destroyed || !sameOrigin()) return;
      current = visibleLayers();
      if (processingPop) { layers = current; return; }
      if (current.length > trackedDepth) {
        for (depth = trackedDepth + 1; depth <= current.length; depth++) {
          history.pushState(stateFor(depth), '', urlAtDepth(depth));
        }
        trackedDepth = current.length;
      } else if (current.length < trackedDepth) {
        depth = trackedDepth - current.length;
        layers = current;
        history.go(-depth);
        return;
      } else {
        var changed = false, i;
        for (i = 0; i < current.length; i++) if (current[i] !== layers[i]) { changed = true; break; }
        if (changed && current.length) history.replaceState(stateFor(current.length), '', urlAtDepth(current.length));
      }
      layers = current;
    }

    function scheduleScan() {
      if (destroyed || scanTimer !== null) return;
      scanTimer = win.setTimeout(function () { scanTimer = null; scan(); }, 0);
    }

    function clearOwnMarker() {
      if (!sameOrigin()) return;
      try { history.replaceState(stateFor(0), '', cleanUrl(win.location.href)); } catch (e) { /* Keep the page usable if history is unavailable. */ }
    }

    clearOwnMarker();
    layers = visibleLayers();
    trackedDepth = 0;
    win.addEventListener('popstate', onPopState, false);
    if (win.MutationObserver) {
      observer = new win.MutationObserver(scheduleScan);
      observer.observe(doc.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'aria-hidden', 'style', 'class'] });
    }

    return {
      inspect: function () { return { depth: trackedDepth, visible: visibleLayers().length, url: win.location.href }; },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        win.removeEventListener('popstate', onPopState, false);
        if (observer) observer.disconnect();
        if (scanTimer !== null) win.clearTimeout(scanTimer);
        scanTimer = null;
      }
    };
  }

  return { mount: mount };
}));
