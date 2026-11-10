(function (root) {
  'use strict';
  var modes = [
    {id: 'week', title: '本周趋势', endpoint: '/trending/all/week'},
    {id: 'movie', title: '电影', endpoint: '/discover/movie'},
    {id: 'tv', title: '剧集', endpoint: '/discover/tv'}
  ];

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

  function list(mode, page, key, request, isCurrent) {
    var entry = modes.filter(function (item) { return item.id === mode; })[0];
    if (!entry || !key) return Promise.reject(new Error('tmdb_key_required'));
    var headers = {};
    var url = 'https://api.themoviedb.org/3' + entry.endpoint + '?language=zh-CN&page=' + encodeURIComponent(page);
    if (mode !== 'week') url += '&sort_by=popularity.desc&include_adult=false';
    if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) headers.Authorization = 'Bearer ' + key;
    else url += '&api_key=' + encodeURIComponent(key);
    return request(url, {headers: headers, timeout: 10, isCurrent: isCurrent}).then(function (response) {
      var body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
      if (!body || !Array.isArray(body.results)) throw new Error('tmdb_response_invalid');
      return {
        items: body.results.map(function (row) { return normalize(row, mode); }).filter(Boolean),
        hasMore: page < Math.min(500, Number(body.total_pages) || 1)
      };
    });
  }

  root.GGTmdbCatalog = {modes: modes, list: list};
})(this);
