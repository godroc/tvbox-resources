(function (root) {
  'use strict';

  function group(rows) {
    var groups = [];
    var byKey = Object.create(null);
    var occurrence = Object.create(null);
    (Array.isArray(rows) ? rows : []).forEach(function (row, index) {
      if (!row || typeof row !== 'object') return;
      var type = String(row.mediaType || row.media_type || row.vodType || '').toLowerCase();
      if (type === 'television' || type === 'series') type = 'tv';
      if (type !== 'movie' && type !== 'tv') type = '';
      var tmdb = String(row.tmdbId || row.tmdb_id || '');
      var douban = String(row.doubanId || row.douban_id || '');
      var season = row.season === undefined || row.season === null ? '' : String(row.season);
      var year = String(row.year || '');
      var title = String(row.canonicalTitle || row.canonical_title || '').trim().toLowerCase().replace(/\s+/g, ' ');
      var identity = '';
      if (type && (type !== 'tv' || /^\d+$/.test(season))) {
        if (/^\d+$/.test(tmdb)) identity = 'tmdb:' + type + ':' + tmdb;
        else if (/^\d+$/.test(douban)) identity = 'douban:' + type + ':' + douban;
        else if (title && /^(19|20)\d{2}$/.test(year)) identity = 'metadata:' + type + ':' + year + ':' + title;
        if (identity && type === 'tv') identity += ':season:' + season;
      }
      // Keep uncertain rows separate, even if they share a display title.
      var original = String(row.id || row.url || '');
      var resourceKey = original ? 'resource:' + original : 'anonymous:' + index;
      var count = occurrence[resourceKey] || 0;
      occurrence[resourceKey] = count + 1;
      var key = identity || resourceKey + (count ? ':duplicate:' + count : '');
      var entry = byKey[key];
      if (!entry) {
        entry = {id: key, title: String(row.canonicalTitle || row.canonical_title || row.title || ''), items: []};
        byKey[key] = entry;
        groups.push(entry);
      }
      entry.items.push(row);
    });
    return groups;
  }

  root.GGFilmGroups = {group: group};
})(typeof window !== 'undefined' ? window : globalThis);
