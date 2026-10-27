(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GGNavigation = factory();
}(this, function () {
  'use strict';

  var GROUP_SELECTORS = [
    '.topbar',
    '.topnav',
    '.discovery-types',
    '.discovery-filters',
    '.discovery-grid',
    '.catalog-sites',
    '.catalog-categories',
    '.catalog-filter-groups',
    '.catalog-grid',
    '#searchArea',
    '#searchSidebar',
    '#groupGrid',
    '#resourceGrid',
    '.ref-sites',
    '.ref-site-actions',
    '.ref-form',
    '.ref-site-results'
  ];
  var LAYER_SELECTOR = '.modal[role="dialog"],.discovery-modal[role="dialog"],.ref-dialog[role="dialog"],.catalog-detail[role="dialog"]';
  var FOCUSABLE_SELECTOR = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]';

  function mount(options) {
    options = options || {};
    var doc = options.document || (typeof document !== 'undefined' ? document : null);
    if (!doc || !doc.documentElement) throw new Error('GGNavigation.mount requires a document');
    var destroyed = false, lastFocus = null, returnFocus = null, lastLayer = null, selectOpen = null;
    var tv = typeof options.isTV === 'boolean' ? options.isTV : sdkSaysTV();

    function sdkSaysTV() {
      var fm = typeof window !== 'undefined' && window.fm, device, values, i;
      if (!fm) return false;
      try { device = typeof fm.device === 'function' ? fm.device() : fm.device; } catch (e) { device = null; }
      if (device && typeof device === 'object') {
        if (device.type === 0) return true;
        if (device.type === 1) return false;
        if (device.isTV === true || device.tv === true) return true;
        values = [device.type, device.name, device.model, device.platform];
      } else values = [device, fm.deviceType, fm.deviceName, fm.platform];
      for (i = 0; i < values.length; i++) if (typeof values[i] === 'string' && /android\s*tv|androidtv|smart\s*tv|电视/i.test(values[i])) return true;
      return false;
    }

    function connected(node) {
      return !!(node && doc.documentElement.contains(node));
    }

    function visible(node) {
      var current = node, style;
      if (!connected(node)) return false;
      while (current && current.nodeType === 1) {
        if (current.hidden || current.getAttribute('aria-hidden') === 'true') return false;
        if (typeof window !== 'undefined' && window.getComputedStyle) {
          style = window.getComputedStyle(current);
          if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
        }
        current = current.parentElement;
      }
      if (node.getClientRects && node.getClientRects().length === 0) return false;
      return true;
    }

    function focusables(container) {
      var result = [], nodes, i, node;
      if (!container) return result;
      nodes = container.querySelectorAll(FOCUSABLE_SELECTOR);
      for (i = 0; i < nodes.length; i++) {
        node = nodes[i];
        if (visible(node) && !node.disabled && node.getAttribute('tabindex') !== '-1') result.push(node);
      }
      return result;
    }

    function visibleLayers() {
      var nodes = doc.querySelectorAll(LAYER_SELECTOR), result = [], i;
      for (i = 0; i < nodes.length; i++) if (visible(nodes[i])) result.push(nodes[i]);
      result.sort(compareLayers);
      return result;
    }

    function createsStackingContext(node, style) {
      var position = style.position, z = style.zIndex;
      if (node === doc.documentElement) return true;
      if ((position === 'fixed' || position === 'sticky') || (position !== 'static' && z !== 'auto')) return true;
      if (Number(style.opacity) < 1 || style.transform !== 'none' || style.filter !== 'none') return true;
      if (style.isolation === 'isolate') return true;
      return false;
    }

    function stackingPath(node) {
      var chain = [], current = node, path = [], i, style, z;
      while (current && current.nodeType === 1) { chain.unshift(current); current = current.parentElement; }
      for (i = 0; i < chain.length; i++) {
        style = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(chain[i]) : null;
        if (!style || !createsStackingContext(chain[i], style)) continue;
        z = parseInt(style.zIndex, 10);
        path.push(isNaN(z) ? 0 : z);
      }
      return path;
    }

    function compareLayers(a, b) {
      var left = stackingPath(a), right = stackingPath(b), length = Math.min(left.length, right.length), i, relation;
      for (i = 0; i < length; i++) if (left[i] !== right[i]) return left[i] - right[i];
      if (left.length !== right.length) return left.length - right.length;
      if (a === b) return 0;
      relation = a.compareDocumentPosition(b);
      return relation & 2 ? 1 : -1;
    }

    function topLayer() {
      var layers = visibleLayers();
      return layers.length ? layers[layers.length - 1] : null;
    }

    function groupFor(node, layer) {
      var group, i, current;
      if (layer) {
        if (layer.matches && layer.matches('.ref-dialog')) {
          current = node;
          while (current && current !== layer) {
            if (current.matches && current.matches('.ref-sites,.ref-site-actions,.ref-form,.ref-site-results')) return current;
            current = current.parentElement;
          }
        }
        return layer;
      }
      for (i = 0; i < GROUP_SELECTORS.length; i++) {
        group = node.closest ? node.closest(GROUP_SELECTORS[i]) : null;
        if (group && visible(group)) return group;
      }
      return node.parentElement || doc.body;
    }

    function groupSequence(layer) {
      var groups = [], i, nodes, j, found;
      if (layer) {
        if (layer.matches && layer.matches('.ref-dialog')) {
          nodes = layer.querySelectorAll('.ref-sites,.ref-site-actions,.ref-form,.ref-site-results');
          for (i = 0; i < nodes.length; i++) {
            found = focusables(nodes[i]);
            if (found.length) groups.push(nodes[i]);
          }
        } else groups.push(layer);
        return groups;
      }
      for (i = 0; i < GROUP_SELECTORS.length; i++) {
        nodes = doc.querySelectorAll(GROUP_SELECTORS[i]);
        for (j = 0; j < nodes.length; j++) {
          if (visible(nodes[j]) && focusables(nodes[j]).length && groups.indexOf(nodes[j]) < 0) groups.push(nodes[j]);
        }
      }
      groups.sort(function (a, b) {
        if (a === b) return 0;
        var relation = a.compareDocumentPosition(b);
        return relation & 2 ? 1 : -1;
      });
      groups = groups.filter(function (group) {
        var i;
        for (i = 0; i < groups.length; i++) if (groups[i] !== group && groups[i].contains(group)) return false;
        return true;
      });
      return groups;
    }

    function rect(node) {
      var r = node.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function inSameRow(a, b) {
      var x = rect(a), y = rect(b);
      return Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 1;
    }

    function horizontalNeighbor(current, items, direction) {
      var from = rect(current), best = null, score = Infinity, i, to, delta, nextScore;
      for (i = 0; i < items.length; i++) {
        if (items[i] === current || !inSameRow(current, items[i])) continue;
        to = rect(items[i]); delta = to.x - from.x;
        if ((direction < 0 && delta >= -1) || (direction > 0 && delta <= 1)) continue;
        nextScore = Math.abs(delta);
        if (nextScore < score) { score = nextScore; best = items[i]; }
      }
      return best;
    }

    function verticalNeighbor(current, items, direction) {
      var from = rect(current), best = null, rowDistance = Infinity, columnDistance = Infinity, i, to, delta, dx;
      for (i = 0; i < items.length; i++) {
        if (items[i] === current || inSameRow(current, items[i])) continue;
        to = rect(items[i]); delta = to.y - from.y;
        if ((direction < 0 && delta >= -1) || (direction > 0 && delta <= 1)) continue;
        dx = Math.abs(to.x - from.x);
        if (Math.abs(delta) < rowDistance - 1 || (Math.abs(Math.abs(delta) - rowDistance) <= 1 && dx < columnDistance)) {
          rowDistance = Math.abs(delta); columnDistance = dx; best = items[i];
        }
      }
      return best;
    }

    function focusNode(node) {
      if (!node || !visible(node)) return false;
      try { node.focus(); } catch (e) { return false; }
      if (doc.activeElement !== node) return false;
      try { node.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
      catch (e2) { try { node.scrollIntoView(false); } catch (e3) {} }
      return true;
    }

    function focusInitial(layer) {
      var target = null, node;
      if (layer) {
        node = layer.querySelector('.ref-close,.discovery-close,.catalog-detail-close,.close-button,[data-close]');
        if (node && visible(node)) target = node;
        if (!target) target = focusables(layer)[0];
      } else {
        node = doc.querySelector('.discovery-grid .discovery-card, .catalog-grid .catalog-card, #groupGrid button, #resourceGrid button, .topnav button');
        if (node && visible(node)) target = node;
        if (!target) target = focusables(doc.body)[0];
      }
      return focusNode(target);
    }

    function layerChanged(layer, active) {
      if (layer !== lastLayer) {
        if (layer && active && !layer.contains(active)) returnFocus = active;
        lastLayer = layer;
      }
    }

    function directionKey(event) {
      var key = event.key || '', code = Number(event.keyCode || event.which || 0);
      if (key === 'ArrowUp' || code === 19 || code === 38) return 'up';
      if (key === 'ArrowDown' || code === 20 || code === 40) return 'down';
      if (key === 'ArrowLeft' || code === 21 || code === 37) return 'left';
      if (key === 'ArrowRight' || code === 22 || code === 39) return 'right';
      return '';
    }

    function isBack(event) {
      var key = event.key || '', code = Number(event.keyCode || event.which || 0);
      return key === 'Escape' || key === 'BrowserBack' || key === 'GoBack' || code === 4 || code === 27;
    }

    function isEnter(event) {
      var key = event.key || '', code = Number(event.keyCode || event.which || 0);
      return key === 'Enter' || key === 'NumpadEnter' || key === 'Select' || key === ' ' || code === 23 || code === 66;
    }

    function isTextEntry(node) {
      return !!(node && (node.tagName === 'TEXTAREA' || (node.tagName === 'INPUT' && node.type !== 'checkbox' && node.type !== 'radio')));
    }

    function checkboxEnter(event) {
      var key = event.key || '', code = Number(event.keyCode || event.which || 0);
      return key === 'Enter' || key === 'NumpadEnter' || key === 'Select' || code === 23 || code === 66;
    }

    function selectKeyDown(event) {
      var node = event.target;
      if (node && node.tagName === 'SELECT' && selectOpen !== node && isEnter(event)) {
        selectOpen = node;
        return true;
      }
      return false;
    }

    function onSelectDone(event) {
      if (selectOpen && event.target === selectOpen && (event.type === 'change' || event.type === 'focusout')) selectOpen = null;
    }

    function closeControl(layer) {
      var selectors = ['.ref-close', '.discovery-close', '.catalog-detail-close', '[data-close]', '.close-button', '[aria-label*="关闭"]'], i, node;
      for (i = 0; i < selectors.length; i++) {
        node = layer.querySelector(selectors[i]);
        if (node && visible(node) && !node.disabled) return node;
      }
      return null;
    }

    function onKeyDown(event) {
      var direction, active, layer, group, sequence, groupAt, items, target, currentIndex, fallback;
      if (destroyed) return;
      direction = directionKey(event);
      layer = topLayer();
      active = doc.activeElement;
      layerChanged(layer, active);

      if (direction) {
        if (doc.body && doc.body.classList) doc.body.classList.add('gg-tv');
        tv = true;
        if (layer && (!active || !layer.contains(active))) {
          event.preventDefault();
          focusInitial(layer);
          return;
        }
        if (active && active.tagName === 'SELECT' && selectOpen === active) return;
        if (isTextEntry(active)) return;
        if (!active || active === doc.body || !visible(active)) {
          fallback = lastFocus && visible(lastFocus) ? lastFocus : null;
          if (!fallback) { focusInitial(layer); event.preventDefault(); return; }
          active = fallback;
          focusNode(active);
        }
        group = groupFor(active, layer);
        items = focusables(group);
        if (items.indexOf(active) < 0) items = focusables(layer || doc.body);
        if (direction === 'left') target = horizontalNeighbor(active, items, -1);
        else if (direction === 'right') target = horizontalNeighbor(active, items, 1);
        else target = verticalNeighbor(active, items, direction === 'up' ? -1 : 1);
        if (!target && (direction === 'up' || direction === 'down')) {
          sequence = groupSequence(layer);
          groupAt = sequence.indexOf(group);
          if (groupAt < 0 && layer) groupAt = 0;
          if (groupAt >= 0) {
            currentIndex = groupAt + (direction === 'up' ? -1 : 1);
            if (currentIndex >= 0 && currentIndex < sequence.length) {
              fallback = focusables(sequence[currentIndex]);
              if (fallback.length) {
                var from = rect(active), bestScore = Infinity, i, r, score;
                for (i = 0; i < fallback.length; i++) {
                  r = rect(fallback[i]); score = Math.abs(r.x - from.x) * 1000 + Math.abs(r.y - from.y);
                  if (score < bestScore) { bestScore = score; target = fallback[i]; }
                }
              }
            }
          }
        }
        if (target && target !== active) focusNode(target);
        event.preventDefault();
        return;
      }

      if (isBack(event)) {
        if (selectOpen && active === selectOpen) {
          selectOpen = null;
          if (event.stopImmediatePropagation) event.stopImmediatePropagation();
          else event.stopPropagation();
          return;
        }
        if (layer) {
          var close = closeControl(layer);
          event.preventDefault();
          if (event.stopImmediatePropagation) event.stopImmediatePropagation();
          else event.stopPropagation();
          if (close) {
            close.click();
            if (!visible(layer)) {
              var remaining = topLayer();
              if (remaining && (!doc.activeElement || !visible(doc.activeElement) || !remaining.contains(doc.activeElement))) focusInitial(remaining);
              else if (!remaining && returnFocus && visible(returnFocus)) focusNode(returnFocus);
            }
          }
        } else if (isTextEntry(active) || (active && active.tagName === 'SELECT')) {
          event.preventDefault();
          if (event.stopImmediatePropagation) event.stopImmediatePropagation();
          else event.stopPropagation();
        } else if (typeof options.onBack === 'function') {
          event.preventDefault();
          options.onBack(event);
        }
        return;
      }

      if (selectKeyDown(event)) return;

      if (isEnter(event) && layer && (!active || !layer.contains(active))) {
        event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        else event.stopPropagation();
        focusInitial(layer);
        return;
      }

      if (active && active.tagName === 'INPUT' && active.type === 'checkbox' && checkboxEnter(event) && visible(active)) {
        event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        else event.stopPropagation();
        active.click();
        return;
      }

      if (isEnter(event) && !isTextEntry(active) && active && active.tagName === 'BUTTON' && visible(active)) {
        event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        else event.stopPropagation();
        active.click();
      }
    }

    function onFocusIn(event) {
      var node = event.target;
      if (!destroyed && node && node !== doc.body && visible(node)) lastFocus = node;
    }

    if (tv && doc.body && doc.body.classList) doc.body.classList.add('gg-tv');
    doc.addEventListener('keydown', onKeyDown, true);
    doc.addEventListener('focusin', onFocusIn, true);
    doc.addEventListener('change', onSelectDone, true);
    doc.addEventListener('focusout', onSelectDone, true);

    return {
      setTV: function (value) {
        tv = !!value;
        if (doc.body && doc.body.classList) doc.body.classList.toggle('gg-tv', tv);
        return tv;
      },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        doc.removeEventListener('keydown', onKeyDown, true);
        doc.removeEventListener('focusin', onFocusIn, true);
        doc.removeEventListener('change', onSelectDone, true);
        doc.removeEventListener('focusout', onSelectDone, true);
        if (doc.body && doc.body.classList) doc.body.classList.remove('gg-tv');
      },
      inspect: function () {
        var layer = topLayer(), active = doc.activeElement;
        return { tv: tv, active: active && active.id || '', layer: layer && (layer.id || layer.className) || '', focusableCount: focusables(layer || doc.body).length };
      }
    };
  }

  return { mount: mount };
}));
