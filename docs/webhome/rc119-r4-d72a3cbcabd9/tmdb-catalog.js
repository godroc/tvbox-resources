(function (root) {
  'use strict';
  var modes = [
    {id: 'week', title: '本周趋势', endpoint: '/trending/all/week'},
    {id: 'movie', title: '电影', endpoint: '/discover/movie'},
    {id: 'tv', title: '剧集', endpoint: '/discover/tv'}
  ];
  var shelves = [
    modes[0],
    {id: 'recent', title: '近期新片', endpoint: '/discover/movie', kind: 'movie'},
    {id: 'airing', title: '正在播出的剧', endpoint: '/tv/on_the_air', kind: 'tv'},
    {id: 'rated', title: '高分佳片', endpoint: '/discover/movie', kind: 'movie'}
  ];
  function query(entry, filters) {
    var params = {};
    if (entry.endpoint.indexOf('/discover/') === 0) {
      params.sort_by = 'popularity.desc';
      params.include_adult = 'false';
    }
    if (entry.id === 'recent') {
      var today = new Date(), start = new Date(today.getTime() - 90 * 86400000);
      params['primary_release_date.gte'] = start.toISOString().slice(0, 10);
      params['primary_release_date.lte'] = today.toISOString().slice(0, 10);
    }
    if (entry.id === 'rated') {
      params.sort_by = 'vote_average.desc';
      params['vote_count.gte'] = '1000';
    }
    if (entry.id === 'movie' || entry.id === 'tv') {
      filters = filters || {};
      if (filters.country) params.with_origin_country = filters.country;
      if (filters.genre) params.with_genres = filters.genre;
      if (filters.year) params[entry.id === 'tv' ? 'first_air_date_year' : 'primary_release_year'] = filters.year;
      if (filters.score) {
        params['vote_average.gte'] = filters.score;
        params['vote_count.gte'] = '50';
      }
      if (filters.sort === 'rated') {
        params.sort_by = 'vote_average.desc';
        params['vote_count.gte'] = '100';
      }
      if (filters.sort === 'recent') params.sort_by = entry.id === 'tv' ? 'first_air_date.desc' : 'primary_release_date.desc';
    }
    return Object.keys(params).map(function (key) {
      return '&' + key + '=' + encodeURIComponent(params[key]);
    }).join('');
  }
  var errors = {
    tmdb_auth: 'TMDB 拒绝访问，请检查设置中的 API Key 或 API Read Access Token。',
    tmdb_timeout: '连接 TMDB 超时，请重试。',
    tmdb_response_invalid: 'TMDB 返回了无法读取的片单，请稍后重试。',
    tmdb_rate_limit: 'TMDB 请求过多，请稍后重试。'
  };

  function errorCode(error) {
    if (error && (error.status === 401 || error.status === 403)) return 'tmdb_auth';
    if (error && error.status === 429) return 'tmdb_rate_limit';
    if (error && errors[error.code]) return error.code;
    if (error && /timeout|timed out|超时/i.test(error.message || '')) return 'tmdb_timeout';
    return 'tmdb_unavailable';
  }

  function failure(code) {
    var error = new Error(code);
    error.code = code;
    return error;
  }

  function image(path, size) {
    return typeof path === 'string' && /^\/[A-Za-z0-9_.-]+$/.test(path)
      ? 'https://image.tmdb.org/t/p/' + size + path : '';
  }

  function normalize(row, mode) {
    if (!row || row.adult || !/^\d+$/.test(String(row.id))) return null;
    var kind = mode === 'week' ? row.media_type : mode;
    if (kind !== 'movie' && kind !== 'tv') return null;
    var title = String(kind === 'movie' ? row.title || row.original_title || '' : row.name || row.original_name || '').trim();
    if (!title) return null;
    var original = String(kind === 'movie' ? row.original_title || '' : row.original_name || '').trim();
    var date = String(kind === 'movie' ? row.release_date || '' : row.first_air_date || '');
    var rating = Number(row.vote_average);
    return {
      id: 'tmdb:' + kind + ':' + row.id,
      tmdbId: String(row.id), discoveryType: kind,
      title: title, originalTitle: original, year: /^\d{4}-/.test(date) ? date.slice(0, 4) : '',
      image: image(row.poster_path, 'w342'), backdrop: image(row.backdrop_path, 'w780'),
      overview: typeof row.overview === 'string' ? row.overview : '',
      rating: isFinite(rating) && rating > 0 ? rating.toFixed(1) : ''
    };
  }

  function list(mode, page, key, request, isCurrent, filters) {
    var entry = modes.concat(shelves).filter(function (item) { return item.id === mode; })[0];
    if (!entry || !key) return Promise.reject(new Error('tmdb_key_required'));
    var headers = {};
    var url = 'https://api.tmdb.org/3' + entry.endpoint + '?language=zh-CN&page=' + encodeURIComponent(page);
    url += query(entry, filters);
    if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) headers.Authorization = 'Bearer ' + key;
    else url += '&api_key=' + encodeURIComponent(key);
    function attempt(target, timeout) {
      return request(target, {headers: headers, timeout: timeout, isCurrent: isCurrent}).then(function (response) {
        var body = response && response.body;
        try {
          if (typeof body === 'string') body = JSON.parse(body);
        } catch (error) {
          throw failure('tmdb_response_invalid');
        }
        if (!body || !Array.isArray(body.results)) throw failure('tmdb_response_invalid');
        return body;
      });
    }
    return attempt(url, 4).catch(function (error) {
      if ((isCurrent && !isCurrent()) || error.status === 401 || error.status === 429) throw error;
      var relay = root.GGCore.tmdbRelaySearchUrl('https://tv.godroc.dpdns.org', url);
      return attempt(relay, 8);
    }).then(function (body) {
      return {
        items: body.results.map(function (row) { return normalize(row, entry.kind || mode); }).filter(Boolean),
        hasMore: page < Math.min(500, Number(body.total_pages) || 1)
      };
    }).catch(function (error) { throw failure(errorCode(error)); });
  }

  root.GGTmdbCatalog = {
    modes: modes,
    shelves: shelves,
    list: list,
    errorMessage: function (error) {
      return errors[errorCode(error)] || '暂时无法连接 TMDB，请稍后重试。';
    }
  };
})(this);
