(function (root) {
  'use strict';
  function mount(o) {
    var doc=o.container.ownerDocument, data=root.GGDiscoveryData, gen=0, detailGen=0, page=1, loadedHome=false, rows=[], focusBack=null, ref=null, imageObserver=null;
    var nativeSelections={movie:{},tv:{}}, filters={type:'movie',genre:'',region:'',year:'',sort:'T'}, section='home', activeNav='home', routeSection='home', filteredBrowse=false, filtersVisible=false, routeToken='ggs-'+new Date().getTime()+'-'+Math.floor(Math.random()*1000000000), routeOrigin=doc.defaultView.location.protocol+'//'+doc.defaultView.location.host, choices=data.filters(), renderedRailIds={},historyRequestId=0,historyScope=null;
    try { var saved=JSON.parse(localStorage.getItem('gg.discovery.filters')||'{}'); Object.keys(filters).forEach(function(k){if(typeof saved[k]==='string'&&k!=='type')filters[k]=saved[k];}); } catch(e) {}
    function el(tag,cls,text){var n=doc.createElement(tag);n.className=cls||'';if(text!==undefined&&text!==null)n.textContent=text;return n;}
    var box=el('section','discovery'),tabs=el('div','discovery-types'),content=el('div','discovery-content');
    tabs.hidden=false;
    box.appendChild(tabs);box.appendChild(content);o.container.appendChild(box);
    var routeReplace=false;
    function syncTopbar(){var a=doc.activeElement,top=doc.querySelector('.topbar');if(!a)return;if(content.contains(a))doc.body.classList.add('gg-topbar-collapsed');else if(!a.closest||!a.closest('.modal[role="dialog"],.discovery-modal[role="dialog"],.ref-dialog[role="dialog"]'))doc.body.classList.remove('gg-topbar-collapsed');}
    doc.addEventListener('focusin',syncTopbar,false);
    var modal=el('section','discovery-modal');modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','影片详情与找源');doc.body.appendChild(modal);
    function save(){try{localStorage.setItem('gg.discovery.filters',JSON.stringify(filters));}catch(e){}}
    function sectionChange(value){section=value;if(typeof o.onSectionChange==='function')o.onSectionChange(value);}
    function routeUrl(value){var href=doc.defaultView.location.href,hashAt=href.indexOf('#'),hash=hashAt<0?'':href.slice(hashAt),base=hashAt<0?href:href.slice(0,hashAt),queryAt=base.indexOf('?'),path=queryAt<0?base:base.slice(0,queryAt),parts=queryAt<0?[]:base.slice(queryAt+1).split('&'),kept=[],i,key;for(i=0;i<parts.length;i++){key=parts[i].split('=')[0];if(key!=='gg_section')kept.push(parts[i]);}if(value&&value!=='home')kept.push('gg_section='+encodeURIComponent(value));return path+(kept.length?'?'+kept.join('&'):'')+hash;}
    function routeState(value){var current=doc.defaultView.history.state,state={},key;if(current&&typeof current==='object')for(key in current)if(Object.prototype.hasOwnProperty.call(current,key))state[key]=current[key];state.ggSectionHistoryOwner=routeToken;state.ggSection=value;return state;}
    function readRoute(){var match=/(?:\?|&)gg_section=([^&#]*)/.exec(doc.defaultView.location.href);if(!match)return 'home';try{return decodeURIComponent(match[1]);}catch(e){return 'home';}}
    function setRoute(value,push){var win=doc.defaultView,origin=win.location.protocol+'//'+win.location.host;if(origin!==routeOrigin)return;if(value===routeSection)return;if(push)try{if(routeReplace)win.history.replaceState(routeState(value),'',routeUrl(value));else win.history.pushState(routeState(value),'',routeUrl(value));}catch(e){return;}routeSection=value;}
    function activeType(){Array.prototype.forEach.call(tabs.children,function(b){b.classList.toggle('active',b.dataset.type===activeNav);b.setAttribute('aria-pressed',String(b.dataset.type===activeNav));});}
    function normalizedImageUrl(url){if(/https:\/\/img\d+\.doubanio\.com\//.test(url||''))return url.replace(/https:\/\/img\d+\.doubanio\.com\//,'https://img2.doubanio.com/');return url;}
    function armImageTimeout(img){if(img.__ggImgTimer){clearTimeout(img.__ggImgTimer);}img.__ggImgTimer=setTimeout(function(){img.__ggImgTimer=null;try{if(img.complete&&img.naturalWidth>0)return;}catch(e){}if(typeof img.onerror==='function')img.onerror();},8000);}
    function loadImage(img){var url=img.getAttribute('data-gg-src');if(!url)return;if(imageObserver)imageObserver.unobserve(img);img.removeAttribute('data-gg-src');img.__ggImageUrl=url;img.src=o.imageSource(url);armImageTimeout(img);}
    function clearImages(container){if(!imageObserver||!container)return;var images=container.querySelectorAll('img[data-gg-src]');for(var i=0;i<images.length;i++)imageObserver.unobserve(images[i]);}
    if(typeof doc.defaultView.IntersectionObserver==='function')imageObserver=new doc.defaultView.IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting||entry.intersectionRatio>0)loadImage(entry.target);});},{root:null,rootMargin:'400px 400px',threshold:0});
    function image(url,cls,priority){var img=el('img',cls),attempt=0;url=normalizedImageUrl(url);img.alt='';img.referrerPolicy='no-referrer';img.onerror=function(){if(img.__ggImgTimer){clearTimeout(img.__ggImgTimer);img.__ggImgTimer=null;}var current=img.__ggImageUrl||url;if(attempt===0&&current.indexOf('://image.tmdb.org/')>=0){attempt++;current=current.replace('://image.tmdb.org/','://images.tmdb.org/');img.__ggImageUrl=current;img.src=current;armImageTimeout(img);return;}if(attempt===0&&/https:\/\/img2\.doubanio\.com\//.test(current)){attempt++;current=current.replace('https://img2.','https://img1.');img.__ggImageUrl=current;img.src=o.imageSource(current);armImageTimeout(img);return;}img.hidden=true;var fallback=el('span','discovery-no-image','海报暂不可用');if(img.parentNode&&!img.parentNode.querySelector('.discovery-no-image'))img.parentNode.appendChild(fallback);};img.onload=function(){if(img.__ggImgTimer){clearTimeout(img.__ggImgTimer);img.__ggImgTimer=null;}};if(priority||!imageObserver){img.src=o.imageSource(url);armImageTimeout(img);}else{img.setAttribute('data-gg-src',url);imageObserver.observe(img);}return img;}
    function typedRow(row,type){var copy={},key;for(key in row)if(Object.prototype.hasOwnProperty.call(row,key))copy[key]=row[key];copy.discoveryType=type;return copy;}
    var HIDDEN_HISTORY_KEY='gg.webhome.hidden-history-v1';
    var tmdbCache={};
    var detailWallPic='';
    var prefetchCache={},prefetchCacheKeys=[],prefetchQueue=[],prefetchActive=0;
    function prefetchCacheGet(key){var e=prefetchCache[key];if(!e)return null;if(Date.now()-e.time>600000){delete prefetchCache[key];return null;}return e.rows;}
    function prefetchCachePut(key,rows){if(!prefetchCache[key])prefetchCacheKeys.push(key);prefetchCache[key]={time:Date.now(),rows:rows};while(prefetchCacheKeys.length>30)delete prefetchCache[prefetchCacheKeys.shift()];}
    function prefetchEnqueue(task){prefetchQueue.push(task);prefetchPump();}
    function prefetchPump(){while(prefetchActive<2&&prefetchQueue.length){var t=prefetchQueue.shift();if(t.gen!==detailGen)continue;prefetchActive++;(function(task){Promise.resolve().then(task.run).then(function(){prefetchActive--;prefetchPump();},function(){prefetchActive--;prefetchPump();});})(t);}}
    function readHiddenHistory(){ try{ var v=JSON.parse(localStorage.getItem(HIDDEN_HISTORY_KEY)||'[]'); return Array.isArray(v)?v:[]; }catch(e){ return []; } }
    var historyEdit=false;
    function enterHistoryEdit(){historyEdit=true;var rail=historyRail();if(rail)rail.classList.add('discovery-edit-mode');}
    function exitHistoryEdit(){historyEdit=false;var rail=historyRail();if(rail)rail.classList.remove('discovery-edit-mode');}
    function deleteHistory(cardEl,row){
      historyRequestId++;
      var key=(row.history&&row.history.key)||'',hidden=readHiddenHistory();
      if(key&&hidden.indexOf(key)<0)hidden.push(key);
      try{localStorage.setItem(HIDDEN_HISTORY_KEY,JSON.stringify(hidden));}catch(e){}
      var track=cardEl.parentNode,next=null;
      if(track){
        var sib=cardEl.nextElementSibling||cardEl.previousElementSibling;
        if(sib&&sib.classList&&sib.classList.contains('discovery-card'))next=sib;
        track.removeChild(cardEl);
        if(!track.querySelector('.discovery-card')){ var rail=track.parentNode; if(rail&&rail.parentNode)rail.parentNode.removeChild(rail); next=null; }
      }
      if(next){ try{next.focus();}catch(e){} }
      else{ var firstCard=content.querySelector('.discovery-card'); if(firstCard){ try{firstCard.focus();}catch(e){} } }
      setTimeout(refreshHistory,0);
    }
    function card(row,type){var b=el('button','discovery-card'),poster=el('div','discovery-poster');b.type='button';b.dataset.id=row.id||'';if(row.image)poster.appendChild(image(row.image,'discovery-image'));else poster.appendChild(el('span','discovery-no-image','暂无海报'));if(row.rating)poster.appendChild(el('span','discovery-rating','★ '+row.rating));b.appendChild(poster);b.appendChild(el('span','discovery-title',row.title));if(row.year)b.appendChild(el('small','discovery-year',String(row.year)));
      var suppressClick=false,holdTimer=null;
      function clearHold(){ if(holdTimer){clearTimeout(holdTimer);holdTimer=null;} }
      function startHold(){ clearHold(); holdTimer=setTimeout(function(){ holdTimer=null; suppressClick=true; enterHistoryEdit(); },500); }
      if(row.history){
        poster.appendChild(el('span','discovery-delete-badge','×'));
        if(row.source)poster.appendChild(el('span','discovery-source-badge',row.source));
        b.setAttribute('data-gg-longpress','history');
        b.addEventListener('gg-longpress',function(){ enterHistoryEdit(); },false);
        b.addEventListener('contextmenu',function(e){if(e&&e.preventDefault)e.preventDefault();enterHistoryEdit();},false);
        b.addEventListener('mousedown',startHold,false);
        b.addEventListener('touchstart',startHold,false);
        b.addEventListener('mouseup',clearHold,false);
        b.addEventListener('mouseleave',clearHold,false);
        b.addEventListener('touchend',clearHold,false);
        b.addEventListener('touchcancel',clearHold,false);
      }
      b.onclick=function(){ if(suppressClick){ suppressClick=false; return; } if(row.history&&historyEdit){ deleteHistory(b,row); return; } var item=typedRow(row,type);if(row.history&&typeof o.onHistory==='function')o.onHistory(row);else open(item);};return b;}
    function renderRail(rail){var id=String(rail&&rail.id||rail&&rail.title||('rail-'+Object.keys(renderedRailIds).length)),existing=null,nodes,i;if(renderedRailIds[id])return;renderedRailIds[id]=true;nodes=content.querySelectorAll('.discovery-rail');for(i=0;i<nodes.length;i++)if(nodes[i].dataset.rail===id){existing=nodes[i];break;}var node=el('section','discovery-rail'),head=el('div','discovery-rail-heading'),track=el('div','discovery-rail-track');node.dataset.rail=id;head.appendChild(el('h2','',rail&&rail.title||'豆瓣推荐'));node.appendChild(head);if(rail&&rail.error||!rail||!rail.items||!rail.items.length){var message=el('p','discovery-rail-error',rail&&rail.error?'暂时无法读取：'+rail.error:'暂时没有可显示的推荐');var retry=el('button','subbutton discovery-rail-retry','重试');retry.type='button';retry.onclick=function(){retry.disabled=true;message.textContent='正在重试…';delete renderedRailIds[id];var got=false;function update(next){if(!next||String(next.id||next.title)!==id)return;got=true;delete renderedRailIds[id];renderRail(next);}if(id==='douban-recommend'&&typeof data.mixedRecommend==='function')Promise.resolve(data.mixedRecommend(o.request)).then(function(next){if(next)update(next);else{message.textContent='重试失败，请稍后再试。';retry.disabled=false;}},function(){message.textContent='重试失败，请稍后再试。';retry.disabled=false;});else if(typeof data.recommendations==='function')Promise.resolve(data.recommendations(o.request,update)).then(function(list){if(!got&&Array.isArray(list))list.forEach(update);},function(){message.textContent='重试失败，请稍后再试。';retry.disabled=false;});else retry.disabled=false;};node.appendChild(message);node.appendChild(retry);}else{rail.items.forEach(function(item){track.appendChild(card(item,rail.type||item.discoveryType||item.type||'movie'));});node.appendChild(track);}if(existing&&existing.parentNode)existing.parentNode.replaceChild(node,existing);else if(id==='recently-watched'){var firstRail=content.querySelector('.discovery-rail');if(firstRail)content.insertBefore(node,firstRail);else content.appendChild(node);}else if(id==='douban-recommend'){var fyRail=content.querySelector('.discovery-rail[data-rail="for-you"]');if(fyRail)content.insertBefore(node,fyRail);else content.appendChild(node);}else content.appendChild(node);}
    function historyRail(){return content.querySelector('.discovery-rail[data-rail="recently-watched"]');}
    function renderHistory(items,state,scope){
      var previous=historyRail(),active=doc.activeElement,hadFocus=!!(previous&&previous.contains(active)),focusId=hadFocus&&active.dataset?active.dataset.id:'',oldTrack=previous&&previous.querySelector('.discovery-rail-track'),oldCards=oldTrack?oldTrack.querySelectorAll('.discovery-card'):[],focusIndex=Array.prototype.indexOf.call(oldCards,active),left=oldTrack?oldTrack.scrollLeft:0,scrollY=doc.defaultView.pageYOffset,signature=JSON.stringify([scope,state,items.map(function(row){return [row.id,row.title,row.image,JSON.stringify(row.history||null)];})]);
      if(previous&&previous.__historySignature===signature){var oldNotice=previous.querySelector('.history-refresh-error');if(oldNotice)oldNotice.remove();return;}
      var node=el('section','discovery-rail'),head=el('div','discovery-rail-heading');node.dataset.rail='recently-watched';node.__historySignature=signature;head.appendChild(el('h2','','最近观看'));if(items.length){var manageBtn=el('button','subbutton discovery-history-manage',historyEdit?'完成':'管理');manageBtn.type='button';manageBtn.onclick=function(){if(historyEdit){exitHistoryEdit();manageBtn.textContent='管理';}else{enterHistoryEdit();manageBtn.textContent='完成';}};head.appendChild(manageBtn);}node.appendChild(head);
      if(items.length){var track=el('div','discovery-rail-track');items.forEach(function(row){track.appendChild(card(row,'movie'));});node.appendChild(track);track.scrollLeft=left;}
      else{node.appendChild(el('p','discovery-rail-error',state==='loading'?'正在读取观看记录…':state==='error'?'暂时无法读取观看记录，请重试。':'当前点播配置暂无观看记录。'));if(state==='error'){var retry=el('button','subbutton discovery-rail-retry','重试');retry.type='button';retry.onclick=refreshHistory;node.appendChild(retry);}}
      if(historyEdit)node.classList.add('discovery-edit-mode');
      if(previous&&previous.parentNode){clearImages(previous);previous.parentNode.replaceChild(node,previous);}else{var first=content.querySelector('.discovery-rail');if(first)content.insertBefore(node,first);else content.appendChild(node);}
      if(hadFocus){var cards=node.querySelectorAll('.discovery-card'),i,target=null;for(i=0;i<cards.length;i++)if(cards[i].dataset.id===focusId){target=cards[i];break;}if(!target&&cards.length)target=cards[Math.min(Math.max(0,focusIndex),cards.length-1)];if(!target)target=tabs.querySelector('.discovery-type.active');if(target){try{target.focus();}catch(e){}}if(oldTrack&&node.querySelector('.discovery-rail-track'))node.querySelector('.discovery-rail-track').scrollLeft=left;if(Math.abs(doc.defaultView.pageYOffset-scrollY)>4)doc.defaultView.scrollTo(0,scrollY);}
    }
    function refreshHistory(){
      if(section!=='home'||o.container.hidden||typeof o.loadHistory!=='function')return Promise.resolve();
      var ticket=++historyRequestId,generation=gen;if(!historyRail())renderHistory([],'loading',null);
      return Promise.resolve().then(function(){return o.loadHistory();}).then(function(result){
        if(ticket!==historyRequestId||generation!==gen||section!=='home'||o.container.hidden)return;
        if(!result||!Array.isArray(result.items))throw new Error('invalid history');
        var hidden=readHiddenHistory(),items=result.items.filter(function(row){return row&&(!row.history||hidden.indexOf(row.history.key)<0);});historyScope=result.scope===undefined?null:result.scope;renderHistory(items,'ready',historyScope);
      }).catch(function(error){
        if(ticket!==historyRequestId||generation!==gen||section!=='home'||o.container.hidden)return;
        var existing=historyRail(),sameScope=historyScope!==null&&error&&error.historyScope===historyScope;
        if(existing&&sameScope&&existing.querySelector('.discovery-card')){var notice=existing.querySelector('.history-refresh-error');if(!notice){notice=el('button','subbutton history-refresh-error','观看记录更新失败，点击重试');notice.type='button';notice.onclick=refreshHistory;existing.appendChild(notice);}return;}
        historyScope=null;renderHistory([],'error',null);
      });
    }
    function home(nav,fromRoute){var nextNav=nav||'home';if(loadedHome&&section==='home'&&(activeNav===nextNav||((activeNav==='home'||activeNav==='for-you')&&(nextNav==='home'||nextNav==='for-you')))){activeNav=nextNav;if(fromRoute)routeSection=activeNav;else setRoute(activeNav,true);sectionChange('home');activeType();return Promise.resolve();}gen++;loadedHome=true;activeNav=nextNav;if(fromRoute)routeSection=activeNav;else setRoute(activeNav,true);sectionChange('home');activeType();filteredBrowse=false;page=1;clearImages(content);content.textContent='';renderedRailIds={};var status=el('p','discovery-status','正在整理豆瓣推荐…');content.appendChild(status);var generation=gen;var seenHomeIds={};
      var skel=el('div','discovery-skeleton-rail'),skelTrack=el('div','discovery-rail-track');
      for(var si=0;si<6;si++){var sc=el('div','discovery-card discovery-skeleton');sc.appendChild(el('div','discovery-poster'));sc.appendChild(el('span','discovery-skeleton-title'));skelTrack.appendChild(sc);}
      skel.appendChild(skelTrack);content.appendChild(skel);
      function clearSkeletons(){var nodes=content.querySelectorAll('.discovery-skeleton-rail');for(var i=0;i<nodes.length;i++)if(nodes[i].parentNode)nodes[i].parentNode.removeChild(nodes[i]);}
      refreshHistory();
      function gotRail(rail){if(generation!==gen||section!=='home')return;if(rail&&rail.id&&rail.id!=='for-you')return;if(rail&&Array.isArray(rail.items)){rail.items=rail.items.filter(function(it){var id=it&&it.id;if(!id)return true;if(seenHomeIds[id])return false;seenHomeIds[id]=true;return true;});if(!rail.items.length&&!rail.error)return;}clearSkeletons();renderRail(rail);if(content.querySelector('.discovery-rail'))status.remove();}
      function gotRecommend(rail){if(generation!==gen||section!=='home')return;if(!rail||rail.id!=='douban-recommend')return;if(Array.isArray(rail.items)){rail.items=rail.items.filter(function(it){var id=it&&it.id;if(!id)return true;if(seenHomeIds[id])return false;seenHomeIds[id]=true;return true;});if(!rail.items.length&&!rail.error)return;}clearSkeletons();renderRail(rail);if(content.querySelector('.discovery-rail'))status.remove();}
      if(typeof data.mixedRecommend==='function'){
        var mixedResult;try{mixedResult=data.mixedRecommend(o.request);}catch(e){mixedResult=Promise.reject(e);}
        Promise.resolve(mixedResult).then(function(next){if(generation===gen&&section==='home')gotRecommend(next);},function(){});
      }
      if(typeof data.recommendations==='function'){
        var result;try{result=data.recommendations(o.request,gotRail);}catch(e){result=Promise.reject(e);}
        return Promise.resolve(result).then(function(rails){if(generation!==gen||section!=='home')return; if(Array.isArray(rails))rails.forEach(gotRail);clearSkeletons();if(!content.querySelector('.discovery-rail'))status.textContent='推荐暂时不可用，请稍后重试。';else status.remove();},function(){if(generation===gen){clearSkeletons();if(!content.querySelector('.discovery-rail'))status.textContent='推荐暂时不可用，请稍后重试。';}});
      }
      return data.list({type:'movie',sort:'T'},1,o.request).then(function(result){if(generation===gen)gotRail({id:'douban',title:'豆瓣推荐',items:result.items});},function(){if(generation===gen){clearSkeletons();status.textContent='推荐暂时不可用，请稍后重试。';}});
    }
    function renderBrowseHeader(){var head=el('div','discovery-browse-head'),title=el('h1','discovery-browse-title',(navCategories.filter(function(t){return t.id===activeNav;})[0]||choices.type.filter(function(t){return t.id===section;})[0]||{name:'电影'}).name);head.appendChild(title);content.appendChild(head);}
    function renderGrid(items){var grid=content.querySelector('.discovery-grid');if(!grid){grid=el('div','discovery-grid');content.appendChild(grid);}grid.textContent='';items.forEach(function(row){grid.appendChild(card(row,section));});return grid;}
    var pendingFilterFocus=false,pendingPageFocus=false;
    function renderInlineFilters(){var kind=filters.type==='tv'?'tv':'movie',groups=data.nativeFilters(kind),current=nativeSelections[kind]||{},wrap=el('div','discovery-inline-filters');groups.forEach(function(group){var row=el('div','discovery-filter-row'),lab=el('span','discovery-filter-label',group.name),opts=el('div','discovery-filter-options');row.appendChild(lab);group.value.forEach(function(item){var b=el('button','discovery-filter-chip',item.n);b.type='button';b.dataset.group=group.key;b.dataset.value=item.v;var cur=current[group.key];if(cur===undefined)cur=group.value[0].v;if(cur===item.v)b.classList.add('active');b.setAttribute('aria-pressed',String(cur===item.v));b.onclick=function(){applyInlineFilter(kind,group.key,item.v);};opts.appendChild(b);});row.appendChild(opts);wrap.appendChild(row);});var anyActive=groups.some(function(group){var cur=current[group.key];return cur!==undefined&&cur!==group.value[0].v;});if(anyActive||filteredBrowse){var reset=el('button','subbutton discovery-filter-reset','重置筛选');reset.type='button';reset.onclick=function(){nativeSelections[kind]={};filteredBrowse=false;page=1;loadBrowse();};wrap.appendChild(reset);}wrap.hidden=!filtersVisible;content.appendChild(wrap);}
    function applyInlineFilter(kind,groupKey,value){var current=nativeSelections[kind]||{};current[groupKey]=value;nativeSelections[kind]=current;var groups=data.nativeFilters(kind),allDefault=groups.every(function(group){var cur=current[group.key];return cur===undefined||cur===group.value[0].v;});filteredBrowse=!allDefault;page=1;pendingFilterFocus=true;loadBrowse();}
    function loadBrowse(){var g=++gen;loadedHome=true;page=Math.max(1,page);clearImages(content);content.textContent='';renderBrowseHeader();renderInlineFilters();var status=el('p','discovery-status','正在读取豆瓣片单…'),grid=el('div','discovery-grid');grid.setAttribute('aria-busy','true');content.appendChild(status);content.appendChild(grid);for(var bsi=0;bsi<6;bsi++){var bsc=el('div','discovery-card discovery-skeleton');bsc.appendChild(el('div','discovery-poster'));bsc.appendChild(el('span','discovery-skeleton-title'));grid.appendChild(bsc);}var paging=el('div','discovery-paging'),prev=el('button','subbutton','上一页'),label=el('span','','第 '+page+' 页'),next=el('button','subbutton','下一页');prev.disabled=page<=1;next.disabled=true;prev.onclick=function(){if(page>1){page--;pendingPageFocus=true;loadBrowse();}};next.onclick=function(){page++;pendingPageFocus=true;loadBrowse();};paging.appendChild(prev);paging.appendChild(label);paging.appendChild(next);content.appendChild(paging);
      var request=filteredBrowse?data.nativeList(filters.type,nativeSelections[filters.type],page,o.request):(typeof data.categoryList==='function'?data.categoryList(section,page,o.request):data.list(filters,page,o.request));return request.then(function(result){if(g!==gen)return;rows=result.items||[];renderGrid(rows);if(pendingFilterFocus||pendingPageFocus){pendingFilterFocus=false;pendingPageFocus=false;var fc=grid.querySelector('.discovery-card');if(fc){try{fc.focus();}catch(e){}}}status.textContent=rows.length?('豆瓣 · 第 '+page+' 页'+(result.hasMore?'':'（已是最后一页）')):'没有符合条件的影片。';label.textContent='第 '+page+' 页';prev.disabled=page<=1;next.disabled=!result.hasMore;grid.setAttribute('aria-busy','false');},function(e){if(g!==gen)return;grid.textContent='';grid.setAttribute('aria-busy','false');status.textContent='片单加载失败：'+(e&&e.message||'请稍后重试');var retry=el('button','subbutton','重试');retry.onclick=loadBrowse;grid.appendChild(retry);next.disabled=true;});
    }
    function browse(type,options){options=options||{};activeNav=type;filtersVisible=false;var known=choices.type.filter(function(t){return t.id===type;})[0];if(!known&&type!=='variety')type='movie';if(options.fromRoute)routeSection=options.route||activeNav;else setRoute(activeNav,true);filters.type=(type==='variety'||type==='anime')?'tv':type==='documentary'?'movie':type;filteredBrowse=!!options.keepFilter;page=1;save();sectionChange(type);activeType();var request=loadBrowse();return request;}
    function filterKind(){return filters.type==='tv'?'tv':'movie';}
    var navCategories=[{id:'home',name:'首页'},{id:'for-you',name:'猜你喜欢'},{id:'movie',name:'热门电影'},{id:'tv',name:'热播剧集'},{id:'anime',name:'热门动漫'},{id:'variety',name:'热播综艺'}];
    var tabFocusTimer=null;
    function clearTabFocusTimer(){if(tabFocusTimer){clearTimeout(tabFocusTimer);tabFocusTimer=null;}}
    function onRoutePop(){var href=doc.defaultView.location.href,target=readRoute(),valid=navCategories.filter(function(item){return item.id===target;})[0];if(/(?:\?|&)gg_overlay=/.test(href)||!valid||target===routeSection)return;routeSection=target;if(target==='home'||target==='for-you')home(target,true);else browse(target,{fromRoute:true,route:target});}
    routeSection=readRoute();
    navCategories.forEach(function(type){var b=el('button','discovery-type',type.name);b.type='button';b.dataset.type=type.id;b.onclick=function(){clearTabFocusTimer();if(type.id==='home'||type.id==='for-you')home(type.id);else if(activeNav===type.id&&section===type.id){filtersVisible=!filtersVisible;var w=content.querySelector('.discovery-inline-filters');if(w)w.hidden=!filtersVisible;}else browse(type.id);};b.addEventListener('focus',function(){clearTabFocusTimer();tabFocusTimer=setTimeout(function(){tabFocusTimer=null;if(doc.activeElement!==b)return;if(type.id==='home'||type.id==='for-you'){if(activeNav!==type.id||section!=='home')home(type.id);}else if(activeNav!==type.id||section!==type.id)browse(type.id);},500);});b.addEventListener('blur',clearTabFocusTimer);tabs.appendChild(b);});
    tabs.appendChild(el('span','discovery-types-sep'));
    [['live','直播'],['search','搜索'],['favorites','收藏'],['push','推送'],['settings','设置'],['native','原生点播']].forEach(function(action){var button=el('button','discovery-type',action[1]);button.type='button';button.dataset.action=action[0];button.onclick=function(){if(typeof o.onQuickAction==='function')o.onQuickAction(action[0]);};tabs.appendChild(button);});
    tabs.appendChild(el('span','discovery-types-sep'));
    doc.defaultView.addEventListener('popstate',onRoutePop,false);
    content.addEventListener('keydown',function(e){
      if(e.key!=='ArrowDown')return;
      var a=doc.activeElement;
      if(!a||!a.classList||!a.classList.contains('discovery-card'))return;
      var grid=a.closest?a.closest('.discovery-grid'):null;
      if(!grid)return;
      var cards=grid.querySelectorAll('.discovery-card'),i,top=a.getBoundingClientRect().top,below=false;
      for(i=0;i<cards.length;i++){if(cards[i].getBoundingClientRect().top>top+1){below=true;break;}}
      if(below)return;
      var pg=content.querySelector('.discovery-paging');if(!pg)return;
      var btns=pg.querySelectorAll('button'),t=null,j;
      for(j=0;j<btns.length;j++){if(btns[j].disabled)continue;if(btns[j].textContent.indexOf('下一页')>=0){t=btns[j];break;}if(!t)t=btns[j];}
      if(t){e.preventDefault();t.focus();}
    });
    var detailObserver=null,preselectTimer=null,preselectDeadlineTimer=null,preselectDeadlinePassed=false,preselectLocked=false,panRendered={},mipanRendered={},qupanRendered={},lastCheckAt=0,checkRetryTimer=null;
    function close(){detailGen++;prefetchQueue.length=0;detailWallPic='';if(detailObserver){detailObserver.disconnect();detailObserver=null;}if(preselectTimer){clearTimeout(preselectTimer);preselectTimer=null;}if(preselectDeadlineTimer){clearTimeout(preselectDeadlineTimer);preselectDeadlineTimer=null;}preselectDeadlinePassed=false;preselectLocked=false;if(checkRetryTimer){clearTimeout(checkRetryTimer);checkRetryTimer=null;}clearImages(modal);modal.hidden=true;if(ref){ref.destroy();ref=null;}if(focusBack&&doc.documentElement.contains(focusBack))focusBack.focus();}
    function open(row){var g=++detailGen;panRendered={};mipanRendered={};qupanRendered={};focusBack=doc.activeElement;if(ref)ref.destroy();clearImages(modal);modal.textContent='';modal.hidden=false;
      var panel=el('div','discovery-detail'),closeBtn=el('button','discovery-close','× 关闭'),head=el('div','discovery-detail-head discovery-detail-hero'),poster=el('div','discovery-detail-poster'),copy=el('div','discovery-detail-copy');closeBtn.type='button';closeBtn.onclick=close;var heroCls=(root.GGCore&&typeof root.GGCore.heroClass==='function')?root.GGCore.heroClass(!!row.backdrop,!!row.image):(row.backdrop?'has-art':(row.image?'poster-only':''));
      if(heroCls)panel.classList.add(heroCls);
      var heroBackdrop=null;
      if(row.backdrop||row.image){heroBackdrop=image(row.backdrop||row.image,'discovery-detail-backdrop',true);heroBackdrop.alt='';panel.appendChild(heroBackdrop);}
      detailWallPic=row.backdrop||'';
      if(row.backdrop&&row.image&&row.backdrop!==row.image&&heroBackdrop){(function(img,posterUrl){var prev=img.onerror,failed=false,altTried=false;img.onerror=function(){if(!altTried&&row.backdrop&&row.backdrop.indexOf('://image.tmdb.org/')>=0){altTried=true;try{img.__ggImageUrl=row.backdrop.replace('://image.tmdb.org/','://images.tmdb.org/');}catch(e){}img.src=img.__ggImageUrl;if(typeof armImageTimeout==='function')armImageTimeout(img);return;}if(!failed){failed=true;try{img.__ggImageUrl=posterUrl;}catch(e){}img.src=o.imageSource(posterUrl);if(typeof armImageTimeout==='function')armImageTimeout(img);return;}if(typeof prev==='function')prev.call(img);};})(heroBackdrop,row.image);}panel.appendChild(el('div','discovery-detail-shade'));panel.appendChild(closeBtn);if(row.image)poster.appendChild(image(row.image,'discovery-detail-image',true));else poster.appendChild(el('span','discovery-no-image','暂无海报'));head.appendChild(poster);copy.appendChild(el('span','eyebrow','影片详情'));copy.appendChild(el('h2','',row.title));copy.appendChild(el('p','discovery-meta',[row.year,row.rating?'豆瓣 '+row.rating:''].filter(Boolean).join(' · ')));var synopsis=el('p','discovery-synopsis','正在读取简介…');copy.appendChild(synopsis);function toggleSynopsis(){return panel.classList.toggle('show-synopsis');}head.appendChild(copy);panel.appendChild(head);
      (function(){
        if(row.backdrop||typeof o.getTmdbKey!=='function')return;
        var key=o.getTmdbKey(); if(!key)return;
        var relayBase='https://tv.godroc.dpdns.org';
        var cacheKey=(row.title||'')+'|'+(row.year||'');
        var stillTimer=null;
        function stopStills(){if(stillTimer){clearTimeout(stillTimer);stillTimer=null;}}
        function sizeForScreen(){var w=0;try{w=(doc.defaultView&&doc.defaultView.innerWidth)||0;}catch(e){}return w&&w<=820?'w780':'w1280';}
        function backdropCandidates(path){
          var size=sizeForScreen(),cands=[],direct='',relay='';
          function push(u){if(u&&cands.indexOf(u)<0)cands.push(u);}
          if(root.GGCore&&typeof root.GGCore.tmdbBackdropUrl==='function')direct=root.GGCore.tmdbBackdropUrl(path,size);
          if(relayBase&&root.GGCore&&typeof root.GGCore.tmdbRelayImageUrl==='function')relay=root.GGCore.tmdbRelayImageUrl(relayBase,path,size);
          push(direct);
          if(direct.indexOf('://image.tmdb.org/')>=0)push(direct.replace('://image.tmdb.org/','://images.tmdb.org/'));
          if(relay)push(relay);
          if(typeof o.imageSource==='function'){try{push(o.imageSource(direct));}catch(e){}}
          if(relay&&typeof o.imageSource==='function'){try{push(o.imageSource(relay));}catch(e){}}
          return cands;
        }
        function preloadCandidates(cands,idx,done){
          if(idx>=cands.length){done(null,null);return;}
          var probe=doc.createElement('img');probe.referrerPolicy='no-referrer';var settled=false;
          var timer=setTimeout(function(){if(settled)return;settled=true;preloadCandidates(cands,idx+1,done);},8000);
          probe.onload=function(){if(settled)return;settled=true;clearTimeout(timer);done(cands[idx],probe);};
          probe.onerror=function(){if(settled)return;settled=true;clearTimeout(timer);preloadCandidates(cands,idx+1,done);};
          probe.src=cands[idx];
        }
        var retiredHeroes=[];
        function flushRetired(){var i,n;for(i=0;i<retiredHeroes.length;i++){n=retiredHeroes[i];if(n&&n.parentNode)n.parentNode.removeChild(n);}retiredHeroes=[];}
        function setHeroImage(probeImg,fade){
          if(!probeImg)return false;
          var old=heroBackdrop;
          flushRetired();
          probeImg.className='discovery-detail-backdrop';probeImg.alt='';
          try{if(old&&old.dataset&&old.dataset.ggStills)probeImg.dataset.ggStills=old.dataset.ggStills;}catch(e){}
          var shade=panel.querySelector('.discovery-detail-shade');
          if(shade)panel.insertBefore(probeImg,shade);else panel.insertBefore(probeImg,panel.firstChild);
          heroBackdrop=probeImg;
          try{detailWallPic=probeImg.src;}catch(e){}
          if(old&&old.parentNode){
            if(fade){probeImg.style.opacity='0';void probeImg.offsetWidth;probeImg.style.opacity='';retiredHeroes.push(old);setTimeout(function(){if(old.parentNode)old.parentNode.removeChild(old);var at=retiredHeroes.indexOf(old);if(at>=0)retiredHeroes.splice(at,1);},700);}
            else old.parentNode.removeChild(old);
          }
          panel.classList.remove('poster-only');panel.classList.add('has-art');
          return true;
        }
        function applyBackdrop(path){
          if(!path)return;
          var cands=backdropCandidates(path);
          if(!cands.length)return;
          preloadCandidates(cands,0,function(url,probe){
            if(g!==detailGen||modal.hidden)return;
            if(!url||!probe)return;
            setHeroImage(probe,!!heroBackdrop);
          });
        }
        function armSlideshow(stillPaths,currentPath){
          if(!stillPaths||stillPaths.length<2||!heroBackdrop)return;
          try{heroBackdrop.dataset.ggStills=String(stillPaths.length);}catch(e){}
          var start=0,i;
          if(currentPath){for(i=0;i<stillPaths.length;i++){if(stillPaths[i].slice(-currentPath.length)===currentPath){start=(i+1)%stillPaths.length;break;}}}
          stopStills();
          stillTimer=setTimeout(function(){showStill(stillPaths,start);},10000);
          function showStill(list,idx){
            if(g!==detailGen||modal.hidden||!heroBackdrop||!heroBackdrop.parentNode){stopStills();return;}
            var path=list[idx%list.length];
            preloadCandidates(backdropCandidates(path),0,function(url,probe){
              if(g!==detailGen||modal.hidden||!heroBackdrop||!heroBackdrop.parentNode){stopStills();return;}
              if(url&&probe)setHeroImage(probe,true);
              scheduleNext();
            });
            function scheduleNext(){
              stopStills();
              stillTimer=setTimeout(function(){
                if(g!==detailGen||modal.hidden){stopStills();return;}
                showStill(list,idx+1);
              },10000);
            }
          }
        }
        function fetchJson(url,preferRelay){
          if(typeof o.request!=='function')return Promise.reject(new Error('no request'));
          function parse(res){
            var body=res&&res.body;if(typeof body==='string'){try{body=JSON.parse(body);}catch(e){throw new Error('tmdb json');}}
            return body;
          }
          function attempt(u){return o.request(u,{}).then(parse);}
          if(preferRelay&&relayBase&&root.GGCore&&typeof root.GGCore.tmdbRelaySearchUrl==='function'){
            var rurl=root.GGCore.tmdbRelaySearchUrl(relayBase,url);
            return attempt(rurl).catch(function(){return attempt(url);});
          }
          return attempt(url).catch(function(){
            if(!relayBase||!root.GGCore||typeof root.GGCore.tmdbRelaySearchUrl!=='function')throw new Error('tmdb blocked');
            return attempt(root.GGCore.tmdbRelaySearchUrl(relayBase,url));
          });
        }
        var cached=tmdbCache[cacheKey];
        if(cached){
          if(typeof cached==='string'){applyBackdrop(cached);}
          else{applyBackdrop(cached.path);if(cached.stills&&cached.stills.length>=2)armSlideshow(cached.stills,cached.path);}
          return;
        }
        var searchUrl=(root.GGCore&&typeof root.GGCore.tmdbSearchUrl==='function')?root.GGCore.tmdbSearchUrl(key,row.title,row.year):'';
        if(!searchUrl)return;
        fetchJson(searchUrl,false).then(function(body){
          if(g!==detailGen)return null;
          var results=body&&Array.isArray(body.results)?body.results:[];
          var pick=(root.GGCore&&typeof root.GGCore.tmdbPickTitle==='function')?root.GGCore.tmdbPickTitle(results,row.title,row.year):null;
          if(!pick)return null;
          tmdbCache[cacheKey]={path:pick.path,id:pick.id,mediaType:pick.mediaType,stills:[]};
          applyBackdrop(pick.path);
          if(!pick.id||!pick.mediaType)return null;
          var imgUrl=(root.GGCore&&typeof root.GGCore.tmdbImagesUrl==='function')?root.GGCore.tmdbImagesUrl(key,pick.mediaType,pick.id):'';
          if(!imgUrl)return null;
          return fetchJson(imgUrl,false).then(function(imgBody){
            if(g!==detailGen)return;
            var paths=[],seen={},bds=(imgBody&&imgBody.backdrops)||[],i,p;
            for(i=0;i<bds.length&&paths.length<6;i++){p=bds[i]&&bds[i].file_path;if(p&&!seen[p]){seen[p]=true;paths.push(p);}}
            if(paths.length>=2){tmdbCache[cacheKey].stills=paths;armSlideshow(paths,pick.path);}
          });
        }).catch(function(){});
      })();
      var sources=el('section','discovery-sources'),sourcesHead=el('div','discovery-sources-heading'),allSources=el('button','primary discovery-all-sources','查看全部来源');allSources.type='button';allSources.onclick=function(){o.onNativeSearch(row.title,row);};var synopsisBtn=el('button','primary discovery-all-sources discovery-synopsis-btn','显示简介');synopsisBtn.type='button';synopsisBtn.onclick=function(){var show=toggleSynopsis();synopsisBtn.textContent=show?'隐藏简介':'显示简介';};sourcesHead.appendChild(el('h3','','播放源'));sourcesHead.appendChild(synopsisBtn);sourcesHead.appendChild(allSources);sources.appendChild(sourcesHead);var dotLegend=el('div','discovery-dot-legend');dotLegend.appendChild(el('span','','绿=检测有效 · 黄=需密码/登录 · 灰=待确认/未检测 · 红=已确认失效'));var recheckBtn=el('button','discovery-recheck-btn','重检');recheckBtn.type='button';recheckBtn.onclick=function(){manualRecheck();};dotLegend.appendChild(recheckBtn);sources.appendChild(dotLegend);var diskTabs=el('div','discovery-disk-tabs');diskTabs.hidden=true;sources.appendChild(diskTabs);var sourcesEmpty=el('p','discovery-sources-empty','暂未找到资源，可查看全部来源或调整搜索范围。');sourcesEmpty.hidden=true;sources.appendChild(sourcesEmpty);var diskNote=el('p','discovery-sources-note','');diskNote.hidden=true;sources.appendChild(diskNote);var sourcesProgress=el('p','discovery-sources-progress','');sourcesProgress.hidden=true;sources.appendChild(sourcesProgress);
      (function(){var a=allowedDisks();if(!a||!a.length)return;var all=Object.keys((root.GGCore&&root.GGCore.disks)||{});if(a.length>=all.length)return;var names=a.map(function(t){return (root.GGCore.disks[t]||t);});var only=(typeof o.getDisplayDisksOnly==='function')&&o.getDisplayDisksOnly();diskNote.textContent=(only?'当前仅显示：':'优先显示：')+names.join('、')+'（设置 → 优先显示网盘可调整）';diskNote.hidden=false;})();var refBox=el('div','discovery-reference-content');sources.appendChild(refBox);panel.appendChild(sources);modal.appendChild(panel);closeBtn.focus();
      var rowType=row.discoveryType||row.type||'movie',detailKind=(rowType==='tv'||rowType==='variety')?'tv':'movie',metaURL='https://m.douban.com/rexxar/api/v2/'+detailKind+'/'+encodeURIComponent(row.id);
      o.request(metaURL,{headers:{Referer:'https://m.douban.com/'}}).then(function(response){var body=response.body;if(typeof body==='string')body=JSON.parse(body);if(body&&body.intro)return body.intro;throw new Error('简介缺失');}).catch(function(){return data.detail(row.id,o.request).then(function(html){var d=new DOMParser().parseFromString(html,'text/html'),n=d.querySelector('#link-report [property="v:summary"], [property="v:summary"], #link-report');if(!n)throw new Error('简介缺失');return n.textContent.replace(/\s+/g,' ').trim();});}).then(function(text){if(g===detailGen)synopsis.textContent=text;},function(){if(g===detailGen)synopsis.textContent='简介暂不可用，下方找源继续进行。';});
      var refSeen={};
      ref=root.GGReferenceSearch.mount({container:refBox,providers:root.GGProviders,request:o.referenceRequest,hideForm:true,hideSites:true,autoResolve:true,directSharesOnly:true,expectedYear:row.year||'',imageSource:o.imageSource,shareFilter:function(share){if(!isAllowedDisk(diskKeyForShare(share)))return false;var u=share&&share.url;if(!u)return true;var k=(root.GGCore&&root.GGCore.dedupKey)?root.GGCore.dedupKey(u):u;if(refSeen[k])return false;refSeen[k]=true;return true;},onShare:function(share,source){share.note=source.title||row.title;share.image=row.image;share.wallPic=detailWallPic||'';o.onShare(share,source);},onNativeSearch:function(t){o.onNativeSearch(t,row);}});
      var refDone=false,checkInFlight=false,checkQueued=false,preselectedBtn=null,preselectFrozen=false,preselectFocusDone=false;
      var mipanToken='';
      function parseJsonBody(res){
        var body=res&&res.body;if(typeof body==='string'){try{body=JSON.parse(body);}catch(e){throw new Error('bad json');}}
        return body;
      }
      function fetchPanSelf(){
        if(typeof o.searchPanSelf==='function')return o.searchPanSelf(row.title);
        return Promise.resolve({rows:[],ms:0,error:'failed'});
      }
      function fetchPanPublic(){
        if(typeof o.searchPanPublic==='function')return o.searchPanPublic(row.title);
        return Promise.resolve({rows:[],ms:0,error:'failed'});
      }
      function fetchPanCombined(){
        return Promise.all([fetchPanSelf(),fetchPanPublic()]).then(function(parts){
          return {self:parts[0],pub:parts[1]};
        });
      }
      function fetchMipan(){
        if(typeof o.postRequest!=='function')return Promise.reject(new Error('no post'));
        function getToken(){
          if(mipanToken)return Promise.resolve(mipanToken);
          return o.postRequest('https://www.mipan.so/api/token',{method:'GET',headers:{'Accept':'application/json','Referer':'https://www.mipan.so/'},timeout:10}).then(function(res){
            var body=parseJsonBody(res);
            if(!body||!body.token)throw new Error('no token');
            mipanToken=body.token;return mipanToken;
          });
        }
        function searchOnce(token){
          return o.postRequest('https://www.mipan.so/api/search',{headers:{'Content-Type':'application/json','X-Mipan-Token':token,'Referer':'https://www.mipan.so/'},body:JSON.stringify({kw:row.title}),timeout:20}).then(function(res){
            var body=parseJsonBody(res);
            if(body&&typeof body.code==='number'&&body.code!==0&&body.code!==200)throw new Error('mipan code '+body.code);
            var data=body&&body.data?body.data:body,rows=[];
            if(data){
              if(data.merged_by_type)rows=(root.GGCore&&root.GGCore.normalize)?root.GGCore.normalize(data,'mipan'):[];
              else if(Array.isArray(data.results)){var grouped=(root.GGCore&&root.GGCore.groupResultsByDisk)?root.GGCore.groupResultsByDisk(data.results):{};rows=(root.GGCore&&root.GGCore.normalize)?root.GGCore.normalize({merged_by_type:grouped},'mipan'):[];}
            }
            return rows;
          });
        }
        return getToken().then(function(tok){
          return searchOnce(tok).catch(function(){mipanToken='';return getToken().then(searchOnce);});
        });
      }
      function fetchQupan(){
        if(typeof o.postRequest!=='function')return Promise.resolve({rows:[],error:'failed'});
        return o.postRequest('https://b.funletu.com/search',{headers:{'Content-Type':'application/json','Origin':'https://b.funletu.com','Referer':'https://b.funletu.com'},body:JSON.stringify({keyword:row.title,categoryid:0,filetypeid:1,courseid:1,page:1,pageSize:15,sortBy:'sort',order:'desc',offset:0}),timeout:20}).then(function(res){
          var body=parseJsonBody(res);
          if(!body||Number(body.code)!==200||!body.data||!Array.isArray(body.data.list))return {rows:[],error:'failed'};
          var grouped={},i,it,host,type,title;
          for(i=0;i<body.data.list.length;i++){
            it=body.data.list[i];if(!it||!it.url)continue;
            host='';try{host=new URL(it.url).hostname||'';}catch(e){}
            if(/pan\.quark\.cn$/i.test(host))type='quark';
            else if(/drive\.uc\.cn$/i.test(host))type='uc';
            else if(/pan\.baidu\.com$/i.test(host))type='baidu';
            else if(/aliyundrive\.com$/i.test(host)||/alipan\.com$/i.test(host))type='aliyun';
            else if(/115\.com$/i.test(host))type='115';
            else if(/pan\.xunlei\.com$/i.test(host))type='xunlei';
            else if(/123pan\.com$/i.test(host)||/123684\.com$/i.test(host)||/123912\.com$/i.test(host))type='123';
            else if(/cloud\.189\.cn$/i.test(host))type='tianyi';
            else if(/mypikpak\.com$/i.test(host))type='pikpak';
            else continue;
            title=String(it.title||'').replace(/<\/?em>/gi,'');
            (grouped[type]||(grouped[type]=[])).push({url:it.url,title:title,password:String(it.extcode||''),size:it.size||''});
          }
          var rows=(root.GGCore&&root.GGCore.normalize)?root.GGCore.normalize({merged_by_type:grouped},'qupan'):[];
          return {rows:rows};
        },function(){return {rows:[],error:'failed'};});
      }
      function buildPanSection(key,labelText,fetcher,sectionId,containerClass){
        var container=el('div',containerClass||'discovery-pan-section');container.hidden=true;if(sectionId)container.dataset.section=sectionId;
        var status=el('p','discovery-self-status',labelText+'正在搜索…');
        var tabs=el('div','discovery-disk-tabs');tabs.hidden=true;
        var results=el('div','discovery-self-results');
        container.appendChild(status);container.appendChild(tabs);container.appendChild(results);
        var loaded=false,loading=false,stashed=null,selected=null;
        var retryBtn=el('button','discovery-recheck-btn','重试');retryBtn.type='button';retryBtn.hidden=true;retryBtn.onclick=function(){retryBtn.hidden=true;loaded=false;loading=false;stashed=null;status.textContent=labelText+'正在搜索…';load();};
        container.insertBefore(retryBtn,tabs);
        function applyFilter(){
          var bs=tabs.querySelectorAll('.discovery-disk-tab'),i;
          for(i=0;i<bs.length;i++)bs[i].classList.toggle('active',bs[i].dataset.disk===selected);
          var secs=results.querySelectorAll('.discovery-self-group'),j;
          for(j=0;j<secs.length;j++)secs[j].style.display=(secs[j].dataset.disk===selected)?'':'none';
        }
        function runPanCheck(){
          ensureCheckMode().then(function(mode){
            if(g!==detailGen||modal.hidden||mode==='off')return;
            if(typeof o.checkLinks!=='function'&&typeof o.checkLinksOpen!=='function'&&typeof o.checkHost!=='function')return;
            var btns=results.querySelectorAll('.discovery-resource'),items=[],i,b,safe;
            for(i=0;i<btns.length&&items.length<40;i++){
              b=btns[i];safe=null;
              try{safe=root.GGCore.safeShare(b.__ggPanShare.url||'');}catch(e){}
              if(!safe)continue;
              items.push({button:b,url:safe.url,password:String(b.__ggPanShare.password||safe.password||'').slice(0,64),disk_type:safe.type});
            }
            if(!items.length)return;
            var caller=null;
            if(mode==='host'&&typeof o.checkHost==='function')caller=o.checkHost;
            else if(typeof o.checkLinks==='function')caller=o.checkLinks;
            else caller=o.checkLinksOpen;
            caller(items.map(function(it){return {url:it.url,password:it.password,disk_type:it.disk_type};})).then(function(states){
              items.forEach(function(it,idx){
                var st=states&&states[idx]||'unknown';
                it.button.dataset.ggCheck=st;
                var d=it.button.querySelector('.discovery-health-dot');
                if(d)d.setAttribute('data-state',(root.GGCore&&root.GGCore.healthDotState)?root.GGCore.healthDotState(st):'idle');
              });
            }).catch(function(){});
          });
        }
        function render(rows,ms){
          var order=(typeof o.getDiskOrder==='function')?o.getDiskOrder():null;
          var sorted=(root.GGCore&&root.GGCore.sortByDisk)?root.GGCore.sortByDisk(rows,order):rows;
          var ownSet=(key==='pan')?panRendered:(key==='qupan')?qupanRendered:mipanRendered;
          var otherSet=(key==='pan')?mipanRendered:panRendered;
          var seen={},uniq=[],i,r,k;
          for(i=0;i<sorted.length;i++){
            r=sorted[i];if(!r||!r.url)continue;
            k=(root.GGCore&&root.GGCore.dedupKey)?root.GGCore.dedupKey(r.url):r.url;
            if(seen[k])continue;
            if(otherSet[k])continue;
            seen[k]=true;ownSet[k]=true;uniq.push(r);
          }
          var gorder=[],gmap={};
          uniq.forEach(function(rr){var t=rr.type||'other';if(!gmap[t]){gmap[t]=[];gorder.push(t);}gmap[t].push(rr);});
          gorder.forEach(function(t){
            var decorated=gmap[t].map(function(rr,ix){return {r:rr,i:ix};});
            decorated.sort(function(a,b){var C=root.GGCore,ra=C&&C.resRank?C.resRank(a.r.title||''):3,rb=C&&C.resRank?C.resRank(b.r.title||''):3;return (ra-rb)||(a.i-b.i);});
            gmap[t]=decorated.map(function(x){return x.r;});
          });
          tabs.textContent='';tabs.hidden=!gorder.length;
          gorder.forEach(function(t){
            var b=el('button','discovery-disk-tab',(root.GGCore.disks[t]||t)+'（'+gmap[t].length+'）');
            b.type='button';b.dataset.disk=t;
            b.onclick=function(){selected=t;applyFilter();};
            tabs.appendChild(b);
          });
          results.textContent='';
          gorder.forEach(function(t){
            var sec=el('div','discovery-self-group');sec.dataset.disk=t;
            var head=el('div','discovery-self-group-head');head.textContent=(root.GGCore.disks[t]||t)+'（'+gmap[t].length+'）';sec.appendChild(head);
            var list=el('div','discovery-self-group-list');
            gmap[t].forEach(function(rr){
              var b=el('button','subbutton discovery-resource','');b.type='button';
              var dot=el('span','discovery-health-dot','');dot.setAttribute('data-state','idle');b.appendChild(dot);
              var body=el('div','discovery-resource-body');
              body.appendChild(el('span','discovery-resource-label',(root.GGCore.disks[t]||t)+'：'+(rr.title||rr.url)));
              if(root.GGCore&&typeof root.GGCore.qualityBadges==='function')root.GGCore.qualityBadges(rr.title||'').forEach(function(bd){body.appendChild(el('span','gg-quality-badge',bd));});
              body.appendChild(el('span','discovery-resource-url',rr.url||''));
              b.appendChild(body);
              b.__ggPanShare=rr;
              b.onclick=function(){o.onSelfRow({url:rr.url,title:rr.title,password:rr.password,type:rr.type,image:row.image||rr.image||'',wallPic:detailWallPic||'',discoveryType:row.discoveryType||row.type||'movie'});};
              list.appendChild(b);
            });
            sec.appendChild(list);results.appendChild(sec);
          });
          if(!gorder.length){status.textContent='暂无'+labelText+'资源';}
          else{
            status.textContent=labelText+'：'+uniq.length+' 条'+(typeof ms==='number'?' · '+(ms/1000).toFixed(1)+' 秒':'');
            if(!selected)selected=gorder[0];
            applyFilter();
            runPanCheck();
          }
        }
        function renderSectionData(data){
          if(data&&Array.isArray(data.rows)){
            if(data.error){
              if(data.error==='need-key'){status.textContent=labelText+'需要设备密钥（设置中填写后可用）';retryBtn.hidden=true;}
              else if(data.error==='timeout'){status.textContent=labelText+'请求超时（对方太慢，点重试再试一次）';retryBtn.hidden=false;}
              else if(data.error.indexOf('http-')===0){status.textContent=labelText+'对方拒绝了请求（可能限流，点重试再试一次）';retryBtn.hidden=false;}
              else{status.textContent=labelText+'暂不可用（点重试再试一次）';retryBtn.hidden=false;}
              return;
            }
            retryBtn.hidden=true;render(data.rows,data.ms);return;
          }
          retryBtn.hidden=true;render(data);
        }
        function load(){
          if(loaded)return;
          if(stashed){var data=stashed;stashed=null;loaded=true;renderSectionData(data);return;}
          if(loading)return;loading=true;
          fetcher().then(function(data){if(g!==detailGen)return;loading=false;loaded=true;renderSectionData(data);},function(err){if(g!==detailGen)return;loading=false;loaded=true;status.textContent=(err&&err.kind==='need-key')?labelText+'需要设备密钥（设置中填写后可用）':labelText+'暂不可用';});
        }
        function stash(rows){ if(loaded||loading)return; stashed=rows; }
        return {container:container,status:status,tabs:tabs,results:results,load:load,stash:stash,rerunCheck:runPanCheck};
      }
      var panSelfSec=buildPanSection('pan','盘搜自建',fetchPanSelf,'self','discovery-pan-section');
      var panPubSec=buildPanSection('pan','盘搜公共',fetchPanPublic,'pub','discovery-pan-section');
      panSelfSec.container.hidden=false;panPubSec.container.hidden=false;
      var panModeContainer=el('div','discovery-pan-mode');panModeContainer.hidden=true;
      panModeContainer.appendChild(panSelfSec.container);panModeContainer.appendChild(panPubSec.container);
      var panMode={container:panModeContainer,sections:[panSelfSec,panPubSec],load:function(){panSelfSec.load();panPubSec.load();},stash:function(combined){if(combined){panSelfSec.stash(combined.self);panPubSec.stash(combined.pub);}}};
      var mipanMode=buildPanSection('mipan','觅搜',fetchMipan,'mipan','discovery-pan-mode');
      var qupanMode=buildPanSection('qupan','趣盘',fetchQupan,'qupan','discovery-pan-mode');
      var resourceMode=el('div','discovery-resource-mode');
      [diskTabs,sourcesEmpty,diskNote,sourcesProgress,refBox].forEach(function(n){resourceMode.appendChild(n);});
      var modeTabs=el('div','discovery-mode-tabs');
      sources.appendChild(modeTabs);sources.appendChild(resourceMode);sources.appendChild(panMode.container);sources.appendChild(mipanMode.container);sources.appendChild(qupanMode.container);
      var modeBtns={};
      [['resource','资源'],['pan','盘搜'],['mipan','觅搜'],['qupan','趣盘']].forEach(function(pair){
        var b=el('button','discovery-mode-tab',pair[1]);b.type='button';b.dataset.mode=pair[0];
        b.onclick=function(){switchMode(pair[0]);};
        modeTabs.appendChild(b);modeBtns[pair[0]]=b;
      });
      function switchMode(key){
        Object.keys(modeBtns).forEach(function(k){modeBtns[k].classList.toggle('active',k===key);});
        resourceMode.hidden=(key!=='resource');
        panMode.container.hidden=(key!=='pan');
        mipanMode.container.hidden=(key!=='mipan');
        qupanMode.container.hidden=(key!=='qupan');
        if(g!==detailGen)return;
        if(key==='resource'){checkUnchecked();renderDiskTabs();}
        else if(key==='pan')panMode.load();
        else if(key==='mipan')mipanMode.load();
        else if(key==='qupan')qupanMode.load();
      }
      modeBtns['resource'].classList.add('active');
      resourceMode.hidden=false;panMode.container.hidden=true;mipanMode.container.hidden=true;qupanMode.container.hidden=true;
      (function prefetchPanModes(){
        var title=row.title,year=row.year||'',kind=rowType;
        function sig(){var order=(typeof o.getDiskOrder==='function')?o.getDiskOrder():[];var only=(typeof o.getDisplayDisksOnly==='function')&&o.getDisplayDisksOnly();var disks=(typeof o.getDisplayDisks==='function')?o.getDisplayDisks():[];return order.join(',')+'|'+(only?disks.join(','):'all');}
        function keyFor(src){return [title,year,kind,src,sig()].join('|');}
        function kick(mode,src,fetcher){
          var enabled=true;
          if(src==='pan'&&typeof o.getPrefetchPan==='function')enabled=!!o.getPrefetchPan();
          if(src==='mipan'&&typeof o.getPrefetchMipan==='function')enabled=!!o.getPrefetchMipan();
          if(!enabled)return;
          var key=keyFor(src),hit=prefetchCacheGet(key);
          if(hit){mode.stash(hit);return;}
          prefetchEnqueue({gen:g,run:function(){
            if(g!==detailGen)return Promise.resolve();
            return fetcher().then(function(rows){
              if(g!==detailGen)return;
              prefetchCachePut(key,rows);
              mode.stash(rows);
            },function(){});
          }});
        }
        kick(panMode,'pan',fetchPanCombined);
        kick(mipanMode,'mipan',fetchMipan);
      })();
      preselectDeadlinePassed=false;preselectLocked=false;
      if(preselectDeadlineTimer)clearTimeout(preselectDeadlineTimer);
      preselectDeadlineTimer=setTimeout(function(){
        if(g!==detailGen||modal.hidden)return;
        preselectDeadlinePassed=true;
        if(collectCandidates().length){runPreselect();preselectLocked=true;}
      },5000);
      function allowedDisks(){ return (typeof o.getDisplayDisks==='function')?o.getDisplayDisks():null; }
      function isAllowedDisk(type){ if(typeof o.getDisplayDisksOnly==='function'&&o.getDisplayDisksOnly()){ var a=allowedDisks(); return !a||a.indexOf(type)>=0; } return true; }
      function diskKeyForShare(share){ try{ var s=root.GGCore.safeShare(share.url||''); if(s&&s.type)return s.type; }catch(e){} var t=share.type||''; return (root.GGCore.disks&&root.GGCore.disks[t])?t:'other'; }
      function collectCandidates(){
        var list=[],i,btn;
        var refBtns=refBox.querySelectorAll('.ref-auto-share');
        for(i=0;i<refBtns.length;i++){ btn=refBtns[i]; if(btn.__ggShare&&btn.offsetParent!==null){ list.push({kind:'ref',share:btn.__ggShare,button:btn,order:list.length}); } }
        return list;
      }
      function checkItemsFor(cands){
        var items=[],i,c,safe;
        for(i=0;i<cands.length&&items.length<40;i++){
          c=cands[i]; if(c.button.dataset.ggChecked)continue; safe=null;
          try{ safe=root.GGCore.safeShare(c.kind==='self'?c.item.url||'':c.share.url||''); }catch(e){}
          if(!safe)continue;
          items.push({button:c.button,url:safe.url,password:String((c.kind==='self'?c.item.password:c.share.password)||safe.password||'').slice(0,64),disk_type:safe.type});
        }
        return items;
      }
      var checkMode='backend',checkModeReady=null;
      function ensureCheckMode(){
        if(checkModeReady)return checkModeReady;
        checkModeReady=Promise.resolve().then(function(){
          if(typeof o.getCheckMode!=='function')return 'backend';
          return o.getCheckMode();
        }).then(function(mode){
          checkMode=(mode==='host'||mode==='off')?mode:'backend';
          return checkMode;
        },function(){ checkMode='backend'; return checkMode; });
        return checkModeReady;
      }
      function manualRecheck(){
        var btns=[],i,b;
        var refBtns=refBox?refBox.querySelectorAll('.ref-auto-share'):[];
        for(i=0;i<refBtns.length;i++)btns.push(refBtns[i]);
        for(i=0;i<btns.length;i++){b=btns[i];try{delete b.dataset.ggChecked;delete b.dataset.ggCheck;}catch(e){}}
        lastCheckAt=0;checkQueued=false;
        paintHealthDots();checkUnchecked();
        [panMode,mipanMode,qupanMode].forEach(function(m){
          if(!m)return;
          var secs=m.sections||[m],si,s,pb,j,bb;
          for(si=0;si<secs.length;si++){s=secs[si];if(!s.results)continue;
            pb=s.results.querySelectorAll('.discovery-resource');
            for(j=0;j<pb.length;j++){bb=pb[j];try{delete bb.dataset.ggCheck;}catch(e){}var d=bb.querySelector('.discovery-health-dot');if(d)d.setAttribute('data-state','idle');}
            if(typeof s.rerunCheck==='function')s.rerunCheck();}
        });
      }
      function checkUnchecked(){
        if(typeof o.checkLinks!=='function'&&typeof o.checkHost!=='function')return;
        if(checkInFlight){checkQueued=true;return;}
        if(g!==detailGen||modal.hidden)return;
        var now=Date.now();
        if(now-lastCheckAt<4000){
          if(!checkRetryTimer){checkRetryTimer=setTimeout(function(){checkRetryTimer=null;checkUnchecked();},lastCheckAt+4000-now);}
          return;
        }
        ensureCheckMode().then(function(mode){
          if(g!==detailGen||modal.hidden)return;
          if(mode==='off')return;
          var items=checkItemsFor(collectCandidates());
          if(!items.length)return;
          checkInFlight=true;lastCheckAt=Date.now();
          var caller=(mode==='host'&&typeof o.checkHost==='function')?o.checkHost:o.checkLinks;
          caller(items).then(function(results){
            if(g===detailGen)items.forEach(function(it,i){ if(it.button&&doc.documentElement.contains(it.button)){it.button.dataset.ggCheck=results[i]||'unknown';it.button.dataset.ggChecked='1';} });
            checkInFlight=false; if(checkQueued){checkQueued=false;checkUnchecked();} else if(g===detailGen&&!modal.hidden){paintHealthDots();runPreselect();}
          },function(){ checkInFlight=false; if(checkQueued){checkQueued=false;checkUnchecked();} else if(g===detailGen&&!modal.hidden)runPreselect(); });
        });
      }
      function paintHealthDots(){
        var btns=[],i,b,dot,st;
        var refBtns=refBox?refBox.querySelectorAll('.ref-auto-share'):[];
        for(i=0;i<refBtns.length;i++)btns.push(refBtns[i]);
        for(i=0;i<btns.length;i++){ b=btns[i]; dot=b.querySelector('.discovery-health-dot'); if(!dot){dot=el('span','discovery-health-dot','');b.insertBefore(dot,b.firstChild);} st=(root.GGCore&&typeof root.GGCore.healthDotState==='function')?root.GGCore.healthDotState(b.dataset.ggCheck||''): 'idle'; dot.setAttribute('data-state',st); }
      }
      function sortRefShares(){var btns=refBox?refBox.querySelectorAll('.ref-auto-share'):[];if(!btns.length)return;var groups=[],i,j,b,p,g;for(i=0;i<btns.length;i++){b=btns[i];p=b.parentNode;if(!p)continue;g=null;for(j=0;j<groups.length;j++)if(groups[j].parent===p){g=groups[j];break;}if(!g){g={parent:p,items:[]};groups.push(g);}g.items.push({btn:b,check:b.dataset.ggCheck||'',rank:diskRank(diskKeyForShare(b.__ggShare||{})),index:i});}groups.forEach(function(g){if(g.parent.contains(doc.activeElement))return;var C=root.GGCore;g.items.sort(function(a,b2){var ha=C&&C.healthRank?C.healthRank(a.check):3,hb=C&&C.healthRank?C.healthRank(b2.check):3;if(ha!==hb)return ha-hb;if(a.rank!==b2.rank)return a.rank-b2.rank;return a.index-b2.index;});g.items.forEach(function(it){g.parent.appendChild(it.btn);});});}

      var detailDisk=null,detailDiskAuto=true,lastTabSig='';
      function refDiskCounts(){var counts={},btns=refBox?refBox.querySelectorAll('.ref-auto-share'):[];for(var i=0;i<btns.length;i++){var t=diskKeyForShare(btns[i].__ggShare||{});counts[t]=(counts[t]||0)+1;}return counts;}
      function renderDiskTabs(){
        var order=typeof o.getDiskOrder==='function'?o.getDiskOrder():[];
        var tabs=(root.GGCore&&typeof root.GGCore.diskTabList==='function')?root.GGCore.diskTabList({},refDiskCounts(),order):[];
        if(detailDiskAuto&&!preselectFrozen&&tabs.length)detailDisk=tabs[0].type;
        if(detailDisk&&!tabs.some(function(t){return t.type===detailDisk;}))detailDisk=tabs.length?tabs[0].type:null;
        var sig=tabs.map(function(t){return t.type+':'+t.self+':'+t.ref;}).join('|')+'#'+(detailDisk||'');
        if(sig===lastTabSig)return;lastTabSig=sig;
        var focusedDisk=(doc.activeElement&&doc.activeElement.classList&&doc.activeElement.classList.contains('discovery-disk-tab'))?doc.activeElement.dataset.disk:null;
        diskTabs.textContent='';
        if(!tabs.length){diskTabs.hidden=true;return;}
        diskTabs.hidden=false;
        tabs.forEach(function(t){
          var b=el('button','discovery-disk-tab',(root.GGCore.disks[t.type]||t.type)+' '+t.total);b.type='button';b.dataset.disk=t.type;
          if(t.type===detailDisk)b.classList.add('active');
          b.setAttribute('aria-pressed',String(t.type===detailDisk));
          b.onclick=function(){detailDisk=t.type;detailDiskAuto=false;lastTabSig='';renderDiskTabs();};
          diskTabs.appendChild(b);
        });
        if(focusedDisk){ var tabBtns=diskTabs.querySelectorAll('.discovery-disk-tab'); for(var ti=0;ti<tabBtns.length;ti++)if(tabBtns[ti].dataset.disk===focusedDisk){ try{tabBtns[ti].focus();}catch(e){} break; } }
        applyDetailDiskFilter();
      }
      function applyDetailDiskFilter(){
        var btns=refBox?refBox.querySelectorAll('.ref-auto-share'):[];for(var i=0;i<btns.length;i++){var b=btns[i];b.style.display=(!detailDisk||diskKeyForShare(b.__ggShare||{})===detailDisk)?'':'none';}
        var sections=refBox?refBox.querySelectorAll('.ref-site-state'):[];for(var j=0;j<sections.length;j++){var shares=sections[j].querySelectorAll('.ref-auto-share'),any=false;for(var k=0;k<shares.length;k++)if(shares[k].style.display!=='none'){any=true;break;}if(shares.length)sections[j].style.display=any?'':'none';}
      }
      function updateSourcesProgress(){
        var refCount=refBox?refBox.querySelectorAll('.ref-auto-share').length:0;
        if(!refCount){sourcesProgress.hidden=true;return;}
        sourcesProgress.textContent='已找到 '+refCount+' 条（参考 '+refCount+'）'+(!refDone?'，还在查…':'');
        sourcesProgress.hidden=false;
      }
      function updateSourcesHint(){
        if(refDone&&!collectCandidates().length)sourcesEmpty.hidden=false;
        else sourcesEmpty.hidden=true;
      }
      function moveBadge(oldBtn,newBtn){
        if(oldBtn&&doc.documentElement.contains(oldBtn)){oldBtn.classList.remove('is-preselected');var old=oldBtn.querySelector('.discovery-preselect-badge,.ref-preselect-badge');if(old&&old.parentNode)old.parentNode.removeChild(old);}
        newBtn.classList.add('is-preselected');
        if(newBtn.classList.contains('discovery-resource')){ if(!newBtn.querySelector('.discovery-preselect-badge'))newBtn.appendChild(el('span','discovery-preselect-badge','预选')); }
        else if(!newBtn.querySelector('.ref-preselect-badge'))newBtn.appendChild(el('span','ref-preselect-badge','预选'));
      }
      function runPreselect(){
        if(g!==detailGen||modal.hidden||preselectFrozen)return;
        var active=doc.activeElement;
        if(active&&modal.contains(active)&&active!==closeBtn&&active!==modal&&active!==preselectedBtn){preselectFrozen=true;return;}
        var cands=collectCandidates();
        if(!cands.length){updateSourcesHint();return;}
        var ranked=cands.map(function(c){ var type=c.kind==='self'?c.item.type:diskKeyForShare(c.share); return {ok:c.button.dataset.ggCheck==='ok',check:c.button.dataset.ggCheck||'',verifiedClarity:null,rank:diskRank(type),order:c.order,button:c.button}; });
        var bestIdx=(root.GGCore&&typeof root.GGCore.rankPreselect==='function')?root.GGCore.rankPreselect(ranked):(ranked.length?0:-1);
        if(bestIdx<0)return;
        var btn=ranked[bestIdx].button;
        if(!btn||!doc.documentElement.contains(btn))return;
        if(preselectedBtn&&doc.activeElement===preselectedBtn&&preselectedBtn.dataset.ggCheck==='bad'&&ranked[bestIdx].check!=='bad'&&btn!==preselectedBtn){
          moveBadge(preselectedBtn,btn);preselectedBtn=btn;
          try{btn.focus();}catch(e){} try{btn.scrollIntoView({block:'nearest',inline:'nearest'});}catch(e2){ try{btn.scrollIntoView(false);}catch(e3){} }
          updateSourcesHint();return;
        }
        if(preselectLocked)return;
        if(btn!==preselectedBtn&&!preselectFocusDone){ moveBadge(preselectedBtn,btn); preselectedBtn=btn; }
        var now=doc.activeElement;
        if(!preselectFocusDone&&(now===closeBtn||now===modal||now===doc.body)){ try{btn.focus();}catch(e){} try{btn.scrollIntoView({block:'nearest',inline:'nearest'});}catch(e2){ try{btn.scrollIntoView(false);}catch(e3){} } preselectFocusDone=true; }
        if(preselectDeadlinePassed)preselectLocked=true;
        updateSourcesHint();
      }
      function schedulePreselect(){
        if(g!==detailGen||modal.hidden)return;
        if(preselectTimer)clearTimeout(preselectTimer);
        preselectTimer=setTimeout(function(){ if(g!==detailGen||modal.hidden)return; var beforeFocus=doc.activeElement; sortRefShares(); renderDiskTabs(); runPreselect(); updateSourcesProgress(); paintHealthDots(); checkUnchecked(); if(doc.activeElement===doc.body&&beforeFocus&&beforeFocus!==doc.body&&doc.documentElement.contains(beforeFocus)){ var vis=true; try{vis=beforeFocus.offsetParent!==null;}catch(e){} if(vis){ try{beforeFocus.focus();}catch(e2){} } } },150);
      }
      var refPromise=ref.search(row.title);
      refPromise.then(function(){ if(g===detailGen){refDone=true;schedulePreselect();} },function(){ if(g===detailGen){refDone=true;schedulePreselect();} });
      if(typeof doc.defaultView.MutationObserver==='function'){
        detailObserver=new doc.defaultView.MutationObserver(function(){ schedulePreselect(); });
        detailObserver.observe(refBox,{childList:true,subtree:true});
      }
      schedulePreselect();
      function diskRank(type){var order=typeof o.getDiskOrder==='function'?o.getDiskOrder():(Array.isArray(o.diskOrder)?o.diskOrder:[]),index;if(!Array.isArray(order))order=[];index=order.indexOf(type);return index<0?999:index;}
    }
    modal.onclick=function(e){if(e.target===modal)close();};
    function key(e){var k=e.key||({4:'Escape'}[e.keyCode]);if(k==='Escape'||k==='BrowserBack'||k==='GoBack'){if(historyEdit){e.preventDefault();e.stopImmediatePropagation();exitHistoryEdit();return;}if(!modal.hidden){e.preventDefault();e.stopImmediatePropagation();close();}}}
    doc.addEventListener('keydown',key,true);
    function show(){o.container.hidden=false;if(!loadedHome){if(routeSection==='home'||routeSection==='for-you')home(routeSection,true);else browse(routeSection,{fromRoute:true,route:routeSection});}}
    function hide(){o.container.hidden=true;}
    function inspect(){return {section:section,page:page,count:rows.length,filters:filters,detailOpen:!modal.hidden,railCount:content.querySelectorAll('.discovery-rail').length};}
    if(routeSection==='home'||routeSection==='for-you')home(routeSection,true);else browse(routeSection,{fromRoute:true,route:routeSection});
    return {show:show,hide:hide,home:home,browse:browse,refreshHistory:refreshHistory,open:open,load:function(){return section==='home'?home():loadBrowse();},inspect:inspect,destroy:function(){close();clearImages(content);if(imageObserver){imageObserver.disconnect();imageObserver=null;}gen++;historyRequestId++;doc.removeEventListener('keydown',key,true);doc.removeEventListener('focusin',syncTopbar,false);doc.body.classList.remove('gg-topbar-collapsed');doc.defaultView.removeEventListener('popstate',onRoutePop,false);box.remove();modal.remove();}};
  }
  root.GGDiscovery={mount:mount};
}(this));





