(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GGDiscoveryData = factory();
}(this, function () {
  'use strict';

  var ENDPOINT = 'https://movie.douban.com/j/new_search_subjects';
  var REFERER = 'https://movie.douban.com/';
  var TYPE_TAG = { movie: '电影', tv: '电视剧', anime: '动画', documentary: '纪录片' };
  var TYPES = [
    { id: 'movie', name: '电影' }, { id: 'tv', name: '电视剧' },
    { id: 'anime', name: '动漫' }, { id: 'documentary', name: '纪录片' }
  ];

  function enc(value) { return encodeURIComponent(value == null ? '' : String(value)); }
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

  return { filters: filters, list: list, detail: detail };
}));
