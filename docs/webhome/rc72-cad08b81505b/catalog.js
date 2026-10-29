(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GGCatalog = factory();
}(this, function () {
  'use strict';

  function text(node, value) { node.textContent = value == null ? '' : String(value); return node; }
  function el(doc, tag, cls, value) {
    var node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (typeof value !== 'undefined') text(node, value);
    return node;
  }
  function safeId(site, row, index) {
    var value = row && (row.id || row.url);
    return String(value || site + '|item|' + index);
  }
  function hasValue(value) { return value !== null && typeof value !== 'undefined' && String(value).replace(/^\s+|\s+$/g,'') !== ''; }
  function imageSource(url) {
    if (!url) return '';
    var fm = typeof window !== 'undefined' && window.fm;
    if (fm && typeof fm.res === 'function') {
      try { var proxied = fm.res(url, {headers:{}}); if (typeof proxied === 'string' && proxied) return proxied; } catch (e) {}
    }
    return /^https?:\/\//i.test(String(url)) ? String(url) : '';
  }

  function mount(options) {
    options = options || {};
    var container = options.container, request = options.request;
    if (!container || !container.ownerDocument) throw new Error('GGCatalog.mount requires a container element');
    if (typeof request !== 'function') throw new Error('GGCatalog.mount requires request(url, opts)');
    var doc = container.ownerDocument, providers = (typeof window !== 'undefined' && window.GGProviders) || null;
    if (!providers && typeof globalThis !== 'undefined') providers = globalThis.GGProviders || null;
    if (!providers || !Array.isArray(providers.definitions) || typeof providers.list !== 'function' || typeof providers.detail !== 'function') {
      throw new Error('GGProviders definitions/list/detail are required');
    }
    var definitions = providers.definitions.filter(function (d) { return d && d.key && d.name; });
    var savedSite = '';
    try { savedSite = typeof localStorage !== 'undefined' ? localStorage.getItem('gg.catalog.site') || '' : ''; } catch (e) {}
    function definitionFor(key) { for (var i = 0; i < definitions.length; i++) if (definitions[i].key === key) return definitions[i]; return null; }
    var currentSite = definitionFor(savedSite) || definitionFor(options.defaultSite) || definitions[0] || null, currentCategory = '', page = 1, rows = [], detailRow = null;
    var listGeneration = 0, detailGeneration = 0, visible = true, loading = false, error = '', detailLoading = false, detailError = '', localRows = false, hasMore = false, defaultRequested = {}, detailFocus = null, preselectPending = false;
    var facets = [], facetsLoaded = false, expandedFacets = {}, activeFilterURL = '', nextUrl = null, pageStack = [];
    var root = el(doc, 'section', 'catalog-root');
    var sites = el(doc, 'div', 'catalog-sites');
    var categories = el(doc, 'div', 'catalog-categories');
    var filterArea = el(doc, 'section', 'catalog-filters');
    var filterHeading = el(doc, 'div', 'catalog-filter-heading');
    var filterTitle = el(doc, 'strong', 'catalog-filter-title', '筛选');
    var filterToggle = el(doc, 'button', 'catalog-button catalog-filter-toggle', '收起筛选'); filterToggle.type = 'button';
    filterToggle.dataset.catalogFocus = 'facet-toggle';
    var filterGroups = el(doc, 'div', 'catalog-filter-groups');
    var filterHint = el(doc, 'p', 'catalog-filter-hint');
    var filtersCollapsed = false;
    var status = el(doc, 'p', 'catalog-status');
    var cards = el(doc, 'div', 'catalog-grid');
    var paging = el(doc, 'div', 'catalog-paging');
    var previous = el(doc, 'button', 'catalog-button', '上一页'); previous.type = 'button';
    var pageLabel = el(doc, 'span', 'catalog-page');
    var next = el(doc, 'button', 'catalog-button', '下一页'); next.type = 'button';
    var retryList = el(doc, 'button', 'catalog-button catalog-retry', '重试此分类'); retryList.type = 'button'; retryList.hidden = true;
    var detail = el(doc, 'div', 'catalog-detail'); detail.hidden = true; detail.setAttribute('role', 'dialog'); detail.setAttribute('aria-modal', 'true');
    filterHeading.appendChild(filterTitle); filterHeading.appendChild(filterToggle); filterArea.appendChild(filterHeading); filterArea.appendChild(filterHint); filterArea.appendChild(filterGroups);
    root.appendChild(sites); root.appendChild(categories); root.appendChild(filterArea); root.appendChild(status); root.appendChild(retryList); root.appendChild(cards);
    paging.appendChild(previous); paging.appendChild(pageLabel); paging.appendChild(next); root.appendChild(paging); root.appendChild(detail);
    container.appendChild(root);

    function categoryFor(site) {
      var list = site && Array.isArray(site.categories) ? site.categories : [];
      return list.filter(function (c) { return !!c; });
    }
    function fetchable(category) { return category && !category.local; }
    function readLocal(key) {
      try { var value = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem('gg.catalog.' + key)) || '[]'); return Array.isArray(value) ? value : []; }
      catch (e) { return []; }
    }
    function writeLocal(key, value) {
      try { if (typeof localStorage !== 'undefined') localStorage.setItem('gg.catalog.' + key, JSON.stringify(value)); } catch (e) {}
    }
    function addHistory(row) {
      var items = readLocal('history');
      items = [row].concat(items.filter(function (x) { return x && x.id !== row.id; })).slice(0, 100);
      writeLocal('history', items);
    }
    function setFavorite(row) {
      var items = readLocal('favorites'), found = items.some(function (x) { return x && x.id === row.id; });
      if (found) items = items.filter(function (x) { return x && x.id !== row.id; });
      else items.unshift(row);
      writeLocal('favorites', items.slice(0, 300));
      return !found;
    }
    function renderSites() {
      sites.textContent = '';
      definitions.forEach(function (site) {
        var b = el(doc, 'button', 'catalog-button catalog-site', site.name); b.type = 'button'; b.dataset.site = site.key;
        b.dataset.catalogFocus = 'site:' + site.key;
        b.setAttribute('aria-pressed', currentSite && currentSite.key === site.key ? 'true' : 'false');
        if (currentSite && currentSite.key === site.key) b.className += ' is-active';
        b.onclick = function () { selectSite(site); };
        sites.appendChild(b);
      });
    }
    function renderCategories() {
      categories.textContent = '';
      categoryFor(currentSite).forEach(function (cat) {
        var b = el(doc, 'button', 'catalog-button catalog-category', cat.name); b.type = 'button'; b.dataset.category = cat.id;
        b.dataset.catalogFocus = 'category:' + cat.id;
        b.setAttribute('aria-pressed', currentCategory === cat.id ? 'true' : 'false');
        if (currentCategory === cat.id) b.className += ' is-active';
        b.onclick = function () { selectCategory(cat.id); };
      categories.appendChild(b);
      });
    }
    function renderFacets() {
      filterGroups.textContent = ''; filterHint.textContent = '';
      if (!facetsLoaded) { filterArea.hidden = true; return; }
      filterArea.hidden = false;
      filterToggle.textContent = filtersCollapsed ? '展开筛选' : '收起筛选';
      filterGroups.hidden = filtersCollapsed;
      if (!facets.length) { filterHint.textContent = '此站未提供可用筛选，使用分类浏览'; return; }
      facets.forEach(function (facet) {
        if (!facet || !Array.isArray(facet.options) || !facet.options.length) return;
        var row = el(doc, 'div', 'catalog-facet-row'), label = el(doc, 'span', 'catalog-facet-label', facet.label || facet.key || '筛选');
        row.appendChild(label);
        var expanded = !!expandedFacets[facet.key], visibleCount = expanded ? facet.options.length : Math.min(6, facet.options.length);
        facet.options.forEach(function (option, index) {
          if (index >= visibleCount) return;
          var button = el(doc, 'button', 'catalog-button catalog-facet-option', option.label || '未命名');
          button.type = 'button'; button.disabled = loading || !option.url;
          button.dataset.facet = facet.key; button.dataset.facetIndex = String(index);
          button.dataset.catalogFocus = 'facet:' + facet.key + ':' + index;
          var selected = !!option.selected || (!!activeFilterURL && option.url === activeFilterURL);
          button.setAttribute('aria-pressed', selected ? 'true' : 'false');
          if (selected) button.className += ' is-active';
          button.onclick = function () { selectFacet(facet, option); };
          row.appendChild(button);
        });
        if (facet.options.length > 6) {
          var more = el(doc, 'button', 'catalog-button catalog-facet-more', expanded ? '收起' : '更多 ' + (facet.options.length - 6));
          more.type = 'button'; more.dataset.catalogFocus = 'facet-more:' + facet.key; more.disabled = loading;
          more.onclick = function () { expandedFacets[facet.key] = !expandedFacets[facet.key]; render(); };
          row.appendChild(more);
        }
        filterGroups.appendChild(row);
      });
    }
    function renderStatus() {
      status.className = 'catalog-status' + (error ? ' is-error' : loading ? ' is-loading' : '');
      text(status, error || (loading ? '正在加载参考站点…' : rows.length ? rows.length + ' 条结果' : '选择分类后加载参考站点内容'));
      previous.disabled = loading || page <= 1;
      next.disabled = loading || rows.length === 0 || (localRows ? page * 24 >= rows.length : !hasMore);
      pageLabel.textContent = '第 ' + page + ' 页';
      paging.hidden = !rows.length && !loading && !error && page <= 1;
      retryList.hidden = !error;
    }
    function renderCards() {
      cards.textContent = '';
      var visibleRows = localRows ? rows.slice((page - 1) * 24, page * 24) : rows;
      visibleRows.forEach(function (row, index) {
        var stable = safeId(currentSite.key, row, index), card = el(doc, 'button', 'catalog-card');
        card.type = 'button'; card.dataset.id = stable;
        card.dataset.catalogFocus = 'card:' + stable;
        var poster = el(doc, 'span', 'catalog-poster'), placeholder = el(doc, 'span', 'catalog-poster-placeholder');
        placeholder.appendChild(el(doc, 'i', 'catalog-skeleton-line catalog-skeleton-line-one'));
        placeholder.appendChild(el(doc, 'i', 'catalog-skeleton-line catalog-skeleton-line-two'));
        placeholder.appendChild(el(doc, 'i', 'catalog-skeleton-dot'));
        poster.appendChild(placeholder);
        if (row.image) {
          poster.className += ' has-image';
          var image = el(doc, 'img', 'catalog-image'), source = imageSource(row.image); image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer';
          if (source) image.src = source;
          image.onload = function () { poster.className += ' is-loaded'; };
          image.onerror = function () {
            if (image.parentNode) image.parentNode.removeChild(image);
            poster.className = poster.className.replace(/\s*has-image/g,'') + ' is-error';
            placeholder.textContent = ''; placeholder.appendChild(el(doc, 'span', 'catalog-poster-error', '暂无海报'));
          };
          if (source) poster.appendChild(image);
          else { poster.className = poster.className.replace(/\s*has-image/g,'') + ' is-error'; placeholder.textContent = ''; placeholder.appendChild(el(doc, 'span', 'catalog-poster-error', '暂无海报')); }
        } else {
          poster.className += ' is-error'; placeholder.textContent = ''; placeholder.appendChild(el(doc, 'span', 'catalog-poster-error', '暂无海报'));
        }
        var badges = [];
        if (hasValue(row.year)) badges.push(String(row.year));
        if (hasValue(row.rating)) badges.push('★ ' + String(row.rating));
        if (hasValue(row.updateNote)) badges.push(String(row.updateNote));
        if (badges.length) {
          var badgeBox = el(doc, 'span', 'catalog-badges');
          badges.forEach(function (value) { badgeBox.appendChild(el(doc, 'span', 'catalog-badge', value)); });
          poster.appendChild(badgeBox);
        }
        card.appendChild(poster);var copy=el(doc,'div','gg-poster-copy');copy.appendChild(el(doc, 'span', 'catalog-card-title', row.title || '未命名'));card.appendChild(copy);
        card.onclick = function () { openDetail(row); };
        cards.appendChild(card);
      });
    }
    function render() {
      var active = doc.activeElement, focusKey = active && root.contains(active) && active.dataset ? active.dataset.catalogFocus : '';
      var scrollX = typeof window !== 'undefined' ? window.pageXOffset : 0, scrollY = typeof window !== 'undefined' ? window.pageYOffset : 0;
      renderSites(); renderCategories(); renderFacets(); renderCards(); renderStatus();
      if (focusKey) {
        var nodes = root.querySelectorAll('[data-catalog-focus]'), target = null;
        Array.prototype.some.call(nodes, function (node) { if (node.dataset.catalogFocus === focusKey) { target = node; return true; } return false; });
        if (!target) {
          var prefix = focusKey.split(':')[0], fallback = prefix === 'card' ? root.querySelector('.catalog-card') : prefix === 'category' ? root.querySelector('.catalog-category.is-active') : root.querySelector('.catalog-site.is-active');
          target = fallback || root.querySelector('.catalog-category') || root.querySelector('.catalog-site') || root.querySelector('.catalog-card');
        }
        if (target) { target.focus(); if (typeof window !== 'undefined') window.scrollTo(scrollX, scrollY); }
      }
    }
    function loadPage(targetPage, descriptor) {
      if (!currentSite || !currentCategory || loading) return;
      var cat = categoryFor(currentSite).filter(function (c) { return c.id === currentCategory; })[0];
      if (cat && cat.local) {
        rows = readLocal(cat.id === 'history' ? 'history' : 'favorites').filter(function (r) { return r && typeof r.url === 'string'; });
        loading = false; error = ''; localRows = true; page = Math.max(1, Number(targetPage) || 1); hasMore = page * 24 < rows.length;
        facets = []; facetsLoaded = true; nextUrl = null; activeFilterURL = ''; pageStack = []; render(); return;
      }
      localRows = false;
      if (currentCategory === String(currentSite.defaultCategory || '')) defaultRequested[currentSite.key + '|' + currentCategory] = true;
      var generation = ++listGeneration, siteKey = currentSite.key, category = currentCategory;
      descriptor = descriptor || {type:'list',category:category};
      page = Math.max(1, Number(targetPage) || 1); rows = []; error = ''; loading = true; render();
      Promise.resolve().then(function () {
        if (descriptor.type === 'url') {
          if (typeof providers.listUrl !== 'function') throw new Error('此参考站点暂不支持筛选链接加载');
          return providers.listUrl(siteKey, descriptor.url, request);
        }
        return providers.list(siteKey, descriptor.category || category, page, request);
      }).then(function (result) {
        if (generation !== listGeneration || !currentSite || currentSite.key !== siteKey || currentCategory !== category) return;
        rows = result && Array.isArray(result.items) ? result.items.slice() : [];
        facets = result && Array.isArray(result.facets) ? result.facets.slice() : []; facetsLoaded = true;
        nextUrl = result && typeof result.nextUrl === 'string' && result.nextUrl ? result.nextUrl : null;
        hasMore = !!nextUrl;
        loading = false; render();
      }, function (err) {
        if (generation !== listGeneration || !currentSite || currentSite.key !== siteKey || currentCategory !== category) return;
        loading = false; error = err && err.message ? err.message : '参考站点加载失败'; render();
      });
    }
    function selectSite(site) {
      try { if (definitionFor(site.key) === site && typeof localStorage !== 'undefined') localStorage.setItem('gg.catalog.site', site.key); } catch (e) {}
      if (currentSite && currentSite.key === site.key) return;
      currentSite = site; var cats = categoryFor(site), preferred = String(site.defaultCategory || '');
      currentCategory = cats.some(function (c) { return c.id === preferred && fetchable(c); }) ? preferred : ((cats.filter(fetchable)[0] || cats[0]) ? (cats.filter(fetchable)[0] || cats[0]).id : '');
      page = 1; rows = []; error = ''; loading = false; localRows = false; facets = []; facetsLoaded = false; expandedFacets = {}; activeFilterURL = ''; nextUrl = null; pageStack = []; listGeneration++; render();
      if (currentCategory) { var initial = {type:'list',category:currentCategory}; pageStack = [initial]; loadPage(1,initial); }
    }
    function selectCategory(category) {
      if (!categoryFor(currentSite).some(function (c) { return c.id === String(category); })) return;
      currentCategory = String(category); page = 1; rows = []; error = ''; loading = false; localRows = false; facets = []; facetsLoaded = false; expandedFacets = {}; activeFilterURL = ''; nextUrl = null; pageStack = []; listGeneration++; render();
      var descriptor = {type:'list',category:currentCategory}; pageStack = [descriptor]; loadPage(1,descriptor);
    }
    function selectFacet(facet, option) {
      if (loading || !option || !option.url || typeof providers.listUrl !== 'function') return;
      activeFilterURL = option.url; page = 1; rows = []; error = ''; loading = false; localRows = false; nextUrl = null;
      listGeneration++; var descriptor = {type:'url',url:option.url}; pageStack = [descriptor]; render(); loadPage(1,descriptor);
    }
    function closeDetail() {
      detailGeneration++; detailRow = null; detailLoading = false; detailError = ''; detail.hidden = true; detail.textContent = '';
      if (detailFocus && doc.documentElement.contains(detailFocus)) detailFocus.focus();
      detailFocus = null;
    }
    function runCatalogPreselect(listEl) {
      var buttons = Array.prototype.slice.call(listEl.querySelectorAll('.catalog-share'));
      if (!buttons.length || detail.hidden) return;
      var dg = detailGeneration;
      var GGCore = (typeof window !== 'undefined' && window.GGCore) || null;
      function focusBest() {
        if (dg !== detailGeneration || detail.hidden) return;
        if (listEl.querySelector('.catalog-share.is-preselected')) return;
        var ranked = buttons.map(function (btn, i) { return { ok: btn.dataset.ggCheck === 'ok', verifiedClarity: null, order: i, button: btn }; });
        var bestIdx = (GGCore && typeof GGCore.rankPreselect === 'function') ? GGCore.rankPreselect(ranked) : 0;
        if (bestIdx < 0 || bestIdx >= ranked.length) return;
        var btn = ranked[bestIdx].button;
        if (!btn || !doc.documentElement.contains(btn)) return;
        btn.classList.add('is-preselected');
        if (!btn.querySelector('.catalog-preselect-badge')) btn.appendChild(el(doc, 'span', 'catalog-preselect-badge', '预选'));
        var close = detail.querySelector('.catalog-detail-close');
        var active = doc.activeElement;
        if (active === close || active === doc.body) {
          try { btn.focus(); } catch (e) {}
          try { btn.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e2) { try { btn.scrollIntoView(false); } catch (e3) {} }
        }
      }
      if (typeof options.checkLinks === 'function' && GGCore && typeof GGCore.safeShare === 'function') {
        var items = [], btns = [];
        buttons.forEach(function (btn) {
          if (items.length >= 40) return;
          var share = btn.__ggShare || {}, safe = null;
          try { safe = GGCore.safeShare(share.url || ''); } catch (e) {}
          if (!safe) return;
          items.push({ url: safe.url, password: String(share.password || safe.password || '').slice(0, 64), disk_type: safe.type });
          btns.push(btn);
        });
        if (!items.length) { focusBest(); return; }
        options.checkLinks(items).then(function (results) {
          if (dg !== detailGeneration) return;
          items.forEach(function (it, i) { if (btns[i] && doc.documentElement.contains(btns[i])) btns[i].dataset.ggCheck = results[i] === 'ok' ? 'ok' : 'unknown'; });
          focusBest();
        }, function () { focusBest(); });
        setTimeout(function () { focusBest(); }, 3000);
        return;
      }
      focusBest();
    }
    function renderDetail(result) {
      detail.textContent = '';
      var panel = el(doc, 'div', 'catalog-detail-panel'), close = el(doc, 'button', 'catalog-button catalog-detail-close', '关闭'); close.type = 'button'; close.dataset.catalogFocus = 'detail-close'; close.onclick = closeDetail;
      var media = el(doc, 'div', 'catalog-detail-media'), cover = el(doc, 'div', 'catalog-detail-cover');
      var posterUrl = detailRow.image || (result && result.image) || '', posterSource = imageSource(posterUrl);
      if (posterSource) { var img = el(doc, 'img', 'catalog-detail-image'); img.alt = ''; img.referrerPolicy = 'no-referrer'; img.src = posterSource; img.onerror = function () { if (img.parentNode) img.parentNode.removeChild(img); }; cover.appendChild(img); }
      cover.appendChild(el(doc, 'span', 'catalog-detail-cover-title', result && result.title || detailRow.title || '详情'));
      media.appendChild(cover);
      var summary = el(doc, 'div', 'catalog-detail-summary');
      summary.appendChild(close); summary.appendChild(el(doc, 'h2', 'catalog-detail-title', result && result.title || detailRow.title || '详情'));
      var description = result && result.description || '';
      var descriptionNode = el(doc, 'p', 'catalog-detail-description' + (description ? ' is-collapsed' : ''), description);
      summary.appendChild(descriptionNode);
      if (description) {
        var descriptionToggle = el(doc, 'button', 'catalog-button catalog-description-toggle', '展开简介');
        descriptionToggle.type = 'button'; descriptionToggle.dataset.catalogFocus = 'detail-description-toggle';
        descriptionToggle.setAttribute('aria-expanded', 'false');
        descriptionToggle.onclick = function () {
          var expanded = descriptionNode.classList.toggle('is-expanded');
          descriptionNode.classList.toggle('is-collapsed', !expanded);
          descriptionToggle.textContent = expanded ? '收起简介' : '展开简介';
          descriptionToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        };
        summary.appendChild(descriptionToggle);
      }
      if (detailLoading) summary.appendChild(el(doc, 'p', 'catalog-status is-loading', '正在读取简介与网盘资源…'));
      if (detailError) {
        summary.appendChild(el(doc, 'p', 'catalog-status is-error', detailError));
        var retry = el(doc, 'button', 'catalog-button catalog-detail-retry', '重试详情'); retry.type = 'button'; retry.onclick = function () { fetchDetail(detailRow); }; summary.appendChild(retry);
      }
      var actions = el(doc, 'div', 'catalog-detail-actions');
      var favorite = el(doc, 'button', 'catalog-button catalog-favorite', readLocal('favorites').some(function (x) { return x && x.id === detailRow.id; }) ? '取消收藏' : '加入收藏');
      favorite.dataset.catalogFocus = 'detail-favorite'; favorite.type = 'button'; favorite.onclick = function () { setFavorite(detailRow); if (currentCategory === 'fav') loadPage(1); else renderDetail(result); };
      actions.appendChild(favorite);
      if (typeof options.onSearch === 'function') {
        var search = el(doc, 'button', 'catalog-button catalog-search', '用自建搜索查找同名资源'); search.type = 'button'; search.dataset.catalogFocus = 'detail-search';
        search.onclick = function () { var title = (result && result.title) || detailRow.title || ''; closeDetail(); options.onSearch(title); };
        actions.appendChild(search);
      }
      summary.appendChild(actions); media.appendChild(summary); panel.appendChild(media);
      var shares = result && Array.isArray(result.shares) ? result.shares : [];
      var resourceList = el(doc, 'section', 'catalog-resources');
      resourceList.appendChild(el(doc, 'h3', 'catalog-resources-title', detailLoading ? '网盘资源' : '选择网盘资源'));
      if (detailLoading) resourceList.appendChild(el(doc, 'p', 'catalog-resources-hint', '正在查找分享链接…'));
      else if (!detailError && !shares.length) resourceList.appendChild(el(doc, 'p', 'catalog-resources-hint', '参考站点暂未提供网盘分享链接。'));
      var groupedShares = {}, groupOrder = [];
      shares.forEach(function (share) { var type = share.type || '其他网盘'; if (!groupedShares[type]) { groupedShares[type] = []; groupOrder.push(type); } groupedShares[type].push(share); });
      groupOrder.forEach(function (type) {
        var group = el(doc, 'div', 'catalog-resource-group'); group.appendChild(el(doc, 'h4', 'catalog-resource-type', type));
        groupedShares[type].forEach(function (share, index) {
          var label = share.note || share.title || ((share.password ? '含提取码' : '分享链接') + (index ? ' ' + (index + 1) : ''));
          var b = el(doc, 'button', 'catalog-button catalog-share', ''); b.type = 'button'; b.dataset.catalogFocus = 'detail-share:' + shares.indexOf(share);
          b.appendChild(el(doc, 'span', 'catalog-share-icon', String(type || '盘').slice(0, 1)));
          b.appendChild(el(doc, 'span', 'catalog-share-label', label));
          b.appendChild(el(doc, 'span', 'catalog-share-meta', share.password ? '提取码：' + share.password : '打开此资源'));
          b.__ggShare = share;
          b.onclick = function () {
            var outgoing = {}, key; for (key in share) if (Object.prototype.hasOwnProperty.call(share, key)) outgoing[key] = share[key];
            if (!outgoing.note) outgoing.note = (result && result.title) || detailRow.title || '';
            if (typeof options.onShareDirect === 'function') { options.onShareDirect(outgoing); return; }
            if (typeof options.onShare !== 'function') return;
            closeDetail(); options.onShare(outgoing);
          };
          group.appendChild(b);
        });
        resourceList.appendChild(group);
      });
      panel.appendChild(resourceList);
      detail.appendChild(panel);
      if (!detailLoading && shares.length && preselectPending) { preselectPending = false; runCatalogPreselect(resourceList); }
    }
    function fetchDetail(row) {
      var generation = ++detailGeneration, siteKey = row.siteKey || currentSite.key, url = row.url;
      detailLoading = true; detailError = ''; renderDetail(null);
      if (!detail.contains(doc.activeElement)) { var close = detail.querySelector('.catalog-detail-close'); if (close) close.focus(); }
      Promise.resolve().then(function () { return providers.detail(siteKey, url, request); }).then(function (result) {
        if (generation !== detailGeneration || !detailRow || detailRow.url !== url) return;
        detailLoading = false; renderDetail(result || {});
      }, function (err) {
        if (generation !== detailGeneration || !detailRow || detailRow.url !== url) return;
        detailLoading = false; detailError = err && err.message ? err.message : '详情读取失败'; renderDetail(null);
      });
    }
    function openDetail(row) { detailFocus = doc.activeElement; detailRow = row; addHistory(row); detail.hidden = false; preselectPending = true; fetchDetail(row); }
    function loadDefault() {
      if (!currentSite || !currentSite.defaultCategory || currentCategory !== String(currentSite.defaultCategory)) return false;
      var key = currentSite.key + '|' + currentCategory;
      if (defaultRequested[key]) return false;
      defaultRequested[key] = true;
      var descriptor = {type:'list',category:currentCategory}; pageStack = [descriptor]; loadPage(1,descriptor);
      return true;
    }
    previous.onclick = function () {
      if (previous.disabled) return;
      if (localRows) { loadPage(page - 1); return; }
      if (pageStack.length > 1) { pageStack.pop(); var previousDescriptor = pageStack[pageStack.length - 1]; loadPage(pageStack.length,previousDescriptor); }
    };
    next.onclick = function () {
      if (next.disabled) return;
      if (localRows) { loadPage(page + 1); return; }
      if (nextUrl) { var descriptor = {type:'url',url:nextUrl}; pageStack.push(descriptor); loadPage(pageStack.length,descriptor); }
    };
    retryList.onclick = function () { if (currentCategory) loadPage(page,pageStack[page - 1] || {type:'list',category:currentCategory}); };
    filterToggle.onclick = function () { filtersCollapsed = !filtersCollapsed; render(); };
    detail.onclick = function (event) { if (event.target === detail) closeDetail(); };
    doc.addEventListener('keydown', function (event) {
      if (detail.hidden) return;
      var key = event.key || ({4:'Escape'}[event.keyCode]);
      if (key === 'Escape' || key === 'BrowserBack' || key === 'GoBack') { event.preventDefault(); event.stopPropagation(); closeDetail(); return; }
      if (key !== 'Tab') return;
      var focusable = detail.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]'), list = [];
      Array.prototype.forEach.call(focusable, function (node) { if (node.offsetWidth || node.offsetHeight || node.getClientRects().length) list.push(node); });
      if (!list.length) { event.preventDefault(); return; }
      var at = list.indexOf(doc.activeElement);
      if (at < 0) { list[0].focus(); event.preventDefault(); }
      else if (event.shiftKey && at <= 0) { list[list.length - 1].focus(); event.preventDefault(); }
      else if (!event.shiftKey && at === list.length - 1) { list[0].focus(); event.preventDefault(); }
    }, true);
    if (currentSite) {
      var initial = categoryFor(currentSite), defaultId = String(currentSite.defaultCategory || '');
      currentCategory = initial.some(function (c) { return c.id === defaultId && fetchable(c); }) ? defaultId : ((initial.filter(fetchable)[0] || initial[0]) ? (initial.filter(fetchable)[0] || initial[0]).id : '');
    }
    render();
    return {
      show: function () { visible = true; root.hidden = false; },
      hide: function () { visible = false; root.hidden = true; },
      loadDefault: loadDefault,
       inspect: function () { return {visible:visible,site:currentSite && currentSite.key || '',category:currentCategory,page:page,count:rows.length,loading:loading,error:error,detailOpen:!detail.hidden,detailLoading:detailLoading,detailError:detailError,activeFilterURL:activeFilterURL,hasFacets:facets.length>0,facetCount:facets.length,nextUrl:nextUrl}; }
    };
  }
  return {mount:mount};
}));
