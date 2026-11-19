(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GGProviders = factory();
}(this, function () {
  'use strict';

  /* Reference-site page shapes and route templates were independently reimplemented
     from the private v53 reference. No credentials, cookies, or API keys. */
  var definitions = [
    {key:'wanou', name:'玩偶', domains:['https://woggpan.888484.xyz','https://www.wogg.net','https://www.wogg.live'], defaultCategory:'44', categories:[['history','观看历史'],['fav','我的收藏'],['44','臻彩'],['1','电影'],['2','电视剧'],['3','动漫'],['4','综艺'],['5','音乐'],['6','短剧'],['46','纪录片']], listSelector:'.module-item', searchSelector:'.module-search-item', categoryUrl:'/vodshow/{categoryId}--------{page}---.html', searchUrl:'/vodsearch/-------------.html?wd={keyword}&page={page}', detailPanSelector:'.module-row-info p' },
    {key:'muou', name:'木偶', domains:['https://666.666291.xyz','https://123.666291.xyz'], defaultCategory:'25', categories:[['history','观看历史'],['fav','我的收藏'],['25','臻选'],['1','电影'],['2','电视剧'],['3','动漫'],['4','纪录片'],['29','综艺'],['30','原盘']], listSelector:'#main .module-item', searchSelector:'.module-search-item', detailPanSelector:'.module-row-info p' },
    {key:'huajuan', name:'花卷', domains:['https://www.hjzhencai.top'], defaultCategory:'22', categories:[['history','观看历史'],['fav','我的收藏'],['22','高帧'],['1','电影'],['2','剧集'],['3','动漫'],['23','AI短剧'],['21','综艺']], listSelector:'.module-item', searchSelector:'.module-card-item', searchUrl:'/index.php/vod/search/page/{page}/wd/{keyword}.html', detailPanSelector:'a.down-card-url' },
    {key:'duoduo', name:'多多', domains:['https://tv.214521.xyz','https://tv.yydsys.cc','https://pan.yydsys.de','https://yydsys.de5.net'], defaultCategory:'1', categories:[['history','观看历史'],['fav','我的收藏'],['1','电影'],['2','剧集'],['3','综艺'],['4','动漫'],['5','短剧'],['20','纪录']], listSelector:'.module-item', searchSelector:'.module-search-item', detailPanSelector:'.module-row-info p' },
    {key:'panchain3', name:'盘链', domains:['https://www.xn--vzy265d.cc','https://pinglian.lol'], defaultCategory:'1', categories:[['history','观看历史'],['fav','我的收藏'],['1','电影'],['2','剧集'],['4','动漫'],['3','综艺']], listSelector:'.p3-card', searchSelector:'.p3-card', categoryUrl:'/all-videos.php?t={categoryId}&page={page}', searchUrl:'/all-videos.php?search={keyword}&page={page}', detailPanSelector:'.p3-pan', requiresLogin:true },
    {key:'4kzn', name:'4K指南', domains:['https://4kzn.cc'], defaultCategory:'zuixin', categories:[['history','观看历史'],['fav','我的收藏'],['zuixin','电影'],['zuixin-juji','剧集'],['top250','top250']], listSelector:'.book-card,.book-item,.post-item,.post,.item,.module-item,.post-list-item', searchSelector:'.book-card,.book-item,.post-item,.post,.item,.module-item,.post-list-item', categoryUrl:'/books/{categoryId}/page/{page}/', searchUrl:'/?post_type=book&s={keyword}', detailPanSelector:'a,p' },
    {key:'huban', name:'虎斑', domains:['http://xhban.xyz','http://38.76.197.172:16969'], defaultCategory:'6', categories:[['history','观看历史'],['fav','我的收藏'],['6','臻彩'],['1','电影'],['2','电视剧'],['3','综艺'],['4','动漫'],['5','短剧'],['30','115网盘']], listSelector:'#main .module-item', searchSelector:'.module-search-item', detailPanSelector:'.module-row-info p' },
    {key:'shandian', name:'闪电', domains:['http://shandian.blog','http://sd.sduc.site'], defaultCategory:'1', categories:[['history','观看历史'],['fav','我的收藏'],['1','电影'],['2','电视剧'],['3','综艺'],['4','动漫'],['30','短剧']], listSelector:'#main .module-item', searchSelector:'.module-search-item', detailPanSelector:'.module-row-info p' }
  ];
  var byKey = {};
  var successfulDomains = {};
  definitions.forEach(function (d) {
    d.categories = d.categories.map(function (c) { return {id:c[0],name:c[1],local:c[0]==='history'||c[0]==='fav'}; });
    byKey[d.key] = d;
  });
  var supportedShares = [
    {type:'夸克', re:/https?:\/\/(?:pan\.)?quark\.cn\/(?:s|share)\/[\w-]+[^\s<>"']*/ig},
    {type:'百度网盘', re:/https?:\/\/pan\.baidu\.com\/s\/[\w-]+[^\s<>"']*/ig},
    {type:'阿里云盘', re:/https?:\/\/www\.alipan\.com\/s\/[\w-]+[^\s<>"']*/ig},
    {type:'阿里云盘', re:/https?:\/\/www\.aliyundrive\.com\/s\/[\w-]+[^\s<>"']*/ig},
    {type:'天翼云盘', re:/https?:\/\/cloud\.189\.cn\/t\/[\w-]+[^\s<>"']*/ig},
    {type:'UC网盘', re:/https?:\/\/drive\.uc\.cn\/s\/[\w-]+[^\s<>"']*/ig},
    {type:'迅雷云盘', re:/https?:\/\/pan\.xunlei\.com\/s\/[\w-]+[^\s<>"']*/ig},
    {type:'移动云盘', re:/https?:\/\/(?:yun\.139\.com|caiyun\.139\.com)\/[\w/?=&.-]+/ig},
    {type:'115网盘', re:/https?:\/\/115\.com\/s\/[\w-]+[^\s<>"']*/ig}
  ];
  function err(message, requiresLogin) { var e = new Error(message); if (requiresLogin) e.requiresLogin = true; return e; }
  function site(key) { if (!byKey[key]) throw err('Unknown reference site: '+key); return byKey[key]; }
  function encode(v) { return encodeURIComponent(String(v == null ? '' : v)); }
  function route(s, type, value, page) {
    var template = type === 'search' ? s.searchUrl : s.categoryUrl;
    if (!template) {
      if (type === 'search') template = '/index.php/vod/search/page/{page}/wd/{keyword}.html';
      else template = '/index.php/vod/show/id/{categoryId}/page/{page}.html';
    }
    if (s.key === '4kzn' && type === 'list') template = '/books/{categoryId}/page/{page}/';
    return template.replace(/\{keyword\}/g, encode(value)).replace(/\{categoryId\}/g, encode(value)).replace(/\{page\}/g, String(page));
  }
  function absolute(url, base) {
    if (!url) return '';
    var value = String(url).trim();
    if (/^(?:javascript|data):/i.test(value)) return '';
    if (/^\/\//.test(value)) value = 'https:' + value;
    try { return new URL(value, base).href; } catch (e) { return ''; }
  }
  function getText(response) {
    if (typeof response === 'string') return response;
    if (!response) return '';
    if (typeof response.text === 'string') return response.text;
    if (typeof response.body === 'string') return response.body;
    if (response.body && typeof response.body.html === 'string') return response.body.html;
    if (typeof response.html === 'string') return response.html;
    return '';
  }
  function statusError(response) {
    var status = response && parseInt(response.status,10);
    if (response && response.ok === false) return 'HTTP ' + (status || 'failure');
    if (status >= 400) return 'HTTP ' + status;
    return '';
  }
  function challengePage(html) {
    return /(?:cf-chl-|__cf_chl|challenge-platform|Just a moment\.\.\.|Checking your browser|Attention Required!\s*\|\s*Cloudflare|Enable JavaScript and cookies to continue)/i.test(String(html||''));
  }
  function loginPage(html) {
    var source=String(html||''), form=source.match(/<form\b[^>]*>[\s\S]*?<\/form>/ig)||[], i;
    for(i=0;i<form.length;i++) if(/type\s*=\s*["']?password/i.test(form[i]) && /(?:登录|登入|用户登录|会员登录|login|sign\s*in)/i.test(form[i])) return true;
    return false;
  }
  function appShell(s, html) {
    return s.key==='panchain3' && /<div[^>]+id=["']app["']/i.test(String(html||'')) && /<script[^>]+type=["']module["']/i.test(String(html||''));
  }
  function retryError(message) { var e=new Error(message); e.retryable=true; return e; }
  function requestOrder(s, path) {
    var ordered=[], preferred='', i;
    if (/^https?:\/\//i.test(String(path||''))) {
      try { preferred=new URL(path).origin; } catch(e) {}
    }
    if (preferred) ordered.push(preferred);
    else if (successfulDomains[s.key] && s.domains.indexOf(successfulDomains[s.key])>=0) ordered.push(successfulDomains[s.key]);
    for(i=0;i<s.domains.length;i++) if(ordered.indexOf(s.domains[i])<0) ordered.push(s.domains[i]);
    return ordered;
  }
  function urlForDomain(path, domain) {
    var base=domain, value=String(path||'');
    if (/^https?:\/\//i.test(value)) {
      try { var u=new URL(value); value=u.pathname+u.search+u.hash; } catch(e) {}
    }
    return absolute(value,base);
  }
  function withDomains(s, path, request, options, parser) {
    var domains=requestOrder(s,path), attempts=[];
    function failure(domain, reason) { attempts.push(domain+' ('+reason+')'); }
    function done() {
      var message=s.name+'站点暂时无法加载，请检查网络后重试。已尝试：'+attempts.join('；');
      var e=retryError(message); e.siteKey=s.key;
      if(attempts.some(function(x){return /登录页/.test(x);})) e.requiresLogin=true;
      throw e;
    }
    function tryAt(index) {
      if(index>=domains.length) return Promise.reject(done());
      var domain=domains[index], url=urlForDomain(path,domain), response, requestOptions={};
      Object.keys(options||{}).forEach(function(k){if(k!=='rejectLoginPage')requestOptions[k]=options[k];});
      if(!url){failure(domain,'无效地址');return tryAt(index+1);}
      return Promise.resolve().then(function(){return request(url,requestOptions);}).then(function(r){
        response=r;
        var failed=statusError(r);
        if(failed){failure(domain,failed);return tryAt(index+1);}
        var html=getText(r), finalUrl=absolute(r&&(r.finalUrl||r.url)||url,url)||url, parsed;
        if(s.key==='panchain3' && request.authenticated!==true) { var le=new Error('盘链需要已登录会话；请打开原站登录后再试。');le.requiresLogin=true;throw le; }
        if(appShell(s,html)){var se=new Error('盘链返回动态应用壳而非列表数据；需要由宿主已登录会话接入其数据加载流程。');se.requiresLogin=true;throw se;}
        parsed=parser(html,finalUrl,r);
        if(challengePage(html)){failure(domain,'Cloudflare挑战页');return tryAt(index+1);}
        if(loginPage(html) && (!parsed.hasContent || options.rejectLoginPage)){failure(domain,'登录页');return tryAt(index+1);}
        successfulDomains[s.key]=domain;
        return parsed.value;
      },function(e){
        failure(domain, (e && e.message) || '网络请求失败');
        return tryAt(index+1);
      });
    }
    return tryAt(0);
  }
  function doc(html) {
    if (typeof DOMParser === 'undefined') throw err('DOMParser is unavailable; public source parsing requires a browser DOM');
    return new DOMParser().parseFromString(html || '', 'text/html');
  }
  function text(el) { return String(el && (el.textContent || el.innerText) || '').replace(/\s+/g,' ').trim(); }
  function first(el, selector) { try { return el && el.querySelector(selector); } catch (e) { return null; } }
  function attr(el, names) { var i,v; for(i=0;el&&i<names.length;i++){v=el.getAttribute(names[i]);if(v)return v;} return ''; }
  function imageOf(el, base) {
    var im = first(el,'img');
    return absolute(attr(im,['data-original','data-src','data-lazy-src','src','data-url']),base);
  }
  function queryAll(el, selector) {
    try { return Array.prototype.slice.call(el.querySelectorAll(selector)); } catch(e) { return []; }
  }
  function yearValue(value) {
    var match=String(value||'').match(/(?:^|[^0-9])((?:19|20)\d{2})(?!\d)/);
    return match && /^(?:19|20)\d{2}$/.test(match[1]) ? match[1] : null;
  }
  function cardYear(el) {
    var direct=attr(el,['data-year','data-vod-year','data-release-year']), nodes, i, value, labelled;
    if(!direct) direct=attr(first(el,'[data-year],[data-vod-year],[data-release-year],time[datetime]'),['data-year','data-vod-year','data-release-year','datetime']);
    if(direct && yearValue(direct)) return yearValue(direct);
    nodes=queryAll(el,'.module-item-caption,.module-item-year,.module-search-item-year,.module-item-note,.module-search-item-note,.stui-vodlist__text .pic-text,time[datetime]');
    for(i=0;i<nodes.length;i++) {
      value=text(nodes[i]);
      labelled=value.match(/(?:年份|上映年份|上映时间|年代|year)\s*[:：]?\s*((?:19|20)\d{2})(?!\d)/i);
      if(labelled) return labelled[1];
      if(/(?:module-item-caption|module-item-year|module-search-item-year|pic-text)/i.test(String(attr(nodes[i],['class'])||''))) {
        var found=yearValue(value);
        if(found) return found;
      }
      value=attr(nodes[i],['datetime']);
      if(value && yearValue(value)) return yearValue(value);
    }
    return null;
  }
  function cardRating(el) {
    var nodes=queryAll(el,'.module-item-score,.module-search-item-score,.module-item-rating,.module-item-douban,.douban,.douban-score,.score,[data-score],[data-rating],[data-douban],[class*="score"],[class*="douban"]');
    var attrs=['data-score','data-rating','data-douban','data-value'], i, raw, match, number, cls;
    for(i=0;i<nodes.length;i++) {
      raw=attr(nodes[i],attrs);
      cls=String(attr(nodes[i],['class'])||'');
      if(!raw && /(?:score|douban|rating)/i.test(cls)) raw=text(nodes[i]);
      if(!raw) continue;
      match=String(raw).trim().match(/^(?:(?:豆瓣(?:评分)?|评分|score|douban|rating)\s*[:：]?\s*)?(10(?:\.0{1,2})?|[0-9](?:\.\d{1,2})?)(?:\s*分)?(?:\s*\/\s*10)?$/i);
      if(!match) continue;
      number=parseFloat(match[1]);
      if(isFinite(number) && number>=0 && number<=10) return number;
    }
    return null;
  }
  function cardUpdateNote(el) {
    var nodes=queryAll(el,'.module-item-note,.module-search-item-note,.module-item-caption,.module-item-update,.module-item-status,.module-item-remarks,.video-info .note,.pic-text,[class*="remark"],[class*="status"],[data-remark],[data-remarks],[data-vod-remarks]');
    var pattern=/(?:更新至|更新到|连载至|连载到|播至|已更新|全\s*\d{1,4}\s*集|共\s*\d{1,4}\s*集|第\s*\d{1,4}\s*集|\d{1,4}\s*集\s*全|已完结|完结|全剧终|更新中)/i;
    var i, raw;
    for(i=0;i<nodes.length;i++) {
      raw=text(nodes[i])||attr(nodes[i],['data-remark','data-remarks','data-vod-remarks','title']);
      raw=String(raw||'').replace(/^\s*(?:更新状态|状态|备注|更新)\s*[:：]\s*/,'').trim();
      if(raw && raw.length<=80 && pattern.test(raw)) return raw;
    }
    raw=attr(el,['data-remark','data-remarks','data-vod-remarks','data-status','status','vod_remarks']);
    raw=String(raw||'').trim();
    return raw && raw.length<=80 && pattern.test(raw) ? raw : '';
  }
  function titleOf(el) {
    var a=first(el,'a[href]'), im=first(el,'img'), t=attr(a,['title','aria-label']) || attr(im,['alt','title']);
    if (!t) t=text(first(el,'.module-item-title,.module-search-item-title,.video-title,.title,.book-title,.entry-title,h2,h3'));
    if (!t) t=text(a) || text(el);
    return t.replace(/^[【\[]?(?:立即|立刻|马上|播放|观看|在线观看|在线播放)[：:、\s]*/,'').trim();
  }
  function card(el, base, s) {
    var a=first(el,'a[href]'), url=absolute(attr(a,['href']) || attr(el,['data-href','data-url']),base), title=titleOf(el);
    if (!url || !title) return null;
    var id='catalog|'+s.key+'|'+url;
    return {id:id,kind:'catalog',siteKey:s.key,url:url,title:title,image:imageOf(el,base),year:cardYear(el),rating:cardRating(el),updateNote:cardUpdateNote(el),date:null,size:null,tags:[],sources:[s.key],type:s.key};
  }
  function safeSiteUrl(s, value, base) {
    var url;
    try { url=new URL(String(value||''),base); } catch(e) { return ''; }
    if ((url.protocol!=='http:' && url.protocol!=='https:') || url.username || url.password) return '';
    var host=url.host.toLowerCase(), allowed=s.domains.some(function(domain){try{return new URL(domain).host.toLowerCase()===host;}catch(e){return false;}});
    return allowed ? url.href : '';
  }
  function selectedOption(anchor, group) {
    var node=anchor, depth=0, cls, current;
    while(node && node!==group && depth<4) {
      cls=String(attr(node,['class'])||''); current=String(attr(node,['aria-current','data-selected'])||'');
      if(/(?:^|\s)(?:active|selected|on|current)(?:\s|$)/i.test(cls) || /^(?:page|true|1|selected)$/i.test(current)) return true;
      node=node.parentElement; depth++;
    }
    return false;
  }
  function extractFacets(d, s, base) {
    var containers=[], selectors='.module-filter,.module-filter-items,.filter-box,.screenbox', facets=[], signatures={};
    try { containers=Array.prototype.slice.call(d.querySelectorAll(selectors)); } catch(e) { containers=[]; }
    containers.forEach(function(group, groupIndex){
      var labelNode=first(group,'.module-filter-title,.filter-title,.filter-label,.filter-name,.screen-title,.group-title,dt,strong,label,h2,h3,h4');
      if(!labelNode && group.parentElement) labelNode=first(group.parentElement,'.module-filter-title,.filter-title,.filter-label,.filter-name,.screen-title,.group-title,dt,strong,label');
      var label=text(labelNode)||attr(group,['data-title','data-label','data-name','aria-label']);
      if(!label) return;
      var links=[];
      try { links=Array.prototype.slice.call(group.querySelectorAll('a[href]')); } catch(e) { links=[]; }
      var options=[], seen={};
      links.forEach(function(a){
        var optionUrl=safeSiteUrl(s,attr(a,['href']),base), name=text(a)||attr(a,['title','aria-label']);
        if(!optionUrl || !name || seen[optionUrl]) return;
        seen[optionUrl]=true;
        options.push({label:name,url:optionUrl,selected:selectedOption(a,group)});
      });
      if(!options.length) return;
      var signature=label+'|'+options.map(function(o){return o.url;}).join('|');
      if(signatures[signature]) return;
      signatures[signature]=true;
      var key=attr(group,['data-id','data-type','data-key','name'])||label.toLowerCase().replace(/\s+/g,'-');
      facets.push({key:key,label:label,options:options});
    });
    return facets;
  }
  function extractNextUrl(d, s, base) {
    var links=[], candidate=null, i, label, node, link, cls;
    var selectors='a[rel="next"],.pagination a.next,.page-next a,.pagination-next,.next a,a.next';
    try { links=Array.prototype.slice.call(d.querySelectorAll(selectors)); } catch(e) { links=[]; }
    for(i=0;i<links.length;i++) {
      node=links[i]; link=attr(node,['href'])?node:first(node,'a[href]');
      if(!link) continue;
      label=text(link)||text(node); cls=String(attr(link,['class'])||'')+' '+String(attr(node,['class'])||'');
      if(!candidate && (String(attr(link,['rel'])||attr(node,['rel'])||'').toLowerCase()==='next' || /(?:下一页|下页|下一|next|»|›)/i.test(label) || /(?:^|\s)(?:next|page-next|pagination-next)(?:\s|$)/i.test(cls))) candidate=link;
    }
    if(!candidate) {
      try { links=Array.prototype.slice.call(d.querySelectorAll('a[href]')); } catch(e2) { links=[]; }
      for(i=0;i<links.length;i++) { label=text(links[i]); cls=String(attr(links[i],['class'])||''); if(/(?:下一页|下页|下一|next|»|›)/i.test(label)||/(?:^|\s)(?:next|page-next|pagination-next)(?:\s|$)/i.test(cls)){candidate=links[i];break;} }
    }
    return candidate ? (safeSiteUrl(s,attr(candidate,['href']),base)||null) : null;
  }
  function pageNumber(url) {
    var match=String(url||'').match(/(?:\/page\/|[?&](?:page|paged|p)=)(\d+)/i);
    return match ? Math.max(1,parseInt(match[1],10)||1) : 1;
  }
  function loginCheck(s, request, response) {
    var body=response && response.body;
    if (s.key !== 'panchain3') return;
    if (!request || request.authenticated !== true) throw err('盘链需要已登录会话；请打开原站登录后再试。',true);
    if (body && typeof body === 'object' && (body.success === false || body.code === 401 || body.code === 403) && /登录|login|权限|session|token/i.test(String(body.message||body.msg||body.error||'登录'))) throw err('盘链登录状态无效；请打开原站重新登录。',true);
    var html=getText(response);
    if (/登录后|请先登录|login required|用户登录|密码登录/i.test(html)) throw err('盘链需要登录；请打开原站确认会话。',true);
    if (/<div[^>]+id=["']app["']/i.test(html) && /<script[^>]+type=["']module["']/i.test(html)) throw err('盘链返回动态应用壳而非列表数据；需要由宿主已登录会话接入其数据加载流程。',true);
  }
  function fetchPage(key, url, request, selector, page) {
    var s=site(key);
    if (typeof request !== 'function') return Promise.reject(err('A request(url, opts) function is required'));
    if (s.key==='panchain3' && request.authenticated !== true) return Promise.reject(err('盘链需要已登录会话；请打开原站登录后再试。',true));
    if (!url) return Promise.reject(err('Invalid source URL'));
    return withDomains(s,url,request,{method:'GET',responseType:'text',rejectLoginPage:true},function(html,base,response){
      loginCheck(s,request,response);
      var d=doc(html), nodes=[], sels=selector.split(',');
      sels.forEach(function (sel) { var found; try { found=d.querySelectorAll(sel); } catch(e) { found=[]; } if (found&&found.length) Array.prototype.forEach.call(found,function(n){if(nodes.indexOf(n)<0)nodes.push(n);}); });
      var items=nodes.map(function(n){return card(n,base,s);}).filter(Boolean);
      return {value:{items:items,hasMore:items.length>0,page:page,facets:extractFacets(d,s,base),nextUrl:extractNextUrl(d,s,base)},hasContent:items.length>0};
    });
  }
  function search(key, query, page, request) {
    var s=site(key), pg=Math.max(1,parseInt(page,10)||1), path=route(s,'search',query,pg);
    return fetchPage(key,path,request,s.searchSelector,pg);
  }
  function list(key, category, page, request) {
    var s=site(key), pg=Math.max(1,parseInt(page,10)||1), cat=String(category||'');
    if (!s.categories.some(function(c){return c.id===cat;})) return Promise.reject(err('Unknown category for '+key+': '+cat));
    if (cat==='history'||cat==='fav') return Promise.reject(err('Local category '+cat+' is managed by the host UI, not fetched from the reference site'));
    return fetchPage(key,route(s,'list',cat,pg),request,s.listSelector,pg);
  }
  function listUrl(key, url, request) {
    var s=site(key), target=safeSiteUrl(s,url,s.domains[0]);
    if(!target) return Promise.reject(err('Invalid reference-site URL: only HTTP(S) URLs on configured site domains are allowed'));
    return fetchPage(key,target,request,s.listSelector,pageNumber(target));
  }
  function parseShares(rootNode, base) {
    var content=text(rootNode), html=String(rootNode && rootNode.innerHTML || ''), all=content+' '+html, out=[], seen={};
    supportedShares.forEach(function (provider) { var m; provider.re.lastIndex=0; while((m=provider.re.exec(all))){ var url=m[0].replace(/[),，。；;]+$/,''); url=absolute(url,base); if(url&&!seen[url]){seen[url]=true;var around=all.slice(Math.max(0,m.index-50),Math.min(all.length,m.index+m[0].length+50));var pm=around.match(/(?:提取码|密码|访问码|pwd|pass(?:word)?)\s*[:：=]?\s*([a-z0-9]{4,8})/i);out.push({url:url,password:pm?pm[1]:'',type:provider.type,note:''});}} });
    return out;
  }
  function detail(key, url, request) {
    var s=site(key), target=safeSiteUrl(s,url,successfulDomains[s.key]||s.domains[0]);
    if (!target || !request) return Promise.reject(err('A valid detail URL and request(url, opts) function are required'));
    if (s.key==='panchain3' && request.authenticated !== true) return Promise.reject(err('盘链需要已登录会话；请打开原站登录后再试。',true));
    return withDomains(s,target,request,{method:'GET',responseType:'text',rejectLoginPage:true},function(html,base,response){
      loginCheck(s,request,response);
      var d=doc(html), title=text(first(d,'h1,.title,.module-info-heading h1,.entry-title,.book-title')) || '', description='', image='';
      var im=first(d,'.module-info-poster img,.detail-pic img,.post-thumbnail img,.book-cover img,article img,img'); image=absolute(attr(im,['data-original','data-src','src','data-lazy-src']),base);
      var selectors=s.key==='4kzn'?'.entry-content,.book-content,.book-desc,.post-content,.article-content,article':'.module-info-introduction-content,.module-info-introduction .module-info-item-content,.module-info-content,.module-info-introduction,.module-info-item-content,.detail-desc,.video-info-content,.content-desc,.vod_content,.description,[itemprop="description"]';
      var descNodes=d.querySelectorAll(selectors), best='';
      Array.prototype.forEach.call(descNodes,function(n){var t=text(n);if(t.length>best.length)best=t;});
      description=best;
      var shares=[], panNodes=[];
      try { panNodes=d.querySelectorAll(s.detailPanSelector); } catch(e) { panNodes=[]; }
      Array.prototype.forEach.call(panNodes,function(n){shares=shares.concat(parseShares(n,base));});
      if(!shares.length)shares=parseShares(d.body,base);
      var unique=[], seen={}; shares.forEach(function(x){if(!seen[x.url]){seen[x.url]=true;unique.push(x);}});
      return {value:{title:title||'详情',description:description,image:image,shares:unique},hasContent:!!(title||description||image||unique.length)};
    });
  }
  return {definitions:definitions,search:search,list:list,listUrl:listUrl,detail:detail,_helpers:{absolute:absolute,route:route,parseShares:parseShares,safeSiteUrl:safeSiteUrl,extractFacets:extractFacets,extractNextUrl:extractNextUrl}};
}));
