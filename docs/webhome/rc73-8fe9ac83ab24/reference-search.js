(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GGReferenceSearch = factory();
}(this, function () {
  'use strict';
  var STORE = 'gg-reference-search-sites-v1';
  var DEFAULT_SITES = ['wanou', 'muou', 'huajuan', 'duoduo'];

  function mount(options) {
    options = options || {};
    var doc = options.container.ownerDocument;
    var win = doc.defaultView || window;
    var providers = options.providers;
    var defs = providers.definitions || [];
    var keys = defs.map(function (d) { return d.key; });
    var selected;
    try { selected = JSON.parse(win.localStorage.getItem(STORE) || 'null'); } catch (e) { selected = null; }
    if (!Array.isArray(selected)) selected = DEFAULT_SITES.filter(function (k) { return keys.indexOf(k) >= 0; });
    selected = selected.filter(function (k) { return keys.indexOf(k) >= 0; });
    var generation = 0, dead = false, detailGeneration = 0, detailOpener = null, lastQuery='';
    var resultsByKey = {};
    var crossSiteSeen = {};
    var rootEl = doc.createElement('section');
    rootEl.className = 'ref-root';
    rootEl.innerHTML = '<div class="ref-sites" aria-label="选择资源站"></div><div class="ref-site-actions"><button type="button" class="ref-select-all">全选</button><button type="button" class="ref-select-none">清空</button><small>资源站选择保存在本机浏览器；更改后点击搜索生效</small></div><form class="ref-form"><input class="ref-query" type="search" placeholder="搜索资源站" aria-label="搜索资源站"><button>搜索</button></form><div class="ref-status" aria-live="polite"></div><div class="ref-results"></div><div class="ref-dialog" role="dialog" aria-modal="true" aria-label="资源站影片详情" hidden></div>';
    options.container.appendChild(rootEl);
    var siteBox = rootEl.querySelector('.ref-sites'), form = rootEl.querySelector('.ref-form');
    var input = rootEl.querySelector('.ref-query'), status = rootEl.querySelector('.ref-status');
    var results = rootEl.querySelector('.ref-results'), dialog = rootEl.querySelector('.ref-dialog');
    if (options.hideForm) form.hidden = true;
    if (options.hideSites) { siteBox.style.display = 'none'; var siteActions = rootEl.querySelector('.ref-site-actions'); if (siteActions) siteActions.style.display = 'none'; }
    function el(tag, cls, text) { var n = doc.createElement(tag); n.className = cls || ''; if (text) n.textContent = text; return n; }
    function persist() { try { win.localStorage.setItem(STORE, JSON.stringify(selected)); } catch (e) {} }
    function renderSites() {
      siteBox.textContent = '';
      defs.forEach(function (d) {
        var label = el('label', 'ref-site-option'), check = doc.createElement('input');
        check.type = 'checkbox'; check.value = d.key; check.checked = selected.indexOf(d.key) >= 0;
        check.onchange = function () { selected = Array.prototype.filter.call(siteBox.querySelectorAll('input:checked'), function (x) { return x.checked; }).map(function (x) { return x.value; }); persist(); };
        label.appendChild(check); label.appendChild(doc.createTextNode(d.name)); siteBox.appendChild(label);
      });
    }
    renderSites();
    rootEl.querySelector('.ref-select-all').onclick = function () { selected = keys.slice(); persist(); renderSites(); };
    rootEl.querySelector('.ref-select-none').onclick = function () { selected = []; persist(); renderSites(); };
    var rerun=el('button','ref-rerun','按所选站点重新搜索');rerun.type='button';rerun.onclick=function(){search(lastQuery||input.value);};rootEl.querySelector('.ref-site-actions').appendChild(rerun);
    function proxiedImage(url) { return options.imageSource ? options.imageSource(url) : url; }
    function addImage(parent, url) {
      var image = doc.createElement('img'); image.src = proxiedImage(url); image.alt = ''; image.onerror = function () { image.remove(); var missing = el('span', 'ref-image-missing', '暂无图片'); parent.insertBefore(missing, parent.firstChild); };
      parent.insertBefore(image, parent.firstChild); return image;
    }
    function closeDetail() {
      detailGeneration++; dialog.hidden = true; dialog.textContent = '';
      if (detailOpener && doc.documentElement.contains(detailOpener)) detailOpener.focus();
      detailOpener = null;
    }
    function focusables() { return Array.prototype.slice.call(dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])')); }
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDetail(); return; }
      if (e.key !== 'Tab') return;
      var list = focusables(); if (!list.length) { e.preventDefault(); return; }
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey && (doc.activeElement === first || !dialog.contains(doc.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (doc.activeElement === last || !dialog.contains(doc.activeElement))) { e.preventDefault(); first.focus(); }
    }, true);
    function detail(row, site) {
      detailGeneration++; var dg = detailGeneration; detailOpener = doc.activeElement;
      dialog.hidden = false; dialog.textContent = '';
      var close = el('button', 'ref-close', '关闭'); close.type = 'button'; close.onclick = closeDetail; dialog.appendChild(close);
      if (row.image) addImage(dialog, row.image);
      dialog.appendChild(el('h2', 'ref-detail-title', row.title || '未命名'));
      var msg = el('p', 'ref-detail-loading', '正在加载详情…'); dialog.appendChild(msg); close.focus();
      return Promise.resolve().then(function () { return providers.detail(site.key, row.url, options.request); }).then(function (data) {
        if (dead || dg !== detailGeneration) return;
        dialog.textContent = ''; dialog.appendChild(close); close.focus();
        if (row.image) addImage(dialog, row.image);
        else if (data.image) addImage(dialog, data.image);
        dialog.appendChild(el('h2', 'ref-detail-title', data.title || row.title || '未命名'));
        dialog.appendChild(el('p', 'ref-description', data.description || '暂无简介'));
        (data.shares || []).forEach(function (share) {
          if (options.shareFilter && !options.shareFilter(share)) return;
          var button = el('button', 'ref-share', ''); button.type = 'button';
          button.appendChild(doc.createTextNode((share.type || '网盘') + '：' + share.url));
          button.onclick = function () { if (!options.preserveDialogOnShare) closeDetail(); if (options.onShare) options.onShare(share, row, data); };
          dialog.appendChild(button);
        });
        var native = el('button', 'ref-native-search', '在全部订阅源中搜索'); native.type = 'button';
        native.onclick = function () { if (options.onNativeSearch) options.onNativeSearch(data.title || row.title); };
        dialog.appendChild(native);
      }).catch(function (error) { if (!dead && dg === detailGeneration) msg.textContent = error.message || '详情加载失败'; });
    }
    function normalizeTitle(title) { return String(title || '').toLowerCase().replace(/[\s.,!?:;，。！？：；、（）()【】\[\]{}《》“”‘’'"_\-—·]/g, ''); }
    function titleMatches(query, title) {
      var wanted = normalizeTitle(query).replace(/(?:19|20)\d{2}/g, ''), candidate = normalizeTitle(title).replace(/(?:19|20)\d{2}/g, '');
      return !!wanted && (candidate === wanted || candidate.indexOf(wanted) === 0);
    }
    function conflictsWithExpectedYear(title) {
      var expected = String(options.expectedYear || '').match(/(?:19|20)\d{2}/), actual = String(title || '').match(/(?:19|20)\d{2}/);
      return !!(expected && actual && expected[0] !== actual[0]);
    }
    function renderAutoResolve(state, row, card, data, error, g) {
      if (g !== generation || dead || !card.parentNode) return;
      var box = el('div', error || !data || !data.shares || !data.shares.length ? 'ref-auto-resolved ref-auto-resolve-failed' : 'ref-auto-resolved');
      if (error || !data || !data.shares || !data.shares.length) {
        box.appendChild(el('span', '', options.directSharesOnly ? (error ? '该站资源暂时无法读取。' : '该站暂无可直接选择的网盘资源。') : (error ? '自动获取详情失败，可打开站点详情手动查看。' : '暂无可选网盘，可打开站点详情查看。')));
        if (!options.directSharesOnly) { var open = el('button', 'ref-auto-open-detail', '打开站点详情'); open.type = 'button'; open.onclick = function () { detail(row, state.site); }; box.appendChild(open); }
      } else {
        box.appendChild(el('span', 'ref-auto-resolve-label', '可选网盘（选择后交给播放器处理）'));
        var visibleShares = 0;
        data.shares.forEach(function (share) {
          if (options.shareFilter && !options.shareFilter(share)) return;
          if (options.directSharesOnly && share.url && state.directShareSeen[share.url]) return;
          if (options.directSharesOnly && share.url) state.directShareSeen[share.url] = true;
          var button = el('button', 'ref-auto-share', ''); button.type = 'button';
          var displayTitle = share.title || share.name || share.note || row.title || share.url || '分享链接';
          button.appendChild(el('span', 'ref-auto-share-label', (share.type || '网盘') + '：' + displayTitle));
          if (win.GGCore && typeof win.GGCore.qualityBadges === 'function') {
            win.GGCore.qualityBadges(displayTitle).forEach(function (badge) {
              button.appendChild(el('span', 'gg-quality-badge', badge));
            });
          }
          if (share.url && displayTitle.indexOf(share.url) < 0) {
            button.appendChild(el('span', 'discovery-resource-url', share.url));
          }
          button.__ggShare = share;
          button.onclick = function () { if (options.onShare) options.onShare(share, row, data); };
          box.appendChild(button); visibleShares++;
        });
        if (!visibleShares) { box.textContent = options.directSharesOnly ? '该站没有新增的已选网盘资源。' : '暂无符合网盘设置的资源。'; box.className += ' ref-auto-resolve-failed'; }
      }
      state.list.insertBefore(box, card);
    }
    function autoResolve(state, row, card, query, g) {
      if (!options.autoResolve || (!options.directSharesOnly && state.autoResolveTried) || !titleMatches(query, row.title) || conflictsWithExpectedYear(row.title)) return;
      state.autoResolveTried = true;
      function resolveOne(item) { return Promise.resolve().then(function () { return providers.detail(state.site.key, item.row.url, options.request); }).then(function (data) { renderAutoResolve(state, item.row, item.card, data, null, g); }, function (error) { renderAutoResolve(state, item.row, item.card, null, error, g); }); }
      if (!options.directSharesOnly) { resolveOne({row:row,card:card}); return; }
      state.directQueue.push({row:row,card:card});
      function pump() {
        while (!dead && g === generation && state.directActive < 2 && state.directQueue.length) {
          (function (item) { state.directActive++; resolveOne(item).then(function () { state.directActive--; pump(); }, function () { state.directActive--; pump(); }); }(state.directQueue.shift()));
        }
        if ((dead || g !== generation) && state.directQueue.length) state.directQueue.length = 0;
        if (!state.directActive && !state.directQueue.length) state.directWaiters.splice(0).forEach(function (finish) { finish(); });
      }
      pump();
    }
    function rank(items, query) {
      var yearMatch = String(query).match(/\b(?:19|20)\d{2}\b/), queryYear = yearMatch && yearMatch[0];
      var nq = normalizeTitle(query).replace(/(?:19|20)\d{2}/g, '');
      return items.sort(function (a, b) {
        var aa = normalizeTitle(a.title), bb = normalizeTitle(b.title);
        var ay = String(a.year || ((String(a.title || '').match(/\b(?:19|20)\d{2}\b/) || [])[0]) || ''), by = String(b.year || ((String(b.title || '').match(/\b(?:19|20)\d{2}\b/) || [])[0]) || '');
        var as = aa.replace(/(?:19|20)\d{2}/g, '') === nq ? 0 : aa.replace(/(?:19|20)\d{2}/g, '').indexOf(nq) === 0 ? 1 : 2;
        var bs = bb.replace(/(?:19|20)\d{2}/g, '') === nq ? 0 : bb.replace(/(?:19|20)\d{2}/g, '').indexOf(nq) === 0 ? 1 : 2;
        if (queryYear) { as += ay === queryYear ? -3 : 3; bs += by === queryYear ? -3 : 3; }
        return as - bs || String(a.title || '').localeCompare(String(b.title || ''));
      });
    }
    function search(query, siteKeys) {
      var g = ++generation, q = String(query || '').trim();lastQuery=q;
      var chosen = (siteKeys || selected).filter(function (k) { return keys.indexOf(k) >= 0; });
      results.textContent = ''; dialog.hidden = true; resultsByKey = {}; crossSiteSeen = {};
      if (!q || !chosen.length) { status.textContent = !q ? '请输入关键词' : '请选择至少一个资源站'; return Promise.resolve({ items: [], errors: [] }); }
      status.textContent = '';
      var allItems = [], errors = [], cursor = 0;
      chosen.forEach(function (key) {
        var site = defs.filter(function (d) { return d.key === key; })[0];
        var section = el('section', 'ref-site-state'), label = el('h3', '', site.name + '：加载中…'), list = el('div', 'ref-site-results');
        var more = el('button', 'ref-more', '加载更多'); more.type = 'button'; more.hidden = true; section.appendChild(label); section.appendChild(list); section.appendChild(more); results.appendChild(section);
        resultsByKey[key] = { site: site, label: label, list: list, more: more, seen: {}, page: 0, done: false, error: null, busy: false, initial: true, autoResolveTried: false, directQueue: [], directActive: 0, directWaiters: [], directShareSeen: Object.create(null) };
        more.onclick = function () { pageFor(key, false); };
      });
      function renderRows(state, rows, key) {
        rank(rows, q).forEach(function (row) {
          var identity = row.url || [row.title, row.year || '', row.image || ''].join('|');
          if (row.url && win.GGCore && typeof win.GGCore.dedupKey === 'function') identity = win.GGCore.dedupKey(row.url);
          if (state.seen[identity]) return;
          if (row.url && crossSiteSeen[identity]) return;
          state.seen[identity] = true;
          if (row.url) crossSiteSeen[identity] = true;
          row.siteKey = key; allItems.push(row);
          var card = el('button', 'ref-card'); card.type = 'button';
          var poster=el('span','ref-poster');if(row.image&&!options.directSharesOnly)addImage(poster,row.image);else poster.appendChild(el('span','ref-image-missing','暂无海报'));card.appendChild(poster);
          var copy=el('div','gg-poster-copy');card.appendChild(copy);copy.appendChild(el('span', 'ref-card-title', row.title || '未命名'));
          if (win.GGCore && typeof win.GGCore.qualityBadges === 'function') {
            var badgeBox=el('span','ref-card-badges');poster.appendChild(badgeBox);
            win.GGCore.qualityBadges(row.title || '').forEach(function (badge) {
              badgeBox.appendChild(el('span', 'gg-quality-badge', badge));
            });
          }
          copy.appendChild(el('small', '', state.site.name));
          if (options.directSharesOnly) card.style.display = 'none';
          card.onclick = function () { detail(row, state.site); }; state.list.appendChild(card);
          autoResolve(state, row, card, q, g);
        });
      }
      function pageFor(key, initial) {
        var state = resultsByKey[key];
        if (g !== generation || dead || state.busy || state.done) return Promise.resolve();
        state.busy = true; state.more.disabled = true; state.more.textContent = state.page ? '正在加载…' : '正在搜索…';
        var nextPage = state.page + 1;
        var deadline=Date.now()+22000;
        function boundedRequest(url,opts){var left=deadline-Date.now();if(g!==generation||dead)return Promise.reject(new Error('搜索已取消'));if(left<=0)return Promise.reject(new Error('该站搜索超时，可单独重试'));opts=opts||{};opts.timeout=Math.max(1,Math.ceil(left/1000));return options.request(url,opts);}
        return Promise.resolve().then(function () { return providers.search(key, q, nextPage, boundedRequest); }).then(function (response) {
          if (g !== generation || dead) return;
          var items = response && response.items || []; state.page = nextPage;
          var before = Object.keys(state.seen).length; renderRows(state, items, key); var added = Object.keys(state.seen).length - before;
          if (!items.length || (items.length && !added)) {
            state.done = true; state.more.hidden = true;
            state.label.textContent = state.site.name + (before ? '：没有新增结果，已停止（共 ' + before + ' 条）' : '：没有结果'); return;
          }
          state.done = response && response.hasMore === false;
          state.label.textContent = state.site.name + '：找到 ' + Object.keys(state.seen).length + ' 条';
          state.more.hidden = state.done; state.more.textContent = '加载更多';
        }).catch(function (error) {
          if (g !== generation || dead) return;
          state.error = error; errors.push({ siteKey: key, error: error }); state.label.textContent = state.site.name + '：加载失败（' + (error.message || '网络错误') + '）';
          state.more.hidden = false; state.more.textContent = '重试';
        }).then(function () { state.busy = false; state.more.disabled = false; if (!state.done) { state.more.hidden = false; if (!state.page) state.more.textContent = '重试'; } });
      }
      function worker() { if (g !== generation || dead || cursor >= chosen.length) return Promise.resolve(); var key = chosen[cursor++]; return pageFor(key, true).then(function () { if (g !== generation || dead) return; return worker(); }); }
      var jobs = []; for (var i = 0; i < Math.min(3, chosen.length); i++) jobs.push(worker());
      var searchStates = chosen.map(function (key) { return resultsByKey[key]; });
      function summary() { return { items: rank(allItems, q), errors: errors, keyword: q }; }
      return Promise.all(jobs).then(function () {
        if (!options.directSharesOnly || dead || g !== generation) return summary();
        return Promise.all(searchStates.map(function (state) { return state.directActive || state.directQueue.length ? new Promise(function (finish) { state.directWaiters.push(finish); }) : Promise.resolve(); })).then(summary);
      });
    }
    form.onsubmit = function (event) { event.preventDefault(); search(input.value); };
    return { search: search, show: function () { rootEl.hidden = false; }, hide: function () { rootEl.hidden = true; }, destroy: function () { dead = true; generation++; detailGeneration++; if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl); } };
  }
  return { mount: mount, searchAll: function (options, query, keys) { var controller = mount(options); return controller.search(query, keys).then(function (summary) { controller.destroy(); return summary; }); } };
}));
