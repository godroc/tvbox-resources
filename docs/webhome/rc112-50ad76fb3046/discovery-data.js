(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GGDiscoveryData = factory();
}(this, function () {
  'use strict';

  var ENDPOINT = 'https://movie.douban.com/j/new_search_subjects';
  var REFERER = 'https://movie.douban.com/';
  var MOBILE_REFERER = 'https://m.douban.com/';
  var TYPE_TAG = { movie: '电影', tv: '电视剧', anime: '动画', documentary: '纪录片' };
  var TYPES = [
    { id: 'movie', name: '电影' }, { id: 'tv', name: '电视剧' },
    { id: 'anime', name: '动漫' }, { id: 'documentary', name: '纪录片' }
  ];
  var recommendationCache = [];
  var recommendationActive = 0;
  var recommendationQueue = [];

  function pumpRecommendations() {
    while (recommendationActive < 2 && recommendationQueue.length) {
      (function (job) {
        recommendationActive += 1;
        Promise.resolve().then(job.run).then(job.resolve, job.reject).then(function () {
          recommendationActive -= 1;
          pumpRecommendations();
        });
      }(recommendationQueue.shift()));
    }
  }

  function scheduleRecommendation(run) {
    return new Promise(function (resolve, reject) {
      recommendationQueue.push({ run: run, resolve: resolve, reject: reject });
      pumpRecommendations();
    });
  }

  function enc(value) { return encodeURIComponent(value == null ? '' : String(value)); }
  var NATIVE_FILTERS = {"movie":[{"key":"类型","name":"类型","value":[{"n":"全部类型","v":""},{"n":"喜剧","v":"喜剧"},{"n":"爱情","v":"爱情"},{"n":"动作","v":"动作"},{"n":"科幻","v":"科幻"},{"n":"动画","v":"动画"},{"n":"悬疑","v":"悬疑"},{"n":"犯罪","v":"犯罪"},{"n":"惊悚","v":"惊悚"},{"n":"冒险","v":"冒险"},{"n":"音乐","v":"音乐"},{"n":"历史","v":"历史"},{"n":"奇幻","v":"奇幻"},{"n":"恐怖","v":"恐怖"},{"n":"战争","v":"战争"},{"n":"传记","v":"传记"},{"n":"歌舞","v":"歌舞"},{"n":"武侠","v":"武侠"},{"n":"情色","v":"情色"},{"n":"灾难","v":"灾难"},{"n":"西部","v":"西部"},{"n":"纪录片","v":"纪录片"},{"n":"短片","v":"短片"}]},{"key":"地区","name":"地区","value":[{"n":"全部地区","v":""},{"n":"华语","v":"华语"},{"n":"欧美","v":"欧美"},{"n":"中国","v":"中国"},{"n":"美国","v":"美国"},{"n":"中国香港","v":"中国香港"},{"n":"中国台湾","v":"中国台湾"},{"n":"韩国","v":"韩国"},{"n":"日本","v":"日本"},{"n":"英国","v":"英国"},{"n":"法国","v":"法国"},{"n":"菲律宾","v":"菲律宾"},{"n":"德国","v":"德国"},{"n":"意大利","v":"意大利"},{"n":"西班牙","v":"西班牙"},{"n":"印度","v":"印度"},{"n":"泰国","v":"泰国"},{"n":"俄罗斯","v":"俄罗斯"},{"n":"加拿大","v":"加拿大"},{"n":"澳大利亚","v":"澳大利亚"},{"n":"爱尔兰","v":"爱尔兰"},{"n":"瑞典","v":"瑞典"},{"n":"巴西","v":"巴西"},{"n":"丹麦","v":"丹麦"}]},{"key":"sort","name":"排序","value":[{"n":"近期热度","v":"T"},{"n":"首映时间","v":"R"},{"n":"高分优先","v":"S"}]},{"key":"年代","name":"年代","value":[{"n":"全部年代","v":""},{"n":"2026","v":"2026"},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2010年代","v":"2010年代"},{"n":"2000年代","v":"2000年代"},{"n":"90年代","v":"90年代"},{"n":"80年代","v":"80年代"},{"n":"70年代","v":"70年代"},{"n":"60年代","v":"60年代"},{"n":"更早","v":"更早"}]}],"tv":[{"key":"类型","name":"类型","value":[{"n":"不限","v":""},{"n":"电视剧","v":"电视剧"},{"n":"综艺","v":"综艺"}]},{"key":"电视剧形式","name":"电视剧形式","value":[{"n":"不限","v":""},{"n":"喜剧","v":"喜剧"},{"n":"爱情","v":"爱情"},{"n":"悬疑","v":"悬疑"},{"n":"动画","v":"动画"},{"n":"武侠","v":"武侠"},{"n":"古装","v":"古装"},{"n":"家庭","v":"家庭"},{"n":"犯罪","v":"犯罪"},{"n":"科幻","v":"科幻"},{"n":"恐怖","v":"恐怖"},{"n":"历史","v":"历史"},{"n":"战争","v":"战争"},{"n":"动作","v":"动作"},{"n":"冒险","v":"冒险"},{"n":"传记","v":"传记"},{"n":"剧情","v":"剧情"},{"n":"奇幻","v":"奇幻"},{"n":"惊悚","v":"惊悚"},{"n":"灾难","v":"灾难"},{"n":"歌舞","v":"歌舞"},{"n":"音乐","v":"音乐"}]},{"key":"综艺形式","name":"综艺形式","value":[{"n":"不限","v":""},{"n":"真人秀","v":"真人秀"},{"n":"脱口秀","v":"脱口秀"},{"n":"音乐","v":"音乐"},{"n":"歌舞","v":"歌舞"}]},{"key":"地区","name":"地区","value":[{"n":"全部地区","v":""},{"n":"华语","v":"华语"},{"n":"欧美","v":"欧美"},{"n":"中国","v":"中国"},{"n":"美国","v":"美国"},{"n":"中国香港","v":"中国香港"},{"n":"韩国","v":"韩国"},{"n":"日本","v":"日本"},{"n":"英国","v":"英国"},{"n":"泰国","v":"泰国"},{"n":"中国台湾","v":"中国台湾"},{"n":"意大利","v":"意大利"},{"n":"法国","v":"法国"},{"n":"德国","v":"德国"},{"n":"西班牙","v":"西班牙"},{"n":"俄罗斯","v":"俄罗斯"},{"n":"瑞典","v":"瑞典"},{"n":"巴西","v":"巴西"},{"n":"丹麦","v":"丹麦"},{"n":"印度","v":"印度"},{"n":"加拿大","v":"加拿大"},{"n":"爱尔兰","v":"爱尔兰"},{"n":"澳大利亚","v":"澳大利亚"}]},{"key":"sort","name":"排序","value":[{"n":"近期热度","v":"T"},{"n":"首播时间","v":"R"},{"n":"高分优先","v":"S"}]},{"key":"年代","name":"年代","value":[{"n":"全部","v":""},{"n":"2026","v":"2026"},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2010年代","v":"2010年代"},{"n":"2000年代","v":"2000年代"},{"n":"90年代","v":"90年代"},{"n":"80年代","v":"80年代"},{"n":"70年代","v":"70年代"},{"n":"60年代","v":"60年代"},{"n":"更早","v":"更早"}]},{"key":"平台","name":"平台","value":[{"n":"全部","v":""},{"n":"腾讯视频","v":"腾讯视频"},{"n":"爱奇艺","v":"爱奇艺"},{"n":"优酷","v":"优酷"},{"n":"湖南卫视","v":"湖南卫视"},{"n":"Netflix","v":"Netflix"},{"n":"HBO","v":"HBO"},{"n":"BBC","v":"BBC"},{"n":"NHK","v":"NHK"},{"n":"CBS","v":"CBS"},{"n":"NBC","v":"NBC"},{"n":"tvN","v":"tvN"}]}]};
  function nativeFilters(type) { return JSON.parse(JSON.stringify(NATIVE_FILTERS[type] || [])); }
  function nativeList(type, selected, page, request) {
    if (!NATIVE_FILTERS[type]) return Promise.reject(new Error('Unsupported category'));
    selected = selected || {};
    var p = Math.max(1, parseInt(page, 10) || 1), start = (p - 1) * 20, tags = [];
    NATIVE_FILTERS[type].forEach(function(group) {
      var val = selected[group.key];
      if (group.key !== 'sort' && val && group.value.some(function(item) { return item.v === val; })) tags.push(val);
    });
    if (!tags.length) tags.push(type === 'tv' ? '电视剧' : '电影');
    var sort = selected.sort || 'T';
    var sg = NATIVE_FILTERS[type].filter(function(group) { return group.key === 'sort'; })[0];
    if (!sg || !sg.value.some(function(item) { return item.v === sort; })) sort = 'T';
    var url = 'https://m.douban.com/rexxar/api/v2/' + type + '/recommend?sort=' + enc(sort) + '&tags=' + enc(tags.join(',')) + '&start=' + start + '&count=20';
    return Promise.resolve(getRequest(request)(url, {headers:{Referer:MOBILE_REFERER}})).then(function(response) {
      var body = parseBody(response);
      if (!Array.isArray(body.items)) throw new Error('Douban response is missing items');
      var items = body.items.map(function(item) { return normalizeRecommendation(item,type); }).filter(function(item) { return item && item.id && item.title && item.image; });
      return {items:items,hasMore:typeof body.total === 'number' ? start + body.items.length < body.total : body.items.length >= 20,page:p,source:'douban-native-schema'};
    });
  }
  function filters() {
    var maxYear = Math.min(new Date().getFullYear(), 2026);
    var years = [];
    for (var y = maxYear; y >= 1900; y--) years.push(String(y));
    return {
      type: TYPES.slice(),
      region: ['中国大陆', '中国香港', '中国台湾', '美国', '日本', '韩国', '英国', '法国', '德国', '其他'],
      year: years,
      yearRanges: ['2020,' + maxYear, '2010,2019', '2000,2009', '1990,1999', '1980,1989'],
      genre: ['剧情', '喜剧', '动作', '爱情', '科幻', '悬疑', '惊悚', '犯罪', '动画', '纪录片', '冒险', '奇幻', '家庭', '历史', '战争'],
      sort: [{ id: 'T', name: '推荐' }, { id: 'R', name: '评分' }, { id: 'U', name: '最近' }]
    };
  }

  function getRequest(request) {
    if (typeof request === 'function') return request;
    if (request && typeof request.get === 'function') return function (url, options) { return request.get(url, options); };
    if (request && typeof request.request === 'function') return function (url, options) { return request.request(url, options); };
    throw new Error('Douban discovery requires a request(url, options) function');
  }
  function safeUrl(value, image) {
    if (!value) return '';
    var s = String(value).replace(/^http:\/\//i, 'https://');
    var m = /^https:\/\/([^/]+)(\/[^\s]*)?$/i.exec(s);
    if (!m) return '';
    var host = m[1].toLowerCase();
    var allowed = image ? /^(img[0-9]+\.doubanio\.com|img\.doubanio\.com)$/.test(host) : /^(movie|m)\.douban\.com$/.test(host);
    return allowed ? s : '';
  }
  function parseBody(response) {
    if (response && response.ok === false) throw new Error('Douban request failed (HTTP ' + (response.status || 'error') + ')');
    if (response && Number(response.status) >= 400) throw new Error('Douban request failed (HTTP ' + Number(response.status) + ')');
    var body = response && Object.prototype.hasOwnProperty.call(response, 'body') ? response.body : response;
    if (typeof body === 'string') {
      if (/captcha|验证码|访问过于频繁|异常请求/i.test(body)) throw new Error('Douban challenge page received');
      try { body = JSON.parse(body); } catch (e) { throw new Error('Douban returned non-JSON response'); }
    }
    if (!body || typeof body !== 'object') throw new Error('Douban returned an invalid response');
    if (body.msg || body.error) throw new Error('Douban error: ' + String(body.msg || body.error));
    return body;
  }
  function normalize(item) {
    var id = item && (item.id || item.subject_id);
    var url = safeUrl(item && item.url, false);
    if (!url && id) url = 'https://movie.douban.com/subject/' + enc(id) + '/';
    return {
      id: id == null ? '' : String(id), title: item && item.title || '',
      image: safeUrl(item && (item.cover || item.pic || item.image), true),
      year: item && (item.year || item.release_year) || '',
      rating: item && (item.rate || item.rating || item.score) || '', url: url
    };
  }

  function normalizeRecommendation(item, type) {
    var id = item && (item.id || item.subject_id), imageValues, image = '', value, i, rating, url;
    if (!item || typeof item !== 'object') return null;
    imageValues = [item.cover, item.pic, item.image, item.cover_url, item.img];
    for (i = 0; i < imageValues.length && !image; i++) {
      value = imageValues[i];
      if (value && typeof value === 'object') value = value.url || value.normal || value.large || value.medium || value.default || value.image || '';
      image = safeUrl(value, true);
    }
    rating = item.rating;
    if (rating && typeof rating === 'object') rating = rating.value;
    if (rating === null || typeof rating === 'undefined' || rating === '') rating = item.rate || item.score || '';
    url = safeUrl(item.url, false);
    if (!url && id) url = 'https://movie.douban.com/subject/' + enc(id) + '/';
    return {
      id: id == null ? '' : String(id),
      title: String(item.title || item.name || ''),
      image: image,
      year: item.year || item.release_year || '',
      rating: rating,
      url: url,
      type: type
    };
  }

  function recommendationArray(body) {
    if (Array.isArray(body.subjects)) return body.subjects;
    if (Array.isArray(body.subject_collection_items)) return body.subject_collection_items;
    if (Array.isArray(body.items)) return body.items;
    if (Array.isArray(body.data)) return body.data;
    if (body.data && Array.isArray(body.data.subjects)) return body.data.subjects;
    if (body.data && Array.isArray(body.data.items)) return body.data.items;
    return [];
  }

  function copySections(sections) {
    return sections.map(function (section) {
      var copy = {}, key;
      for (key in section) if (Object.prototype.hasOwnProperty.call(section, key)) copy[key] = section[key];
      copy.items = section.items.map(function (item) {
        var itemCopy = {}, itemKey;
        for (itemKey in item) if (Object.prototype.hasOwnProperty.call(item, itemKey)) itemCopy[itemKey] = item[itemKey];
        return itemCopy;
      });
      return copy;
    });
  }

  function recommendations(request, callbackOrOptions) {
    var requestFn = getRequest(request), callback = typeof callbackOrOptions === 'function' ? callbackOrOptions : callbackOrOptions && callbackOrOptions.onSection;
    var identity = request, now = Date.now(), cached = null, i, next = 0, results = [];
    var definitions = [
      { id: 'hot-movie', kind: 'movie_hot_gaia', title: '热门电影', type: 'movie', url: 'https://m.douban.com/rexxar/api/v2/subject_collection/movie_hot_gaia/items?start=0&count=20', referer: MOBILE_REFERER },
      { id: 'hot-tv', kind: 'tv_hot', title: '热播剧集', type: 'tv', url: 'https://m.douban.com/rexxar/api/v2/subject_collection/tv_hot/items?start=0&count=20', referer: MOBILE_REFERER },
      { id: 'hot-anime', kind: 'tv_animation', title: '热门动漫', type: 'tv', url: 'https://m.douban.com/rexxar/api/v2/subject_collection/tv_animation/items?start=0&count=20', referer: MOBILE_REFERER },
      { id: 'hot-variety', kind: 'tv_variety_show', title: '热播综艺', type: 'tv', url: 'https://m.douban.com/rexxar/api/v2/subject_collection/tv_variety_show/items?start=0&count=20', referer: MOBILE_REFERER },
      { id: 'classics', kind: 'search_subjects_classics', title: '高分经典', type: 'movie', url: 'https://movie.douban.com/j/search_subjects?type=movie&tag=%E9%AB%98%E5%88%86%E7%BB%8F%E5%85%B8&sort=R&page_limit=20&page_start=0', referer: REFERER },
      { id: 'movie-showing', kind: 'movie_showing', title: '影院热映', type: 'movie', url: 'https://m.douban.com/rexxar/api/v2/subject_collection/movie_showing/items?start=0&count=20', referer: MOBILE_REFERER }
    ];

    for (i = recommendationCache.length - 1; i >= 0; i--) {
      if (recommendationCache[i].request === identity) {
        if (now - recommendationCache[i].time < recommendationCache[i].ttl) cached = recommendationCache[i];
        else recommendationCache.splice(i, 1);
        break;
      }
    }
    if (cached) {
      var cachedSections = copySections(cached.sections);
      if (typeof callback === 'function') cachedSections.forEach(function (section) { try { callback(section); } catch (e) {} });
      return Promise.resolve(cachedSections);
    }

    function failedSection(definition, error) {
      return { id: definition.id, kind: definition.kind, title: definition.title, type: definition.type, items: [], error: error && error.message ? String(error.message) : 'Douban response invalid' };
    }

    function loadSection(definition) {
      return scheduleRecommendation(function () {
        return requestFn(definition.url, { headers: { Referer: definition.referer } });
      }).then(function (responseValue) {
        var body = parseBody(responseValue), items = recommendationArray(body).map(function (item) { return normalizeRecommendation(item, definition.type); }).filter(function (item) { return !!(item && item.id && item.title); });
        var section = { id: definition.id, kind: definition.kind, title: definition.title, type: definition.type, items: items };
        if (definition.personalized === false) { section.personalized = false; section.description = definition.description; }
        if (body.subject_collection && body.subject_collection.name) section.sourceTitle = String(body.subject_collection.name);
        return section;
      }).catch(function (error) {
        return failedSection(definition, error);
      }).then(function (section) {
        if (typeof callback === 'function') try { callback(copySections([section])[0]); } catch (e) {}
        return section;
      });
    }

    function worker() {
      var index = next++;
      if (index >= definitions.length) return Promise.resolve();
      return loadSection(definitions[index]).then(function (section) { results[index] = section; return worker(); });
    }

    return Promise.all([worker(), worker()]).then(function () {
      var ttl = results.some(function (section) { return !!section.error; }) ? 12000 : 45000;
      recommendationCache.push({ request: identity, time: Date.now(), ttl: ttl, sections: copySections(results) });
      if (recommendationCache.length > 8) recommendationCache.shift();
      return copySections(results);
    });
  }
  var mixedRecommendCache = null;
  function mixedRecommend(request) {
    var now = Date.now();
    if (mixedRecommendCache && mixedRecommendCache.request === request && now - mixedRecommendCache.time < 45000) {
      var cached = mixedRecommendCache.section;
      return Promise.resolve({ id: cached.id, title: cached.title, type: cached.type, items: cached.items.slice() });
    }
    var requestFn = getRequest(request);
    function one(type, tag) {
      var url = 'https://m.douban.com/rexxar/api/v2/' + type + '/recommend?sort=T&tags=' + enc(tag) + '&start=0&count=20';
      return Promise.resolve(requestFn(url, { headers: { Referer: MOBILE_REFERER } })).then(function (response) {
        var body = parseBody(response);
        return recommendationArray(body).map(function (item) { return normalizeRecommendation(item, type); }).filter(function (item) { return item && item.id && item.title && item.image; });
      }).catch(function () { return []; });
    }
    return Promise.all([one('movie', '电影'), one('tv', '电视剧')]).then(function (lists) {
      var m = lists[0], t = lists[1], out = [], seen = {}, i, max = Math.max(m.length, t.length);
      for (i = 0; i < max; i++) {
        if (m[i] && !seen[m[i].id]) { seen[m[i].id] = true; out.push(m[i]); }
        if (t[i] && !seen[t[i].id]) { seen[t[i].id] = true; out.push(t[i]); }
      }
      out = out.slice(0, 20);
      if (!out.length) throw new Error('Douban recommend returned no items');
      var section = { id: 'douban-recommend', title: '豆瓣推荐', type: 'movie', items: out };
      mixedRecommendCache = { request: request, time: Date.now(), section: section };
      return { id: section.id, title: section.title, type: section.type, items: section.items.slice() };
    });
  }
  function list(filter, page, request) {
    filter = filter || {};
    var p = Math.max(1, parseInt(page, 10) || 1);
    var start = (p - 1) * 20;
    var type = filter.type || 'movie';
    if (!Object.prototype.hasOwnProperty.call(TYPE_TAG, type)) return Promise.reject(new Error('Unsupported Douban type: ' + type));
    var tag = TYPE_TAG[type];
    var tags = filter.tag || tag;
    var year = filter.year;
    var yearRange = year ? (String(year).indexOf(',') >= 0 ? String(year) : String(year) + ',' + String(year)) : '';
    var qs = 'sort=' + enc(filter.sort || 'T') + '&range=0%2C10&tags=' + enc(tags) + '&start=' + start;
    if (filter.genre) qs += '&genres=' + enc(filter.genre);
    if (filter.region) qs += '&countries=' + enc(filter.region);
    if (yearRange) qs += '&year_range=' + enc(yearRange);
    var url = ENDPOINT + '?' + qs;
    return Promise.resolve(getRequest(request)(url, { headers: { Referer: REFERER } })).then(function (response) {
      var body = parseBody(response);
      if (!Array.isArray(body.data)) throw new Error('Douban response is missing data array');
      var items = body.data.map(normalize);
      return { items: items, hasMore: items.length >= 20, page: p, source: 'douban' };
    });
  }
  function categoryList(type, page, request) {
    var p = Math.max(1, parseInt(page, 10) || 1), start = (p - 1) * 20, url, referer, rowType, requestFn;
    if (type === 'movie' || type === 'tv') {
      rowType = type;
      url = 'https://movie.douban.com/j/search_subjects?type=' + enc(type) + '&tag=' + enc('热门') + '&sort=recommend&page_limit=20&page_start=' + start;
      referer = REFERER;
    } else if (type === 'anime') {
      rowType = 'tv';
      url = 'https://m.douban.com/rexxar/api/v2/subject_collection/tv_animation/items?start=' + start + '&count=20';
      referer = MOBILE_REFERER;
    } else if (type === 'variety') {
      rowType = 'tv';
      url = 'https://m.douban.com/rexxar/api/v2/subject_collection/tv_variety_show/items?start=' + start + '&count=20';
      referer = MOBILE_REFERER;
    } else return Promise.reject(new Error('Unsupported category type: ' + type));

    requestFn = getRequest(request);
    return Promise.resolve().then(function () { return requestFn(url, { headers: { Referer: referer } }); }).then(function (response) {
      var body = parseBody(response), items = recommendationArray(body).map(function (item) { return normalizeRecommendation(item, rowType); }).filter(function (item) { return !!(item && item.id && item.title); });
      var total = parseInt(body.total, 10), hasMore = isNaN(total) ? items.length >= 20 : start + items.length < total;
      return { items: items, hasMore: hasMore, page: p };
    });
  }
  function detail(id, request) {
    if (!id) return Promise.reject(new Error('Douban detail requires an id'));
    var url = 'https://movie.douban.com/subject/' + enc(id) + '/';
    if (!request) return Promise.resolve(null);
    return Promise.resolve(getRequest(request)(url, { headers: { Referer: REFERER } })).then(function (response) {
      if (response && response.ok === false) throw new Error('Douban request failed (HTTP ' + (response.status || 'error') + ')');
      var html = response && Object.prototype.hasOwnProperty.call(response, 'body') ? response.body : response;
      if (typeof html !== 'string') throw new Error('Douban detail requires an HTML response body');
      if (/captcha|验证码|访问过于频繁|异常请求/i.test(html)) throw new Error('Douban challenge page received');
      return html;
    });
  }

  return { filters: filters, list: list, nativeFilters: nativeFilters, nativeList: nativeList, detail: detail, recommendations: recommendations, categoryList: categoryList, mixedRecommend: mixedRecommend };
}));
