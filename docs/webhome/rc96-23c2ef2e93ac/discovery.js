(function (root) {
  'use strict';
  function mount(o) {
    var doc=o.container.ownerDocument, data=root.GGDiscoveryData, gen=0, detailGen=0, detailScope=null, page=1, loadedHome=false, rows=[], focusBack=null, ref=null, imageObserver=null, browseInFlight=null, browseCache=Object.create(null), browseCacheKeys=[];
    var nativeSelections={movie:{},tv:{}}, filters={type:'movie',genre:'',region:'',year:'',sort:'T'}, section='home', activeNav='home', routeSection='home', filteredBrowse=false, filtersVisible=false, routeToken='ggs-'+new Date().getTime()+'-'+Math.floor(Math.random()*1000000000), routeOrigin=doc.defaultView.location.protocol+'//'+doc.defaultView.location.host, choices=data.filters(), renderedRailIds={},historyRequestId=0,historyScope=null;
    try { var saved=JSON.parse(localStorage.getItem('gg.discovery.filters')||'{}'); Object.keys(filters).forEach(function(k){if(typeof saved[k]==='string'&&k!=='type')filters[k]=saved[k];}); } catch(e) {}
    function el(tag,cls,text){var n=doc.createElement(tag);n.className=cls||'';if(text!==undefined&&text!==null)n.textContent=text;return n;}
    var box=el('section','discovery'),tabs=el('div','discovery-types'),content=el('div','discovery-content');
    tabs.hidden=false;
    box.appendChild(tabs);box.appendChild(content);o.container.appendChild(box);
    var routeReplace=false;
    function syncTopbar(){var a=doc.activeElement,top=doc.querySelector('.topbar');if(!a)return;if(content.contains(a))doc.body.classList.add('gg-topbar-collapsed');else if(!a.closest||!a.closest('.modal[role="dialog"],.discovery-modal[role="dialog"],.ref-dialog[role="dialog"]'))doc.body.classList.remove('gg-topbar-collapsed');}
    // RC71: webpage chrome has a single owner in GGChrome; do not hide it independently.
    var modal=el('section','discovery-modal');modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','影片详情与找源');doc.body.appendChild(modal);
    function save(){try{localStorage.setItem('gg.discovery.filters',JSON.stringify(filters));}catch(e){}}
    function sectionChange(value){section=value;if(typeof o.onSectionChange==='function')o.onSectionChange(value);}
    function routeUrl(value){var href=doc.defaultView.location.href,hashAt=href.indexOf('#'),hash=hashAt<0?'':href.slice(hashAt),base=hashAt<0?href:href.slice(0,hashAt),queryAt=base.indexOf('?'),path=queryAt<0?base:base.slice(0,queryAt),parts=queryAt<0?[]:base.slice(queryAt+1).split('&'),kept=[],i,key;for(i=0;i<parts.length;i++){key=parts[i].split('=')[0];if(key!=='gg_section')kept.push(parts[i]);}if(value&&value!=='home')kept.push('gg_section='+encodeURIComponent(value));return path+(kept.length?'?'+kept.join('&'):'')+hash;}
    function routeState(value){var current=doc.defaultView.history.state,state={},key;if(current&&typeof current==='object')for(key in current)if(Object.prototype.hasOwnProperty.call(current,key))state[key]=current[key];state.ggSectionHistoryOwner=routeToken;state.ggSection=value;return state;}
    function readRoute(){var match=/(?:\?|&)gg_section=([^&#]*)/.exec(doc.defaultView.location.href);if(!match)return 'home';try{return decodeURIComponent(match[1]);}catch(e){return 'home';}}
    function setRoute(value,push){var win=doc.defaultView,origin=win.location.protocol+'//'+win.location.host;if(origin!==routeOrigin)return;if(value===routeSection)return;if(push)try{if(routeReplace)win.history.replaceState(routeState(value),'',routeUrl(value));else win.history.pushState(routeState(value),'',routeUrl(value));}catch(e){return;}routeSection=value;}
    function activeType(){Array.prototype.forEach.call(tabs.children,function(b){b.classList.toggle('active',b.dataset.type===activeNav);b.setAttribute('aria-pressed',String(b.dataset.type===activeNav));});}
    function normalizedImageUrl(url){if(/https:\/\/img\d+\.doubanio\.com\//.test(url||''))return url.replace(/https:\/\/img\d+\.doubanio\.com\//,'https://img2.doubanio.com/');return url;}
    function armImageTimeout(img){if(img.__ggImgTimer){clearTimeout(img.__ggImgTimer);}img.__ggImgTimer=setTimeout(function(){img.__ggImgTimer=null;if(img.__ggDead)return;try{if(img.complete&&img.naturalWidth>0)return;}catch(e){}if(typeof img.onerror==='function')img.onerror();},8000);}
    function loadImage(img){var url=img.getAttribute('data-gg-src');if(!url)return;if(imageObserver)imageObserver.unobserve(img);img.removeAttribute('data-gg-src');img.__ggImageUrl=url;img.src=o.imageSource(url);armImageTimeout(img);}
    function clearImages(container){if(!container)return;if(imageObserver){var pending=container.querySelectorAll('img[data-gg-src]');for(var i=0;i<pending.length;i++)imageObserver.unobserve(pending[i]);}var images=container.querySelectorAll('img');for(var j=0;j<images.length;j++){var im=images[j];if(im.__ggImgTimer){clearTimeout(im.__ggImgTimer);im.__ggImgTimer=null;}im.__ggDead=true;im.onerror=null;im.onload=null;im.removeAttribute('data-gg-src');im.removeAttribute('src');}}
    if(typeof doc.defaultView.IntersectionObserver==='function')imageObserver=new doc.defaultView.IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting||entry.intersectionRatio>0)loadImage(entry.target);});},{root:null,rootMargin:'400px 400px',threshold:0});
    function image(url,cls,priority){var img=el('img',cls),attempt=0;url=normalizedImageUrl(url);img.alt='';img.referrerPolicy='no-referrer';img.onerror=function(){if(img.__ggDead)return;if(img.__ggImgTimer){clearTimeout(img.__ggImgTimer);img.__ggImgTimer=null;}var current=img.__ggImageUrl||url;if(attempt===0&&current.indexOf('://image.tmdb.org/')>=0){attempt++;current=current.replace('://image.tmdb.org/','://images.tmdb.org/');img.__ggImageUrl=current;img.src=current;armImageTimeout(img);return;}if(attempt===0&&/https:\/\/img2\.doubanio\.com\//.test(current)){attempt++;current=current.replace('https://img2.','https://img1.');img.__ggImageUrl=current;img.src=o.imageSource(current);armImageTimeout(img);return;}img.hidden=true;var fallback=el('span','discovery-no-image','海报暂不可用');if(img.parentNode&&!img.parentNode.querySelector('.discovery-no-image'))img.parentNode.appendChild(fallback);};img.onload=function(){if(img.__ggImgTimer){clearTimeout(img.__ggImgTimer);img.__ggImgTimer=null;}};if(priority||!imageObserver){img.src=o.imageSource(url);armImageTimeout(img);}else{img.setAttribute('data-gg-src',url);imageObserver.observe(img);}return img;}
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
    function enterHistoryEdit(){historyEdit=true;var rail=historyRail();if(rail){rail.classList.add('discovery-edit-mode');rail.setAttribute('data-gg-back-layer','history-edit');}doc.dispatchEvent(new Event('gg-back-layer-change'));}
    function exitHistoryEdit(){historyEdit=false;var rail=historyRail();if(rail){rail.classList.remove('discovery-edit-mode');rail.removeAttribute('data-gg-back-layer');}doc.dispatchEvent(new Event('gg-back-layer-change'));}
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
    function card(row,type){var b=el('button','discovery-card'),poster=el('div','discovery-poster');b.type='button';b.dataset.id=row.id||'';if(row.image)poster.appendChild(image(row.image,'discovery-image'));else poster.appendChild(el('span','discovery-no-image','暂无海报'));if(row.rating)poster.appendChild(el('span','discovery-rating','★ '+row.rating));b.appendChild(poster);var copy=el('div','gg-poster-copy');copy.appendChild(el('span','discovery-title',row.title));if(row.year)copy.appendChild(el('small','discovery-year',String(row.year)));b.appendChild(copy);
      if(row.history){
        poster.appendChild(el('span','discovery-delete-badge','×'));
        if(row.source)poster.appendChild(el('span','discovery-source-badge',row.source));
        b.setAttribute('data-gg-longpress','history');
        b.addEventListener('gg-longpress',function(){ enterHistoryEdit(); },false);
        b.addEventListener('contextmenu',function(e){if(e&&e.preventDefault)e.preventDefault();enterHistoryEdit();},false);
      }
      b.onclick=function(){ if(row.history&&historyEdit){ deleteHistory(b,row); return; } var item=typedRow(row,type);if(row.history&&typeof o.onHistory==='function')o.onHistory(row);else open(item);};return b;}
    function renderRail(rail){var id=String(rail&&rail.id||rail&&rail.title||('rail-'+Object.keys(renderedRailIds).length)),existing=null,nodes,i;if(renderedRailIds[id])return;renderedRailIds[id]=true;nodes=content.querySelectorAll('.discovery-rail');for(i=0;i<nodes.length;i++)if(nodes[i].dataset.rail===id){existing=nodes[i];break;}var node=el('section','discovery-rail'),head=el('div','discovery-rail-heading'),track=el('div','discovery-rail-track');node.dataset.rail=id;head.appendChild(el('h2','',rail&&rail.title||'豆瓣推荐'));node.appendChild(head);if(rail&&rail.error||!rail||!rail.items||!rail.items.length){var message=el('p','discovery-rail-error',rail&&rail.error?'暂时无法读取：'+rail.error:'暂时没有可显示的推荐');var retry=el('button','subbutton discovery-rail-retry','重试');retry.type='button';retry.onclick=function(){retry.disabled=true;message.textContent='正在重试…';delete renderedRailIds[id];var got=false;function update(next){if(!next||String(next.id||next.title)!==id)return;got=true;delete renderedRailIds[id];renderRail(next);}if(id==='douban-recommend'&&typeof data.mixedRecommend==='function')Promise.resolve(data.mixedRecommend(o.request)).then(function(next){if(next)update(next);else{message.textContent='重试失败，请稍后再试。';retry.disabled=false;}},function(){message.textContent='重试失败，请稍后再试。';retry.disabled=false;});else if(typeof data.recommendations==='function')Promise.resolve(data.recommendations(o.request,update)).then(function(list){if(!got&&Array.isArray(list))list.forEach(update);},function(){message.textContent='重试失败，请稍后再试。';retry.disabled=false;});else retry.disabled=false;};node.appendChild(message);node.appendChild(retry);}else{rail.items.forEach(function(item){track.appendChild(card(item,rail.type||item.discoveryType||item.type||'movie'));});node.appendChild(track);}if(existing&&existing.parentNode)existing.parentNode.replaceChild(node,existing);else if(id==='recently-watched'){var firstRail=content.querySelector('.discovery-rail');if(firstRail)content.insertBefore(node,firstRail);else content.appendChild(node);}else if(id==='douban-recommend'){var fyRail=content.querySelector('.discovery-rail[data-rail="for-you"]');if(fyRail)content.insertBefore(node,fyRail);else content.appendChild(node);}else content.appendChild(node);}
    function historyRail(){return content.querySelector('.discovery-rail[data-rail="recently-watched"]');}
    function renderHistory(items,state,scope){
      var previous=historyRail(),active=doc.activeElement,hadFocus=!!(previous&&previous.contains(active)),focusId=hadFocus&&active.dataset?active.dataset.id:'',oldTrack=previous&&previous.querySelector('.discovery-rail-track'),oldCards=oldTrack?oldTrack.querySelectorAll('.discovery-card'):[],focusIndex=Array.prototype.indexOf.call(oldCards,active),left=oldTrack?oldTrack.scrollLeft:0,scrollY=doc.defaultView.pageYOffset,signature=JSON.stringify([scope,state,items.map(function(row){return [row.id,row.title,row.image,JSON.stringify(row.history||null)];})]);
      if(previous&&previous.__historySignature===signature){var oldNotice=previous.querySelector('.history-refresh-error');if(oldNotice)oldNotice.remove();return;}
      var node=el('section','discovery-rail'),head=el('div','discovery-rail-heading');node.dataset.rail='recently-watched';node.__historySignature=signature;head.appendChild(el('h2','','最近观看'));node.appendChild(head);
      if(items.length){var track=el('div','discovery-rail-track');items.forEach(function(row){track.appendChild(card(row,'movie'));});node.appendChild(track);track.scrollLeft=left;}
      else{node.appendChild(el('p','discovery-rail-error',state==='loading'?'正在读取观看记录…':state==='error'?'暂时无法读取观看记录，请重试。':'当前点播配置暂无观看记录。'));if(state==='error'){var retry=el('button','subbutton discovery-rail-retry','重试');retry.type='button';retry.onclick=refreshHistory;node.appendChild(retry);}}
      if(historyEdit){node.classList.add('discovery-edit-mode');node.setAttribute('data-gg-back-layer','history-edit');}
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
    function home(nav,fromRoute){if(browseCleanup){browseCleanup();browseCleanup=null;}if(browseSentinelObserver){browseSentinelObserver.disconnect();browseSentinelObserver=null;}var nextNav=nav||'home';if(loadedHome&&section==='home'&&(activeNav===nextNav||((activeNav==='home'||activeNav==='for-you')&&(nextNav==='home'||nextNav==='for-you')))){activeNav=nextNav;if(fromRoute)routeSection=activeNav;else setRoute(activeNav,true);sectionChange('home');activeType();return Promise.resolve();}gen++;browseInFlight=null;pendingFilterFocus=null;pendingPageFocus=false;loadedHome=true;activeNav=nextNav;if(fromRoute)routeSection=activeNav;else setRoute(activeNav,true);sectionChange('home');activeType();filteredBrowse=false;page=1;clearImages(content);content.textContent='';renderedRailIds={};var status=el('p','discovery-status','正在整理豆瓣推荐…');content.appendChild(status);var generation=gen;var seenHomeIds={};
      var skel=el('div','discovery-skeleton-rail'),skelTrack=el('div','discovery-rail-track');
      for(var si=0;si<6;si++){var sc=el('div','discovery-card discovery-skeleton');sc.appendChild(el('div','discovery-poster'));sc.appendChild(el('span','discovery-skeleton-title'));skelTrack.appendChild(sc);}
      skel.appendChild(skelTrack);content.appendChild(skel);
      function clearSkeletons(){var nodes=content.querySelectorAll('.discovery-skeleton-rail');for(var i=0;i<nodes.length;i++)if(nodes[i].parentNode)nodes[i].parentNode.removeChild(nodes[i]);}
      refreshHistory();
      function gotRail(rail){if(generation!==gen||section!=='home')return;if(rail&&rail.id==='for-you')return;if(rail&&Array.isArray(rail.items)){rail.items=rail.items.filter(function(it){var id=it&&it.id;if(!id)return true;if(seenHomeIds[id])return false;seenHomeIds[id]=true;return true;});if(!rail.items.length&&!rail.error)return;}clearSkeletons();renderRail(rail);if(content.querySelector('.discovery-rail'))status.remove();}
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
    var pendingFilterFocus=null,pendingPageFocus=false;
    function focusFilterChoice(choice){var buttons=content.querySelectorAll('.discovery-inline-filters .discovery-filter-chip'),i,b;if(choice){for(i=0;i<buttons.length;i++){b=buttons[i];if(b.dataset.group===choice.group&&b.dataset.value===choice.value){try{b.focus();if(b.scrollIntoView)b.scrollIntoView({block:'nearest',inline:'nearest'});}catch(e){}return true;}}}if(buttons.length){try{buttons[0].focus();if(buttons[0].scrollIntoView)buttons[0].scrollIntoView({block:'nearest',inline:'nearest'});}catch(e2){}return true;}return false;}
    function renderInlineFilters(){var kind=filters.type==='tv'?'tv':'movie',groups=data.nativeFilters(kind),current=nativeSelections[kind]||{},wrap=el('div','discovery-inline-filters');groups.forEach(function(group){var row=el('div','discovery-filter-row'),lab=el('span','discovery-filter-label',group.name),opts=el('div','discovery-filter-options');row.appendChild(lab);group.value.forEach(function(item){var b=el('button','discovery-filter-chip',item.n);b.type='button';b.dataset.group=group.key;b.dataset.value=item.v;var cur=current[group.key];if(cur===undefined)cur=group.value[0].v;if(cur===item.v)b.classList.add('active');b.setAttribute('aria-pressed',String(cur===item.v));b.onclick=function(){applyInlineFilter(kind,group.key,item.v);};opts.appendChild(b);});row.appendChild(opts);wrap.appendChild(row);});var anyActive=groups.some(function(group){var cur=current[group.key];return cur!==undefined&&cur!==group.value[0].v;});if(anyActive||filteredBrowse){var reset=el('button','subbutton discovery-filter-reset','重置筛选');reset.type='button';reset.onclick=function(){nativeSelections[kind]={};filteredBrowse=/-filter$/.test(activeNav);page=1;pendingFilterFocus={};pendingPageFocus=false;loadBrowse();};wrap.appendChild(reset);}wrap.hidden=!filtersVisible;content.appendChild(wrap);if(pendingFilterFocus)focusFilterChoice(pendingFilterFocus);}
    function applyInlineFilter(kind,groupKey,value){var current=nativeSelections[kind]||{};current[groupKey]=value;nativeSelections[kind]=current;var groups=data.nativeFilters(kind),allDefault=groups.every(function(group){var cur=current[group.key];return cur===undefined||cur===group.value[0].v;});filteredBrowse=!allDefault||/-filter$/.test(activeNav);page=1;pendingFilterFocus={group:groupKey,value:value};pendingPageFocus=false;loadBrowse();focusFilterChoice(pendingFilterFocus);}
    function getBrowseCache(key){var entry=browseCache[key];if(!entry)return null;if(Date.now()-entry.time>120000){delete browseCache[key];var at=browseCacheKeys.indexOf(key);if(at>=0)browseCacheKeys.splice(at,1);return null;}return entry.result;}
    function putBrowseCache(key,result){if(!browseCache[key])browseCacheKeys.push(key);browseCache[key]={time:Date.now(),result:{items:(result.items||[]).slice(),hasMore:!!result.hasMore}};while(browseCacheKeys.length>24){delete browseCache[browseCacheKeys.shift()];}}
    var browseMore=null,browseSentinelObserver=null,browseCleanup=null,browseMove=null;
    function loadBrowse(){
      var g=++gen;loadedHome=true;page=1;if(browseCleanup){browseCleanup();browseCleanup=null;}if(browseSentinelObserver){browseSentinelObserver.disconnect();browseSentinelObserver=null;}clearImages(content);content.textContent='';renderBrowseHeader();renderInlineFilters();
      var status=el('p','discovery-status','正在读取豆瓣片单…'),grid=el('div','discovery-grid'),sentinel=el('div','discovery-browse-sentinel');sentinel.setAttribute('aria-hidden','true');var topSpace=el('div','discovery-window-space'),bottomSpace=el('div','discovery-window-space');topSpace.setAttribute('aria-hidden','true');bottomSpace.setAttribute('aria-hidden','true');content.appendChild(status);content.appendChild(topSpace);content.appendChild(grid);content.appendChild(bottomSpace);content.appendChild(sentinel);
      var loading=false,hasMore=true,seen=Object.create(null),kind=filters.type,selection=Object.assign({},nativeSelections[kind]||{}),isFiltered=filteredBrowse,category=section;
      var start=0,end=0,columns=1,rowHeight=280,frame=null,windowSize=72;
      function measure(){var styles=root.getComputedStyle(grid),cols=styles.gridTemplateColumns;columns=Math.max(1,cols&&cols!=='none'?cols.split(' ').length:1);var cards=grid.querySelectorAll('.discovery-card');if(cards.length>columns){var delta=cards[columns].offsetTop-cards[0].offsetTop;if(delta>0)rowHeight=delta;}else if(cards.length){var h=cards[0].getBoundingClientRect().height+parseFloat(styles.rowGap||styles.gap||0);if(h>0)rowHeight=h;}}
      function renderWindow(target){if(g!==gen)return;measure();var cap=Math.max(columns,Math.floor(windowSize/columns)*columns),desired=Math.max(0,Math.floor(Math.max(0,target-cap/3)/columns)*columns),maxStart=Math.max(0,Math.ceil(Math.max(0,rows.length-cap)/columns)*columns);desired=Math.min(desired,maxStart);var stop=Math.min(rows.length,desired+cap),active=doc.activeElement,activeId=active&&active.classList.contains('discovery-card')?active.dataset.id:null,nodes=grid.querySelectorAll('.discovery-card'),byId=Object.create(null),i,node,id;for(i=0;i<nodes.length;i++)byId[nodes[i].dataset.id]=nodes[i];for(i=desired;i<stop;i++){id=String(rows[i].id||rows[i].url||rows[i].title||'');node=byId[id];if(!node)node=card(rows[i],category);var at=grid.children[i-desired];if(at!==node)grid.insertBefore(node,at||null);delete byId[id];}Object.keys(byId).forEach(function(key){var n=byId[key];if(n.parentNode===grid){clearImages(n);grid.removeChild(n);}});start=desired;end=stop;measure();topSpace.style.height=(Math.floor(start/columns)*rowHeight)+'px';bottomSpace.style.height=(Math.ceil((rows.length-end)/columns)*rowHeight)+'px';if(activeId&&active&&active.isConnected&&doc.activeElement!==active)try{active.focus();}catch(e){} }
      function onScroll(){if(frame!==null)return;frame=root.requestAnimationFrame(function(){frame=null;if(g!==gen||o.container.hidden)return;measure();var rect=topSpace.getBoundingClientRect(),position=Math.max(0,-rect.top),target=Math.floor(position/rowHeight)*columns;if(target<start+columns*2||target>end-columns*4)renderWindow(target);});}
      function onResize(){if(g!==gen)return;renderWindow(Math.max(0,start));}
      root.addEventListener('scroll',onScroll,{passive:true});root.addEventListener('resize',onResize);browseCleanup=function(){root.removeEventListener('scroll',onScroll);root.removeEventListener('resize',onResize);if(frame!==null)root.cancelAnimationFrame(frame);browseMove=null;};
      browseMove=function(direction,active){var id=active&&active.dataset.id,index=-1;for(var i=0;i<rows.length;i++)if(String(rows[i].id||rows[i].url||rows[i].title||'')===id){index=i;break;}if(index<0)return false;measure();var target=index+direction*columns;if(target<0)return false;if(target>=rows.length){if(direction>0&&hasMore){next(true);return true;}return false;}if(target>=start&&target<end)return false;renderWindow(target);var wanted=String(rows[target].id||rows[target].url||rows[target].title||''),nodes=grid.querySelectorAll('.discovery-card');for(i=0;i<nodes.length;i++)if(nodes[i].dataset.id===wanted){nodes[i].focus();nodes[i].scrollIntoView({block:'nearest'});break;}return true;};
      function next(wantFocus){if(loading||!hasMore||g!==gen||o.container.hidden)return Promise.resolve();loading=true;var nextPage=page,requestKey=JSON.stringify([category,nextPage,isFiltered,kind,selection]),cached=getBrowseCache(requestKey);grid.setAttribute('aria-busy','true');
        var req=cached?Promise.resolve(cached):(isFiltered?data.nativeList(kind,selection,nextPage,o.request):(typeof data.categoryList==='function'?data.categoryList(category,nextPage,o.request):data.list(filters,nextPage,o.request)));
        return Promise.resolve(req).then(function(result){if(g!==gen)return;if(!cached)putBrowseCache(requestKey,result);var items=result.items||[],added=[];var firstNew=rows.length;items.forEach(function(row){var id=String(row.id||row.url||row.title||'');if(id&&seen[id])return;if(id)seen[id]=true;rows.push(row);added.push(row);});renderWindow(wantFocus?firstNew:Math.max(0,end-columns));page=nextPage+1;hasMore=!!result.hasMore&&added.length>0;status.textContent=rows.length?'':'没有符合条件的影片。';if(pendingFilterFocus){var active=doc.activeElement;if(!active||active===doc.body||active.closest&&active.closest('.discovery-inline-filters'))focusFilterChoice(pendingFilterFocus);pendingFilterFocus=null;}else if(wantFocus&&added.length){try{var wanted=String(added[0].id||added[0].url||added[0].title||''),cards=grid.querySelectorAll('.discovery-card');for(var z=0;z<cards.length;z++)if(cards[z].dataset.id===wanted){cards[z].focus();cards[z].scrollIntoView({block:'nearest'});break;}}catch(e){}}},function(e){if(g!==gen)return;status.textContent='片单加载失败，请稍后重试';hasMore=false;}).then(function(){loading=false;if(g===gen)grid.setAttribute('aria-busy','false');});}
      rows=[];browseMore=next;if(root.IntersectionObserver){browseSentinelObserver=new root.IntersectionObserver(function(entries){if(entries.some(function(e){return e.isIntersecting;}))next(false);},{rootMargin:'300px'});browseSentinelObserver.observe(sentinel);}return next(false);
    }
    function browse(type,options){exitHistoryEdit();options=options||{};pendingFilterFocus=null;pendingPageFocus=false;activeNav=type;var dedicated=type==='movie-filter'||type==='tv-filter';filtersVisible=dedicated||!!options.openFilters;if(dedicated)type=type==='tv-filter'?'tv':'movie';var known=choices.type.filter(function(t){return t.id===type;})[0];if(!known&&type!=='variety')type='movie';if(options.fromRoute)routeSection=options.route||activeNav;else setRoute(activeNav,true);filters.type=(type==='variety'||type==='anime')?'tv':type==='documentary'?'movie':type;filteredBrowse=dedicated||!!options.keepFilter;page=1;save();sectionChange(type);activeType();var request=loadBrowse();return request;}
    function filterKind(){return filters.type==='tv'?'tv':'movie';}
    var navCategories=[{id:'home',name:'首页'},{id:'movie',name:'热门电影'},{id:'tv',name:'热播剧集'},{id:'anime',name:'热门动漫'},{id:'variety',name:'热播综艺'},{id:'movie-filter',name:'电影筛选'},{id:'tv-filter',name:'电视筛选'}];
    function navSection(id){return id==='movie-filter'?'movie':id==='tv-filter'?'tv':id;}var tabFocusTimer=null;
    function clearTabFocusTimer(){if(tabFocusTimer){clearTimeout(tabFocusTimer);tabFocusTimer=null;}}
    function onRoutePop(){clearTabFocusTimer();var href=doc.defaultView.location.href,target=readRoute(),valid=navCategories.filter(function(item){return item.id===target;})[0];if(/(?:\?|&)gg_overlay=/.test(href)||!valid||target===routeSection)return;routeSection=target;if(target==='home'||target==='for-you')home(target,true);else browse(target,{fromRoute:true,route:target});}
    routeSection=readRoute();
    [['live','直播'],['search','搜索']].forEach(function(action){var button=el('button','discovery-type',action[1]);button.type='button';button.dataset.action=action[0];button.onclick=function(){if(typeof o.onQuickAction==='function')o.onQuickAction(action[0]);};tabs.appendChild(button);});
    navCategories.forEach(function(type){var b=el('button','discovery-type',type.name);b.type='button';b.dataset.type=type.id;b.onclick=function(){clearTabFocusTimer();if(type.id==='home'||type.id==='for-you'){home(type.id);return;}var changed=activeNav!==type.id||section!==navSection(type.id);filtersVisible=/-(?:filter)$/.test(type.id)?true:changed?true:!filtersVisible;if(changed)browse(type.id,{openFilters:true});var w=content.querySelector('.discovery-inline-filters');if(w)w.hidden=!filtersVisible;if(filtersVisible&&w){var first=w.querySelector('button');if(first)try{first.focus();}catch(e){}}};b.addEventListener('focus',function(){clearTabFocusTimer();tabFocusTimer=setTimeout(function(){tabFocusTimer=null;if(doc.activeElement!==b)return;if(type.id==='home'||type.id==='for-you'){if(activeNav!==type.id||section!=='home')home(type.id);}else if(activeNav!==type.id||section!==navSection(type.id))browse(type.id);},220);});b.addEventListener('blur',clearTabFocusTimer);tabs.appendChild(b);});
    tabs.appendChild(el('span','discovery-types-sep'));
    [['sites','站点'],['favorites','收藏'],['push','推送'],['settings','设置'],['native','原生点播']].forEach(function(action){var button=el('button','discovery-type',action[1]);button.type='button';button.dataset.action=action[0];button.onclick=function(){if(typeof o.onQuickAction==='function')o.onQuickAction(action[0]);};tabs.appendChild(button);});
    tabs.appendChild(el('span','discovery-types-sep'));
    doc.defaultView.addEventListener('popstate',onRoutePop,false);
    content.addEventListener('keydown',function(e){if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;var active=doc.activeElement;if(!active||!active.classList.contains('discovery-card'))return;var grid=active.closest&&active.closest('.discovery-grid');if(!grid||!browseMore)return;if(browseMove&&browseMove(e.key==='ArrowDown'?1:-1,active)){e.preventDefault();e.stopImmediatePropagation();return;}if(e.key!=='ArrowDown')return;var cards=grid.querySelectorAll('.discovery-card'),top=active.getBoundingClientRect().top,below=Array.prototype.some.call(cards,function(n){return n.getBoundingClientRect().top>top+1;});if(!below){e.preventDefault();browseMore(true);}},true);
    var detailFilterHandler=null,detailSourceHandler=null,detailFilterTimer=null;var detailObserver=null,preselectTimer=null,preselectDeadlineTimer=null,preselectDeadlinePassed=false,preselectLocked=false,panRendered={},mipanRendered={},qupanRendered={},lastCheckAt=0,checkRetryTimer=null;
    function releaseDetailScope(){modal.onscroll=null;if(detailScope){detailScope.active=false;if(detailScope.groups)detailScope.groups.destroy();if(detailScope.artwork)detailScope.artwork.destroy();if(detailScope.stopArtwork)detailScope.stopArtwork();if(typeof o.cancelRequests==='function')try{o.cancelRequests(detailScope);}catch(e){}detailScope=null;}if(typeof o.cancelChecks==='function')try{o.cancelChecks();}catch(e2){}}
    function close(){if(detailSourceHandler){root.removeEventListener('gg-search-sources-changed',detailSourceHandler);detailSourceHandler=null;}if(detailFilterHandler){root.removeEventListener('gg-check-updated',detailFilterHandler);detailFilterHandler=null;}clearTimeout(detailFilterTimer);detailGen++;releaseDetailScope();prefetchQueue.length=0;detailWallPic='';if(detailObserver){detailObserver.disconnect();detailObserver=null;}if(preselectTimer){clearTimeout(preselectTimer);preselectTimer=null;}if(preselectDeadlineTimer){clearTimeout(preselectDeadlineTimer);preselectDeadlineTimer=null;}preselectDeadlinePassed=false;preselectLocked=false;if(checkRetryTimer){clearTimeout(checkRetryTimer);checkRetryTimer=null;}clearImages(modal);if(ref){ref.destroy();ref=null;}modal.hidden=true;modal.textContent='';if(focusBack&&doc.documentElement.contains(focusBack))focusBack.focus();}
    function open(row){if(detailSourceHandler){root.removeEventListener('gg-search-sources-changed',detailSourceHandler);detailSourceHandler=null;}if(detailFilterHandler){root.removeEventListener('gg-check-updated',detailFilterHandler);detailFilterHandler=null;}clearTimeout(detailFilterTimer);releaseDetailScope();exitHistoryEdit();var g=++detailGen;detailScope={active:true};var scope=detailScope;panRendered={};mipanRendered={};qupanRendered={};focusBack=doc.activeElement;if(ref)ref.destroy();clearImages(modal);modal.textContent='';modal.hidden=false;
      var panel=el('div','discovery-detail'),closeBtn=el('button','discovery-close','× 关闭'),head=el('div','discovery-detail-head discovery-detail-hero'),poster=el('div','discovery-detail-poster'),copy=el('div','discovery-detail-copy');closeBtn.type='button';closeBtn.onclick=close;var heroCls=(root.GGCore&&typeof root.GGCore.heroClass==='function')?root.GGCore.heroClass(!!row.backdrop,!!row.image):(row.backdrop?'has-art':(row.image?'poster-only':''));
      if(heroCls)panel.classList.add(heroCls);
      var artShell=root.GGResourceView.createBackdropShell(doc,panel,'discovery-art-shell'),heroBackdrop=null;
      detailWallPic=row.backdrop||'';
      if(row.backdrop&&row.image&&row.backdrop!==row.image&&heroBackdrop){(function(img,posterUrl){var prev=img.onerror,failed=false,altTried=false;img.onerror=function(){if(img.__ggDead)return;if(!altTried&&row.backdrop&&row.backdrop.indexOf('://image.tmdb.org/')>=0){altTried=true;try{img.__ggImageUrl=row.backdrop.replace('://image.tmdb.org/','://images.tmdb.org/');}catch(e){}img.src=img.__ggImageUrl;if(typeof armImageTimeout==='function')armImageTimeout(img);return;}if(!failed){failed=true;try{img.__ggImageUrl=posterUrl;}catch(e){}img.src=o.imageSource(posterUrl);if(typeof armImageTimeout==='function')armImageTimeout(img);return;}if(typeof prev==='function')prev.call(img);};})(heroBackdrop,row.image);}panel.appendChild(closeBtn);if(row.image)poster.appendChild(image(row.image,'discovery-detail-image',true));else poster.appendChild(el('span','discovery-no-image','暂无海报'));head.appendChild(poster);copy.appendChild(el('span','eyebrow','影片详情'));copy.appendChild(el('h2','',row.title));copy.appendChild(el('p','discovery-meta',[row.year,row.rating?'豆瓣 '+row.rating:''].filter(Boolean).join(' · ')));var synopsis=el('p','discovery-synopsis','正在读取简介…');copy.appendChild(synopsis);function toggleSynopsis(){return panel.classList.toggle('show-synopsis');}head.appendChild(copy);panel.appendChild(head);
      if(root.GGSourceArtwork){scope.artwork=root.GGSourceArtwork.mount({host:artShell,className:'discovery-detail-backdrop',valid:function(){return scope.active&&g===detailGen&&!modal.hidden;},request:function(url){return o.request(url,{scope:scope,isCurrent:function(){return scope.active&&g===detailGen&&!modal.hidden;}});},imageSource:o.imageSource,getKey:o.getTmdbKey,onWall:function(url){detailWallPic=url;}});scope.artwork.set(row);}
      var sources=el('section','discovery-sources'),sourcesHead=el('div','discovery-sources-heading'),allSources=el('button','primary discovery-all-sources','查看全部来源');allSources.type='button';allSources.onclick=function(){o.onNativeSearch(row.title,row);};var synopsisBtn=el('button','primary discovery-all-sources discovery-synopsis-btn','显示简介');synopsisBtn.type='button';synopsisBtn.onclick=function(){var show=toggleSynopsis();synopsisBtn.textContent=show?'隐藏简介':'显示简介';if(show)loadSynopsis();};sourcesHead.appendChild(el('h3','','播放源'));sourcesHead.appendChild(synopsisBtn);sourcesHead.appendChild(allSources);sources.appendChild(sourcesHead);var dotLegend=el('div','discovery-dot-legend');dotLegend.appendChild(el('span','','绿=分享可访问（非起播验证） · 黄=需密码/权限 · 灰=待确认/未检测 · 红=确认失效'));var recheckBtn=el('button','discovery-recheck-btn','刷新检测状态');recheckBtn.type='button';recheckBtn.title='普通状态刷新遵循缓存；长按单条可查看检查时间与受支持的实时检测';recheckBtn.onclick=function(){manualRecheck();};dotLegend.appendChild(recheckBtn);sources.appendChild(dotLegend);var diskTabs=el('div','discovery-disk-tabs');diskTabs.hidden=true;sources.appendChild(diskTabs);var sourcesEmpty=el('p','discovery-sources-empty','暂未找到资源，可查看全部来源或调整搜索范围。');sourcesEmpty.hidden=true;sources.appendChild(sourcesEmpty);var diskNote=el('p','discovery-sources-note','');diskNote.hidden=true;sources.appendChild(diskNote);var sourcesProgress=el('p','discovery-sources-progress','');sourcesProgress.hidden=true;sources.appendChild(sourcesProgress);
      (function(){var a=allowedDisks();if(!a||!a.length)return;var all=Object.keys((root.GGCore&&root.GGCore.disks)||{});if(a.length>=all.length)return;var names=a.map(function(t){return (root.GGCore.disks[t]||t);});var only=(typeof o.getDisplayDisksOnly==='function')&&o.getDisplayDisksOnly();diskNote.textContent=(only?'当前仅显示：':'优先显示：')+names.join('、')+'（设置 → 优先显示网盘可调整）';diskNote.hidden=false;})();var refBox=el('div','discovery-reference-content');sources.appendChild(refBox);panel.appendChild(sources);modal.appendChild(panel);closeBtn.focus();
      var rowType=row.discoveryType||row.type||'movie',detailKind=(rowType==='tv'||rowType==='variety')?'tv':'movie',metaURL='https://m.douban.com/rexxar/api/v2/'+detailKind+'/'+encodeURIComponent(row.id);
      var synopsisLoaded=false,synopsisBusy=false;function loadSynopsis(){if(synopsisLoaded||synopsisBusy||!scope.active)return;synopsisBusy=true;var valid=function(){return scope.active&&g===detailGen&&!modal.hidden;};o.request(metaURL,{headers:{Referer:'https://m.douban.com/'},scope:scope,isCurrent:valid}).then(function(response){if(!valid())return;var body=response.body;if(typeof body==='string')body=JSON.parse(body);if(body&&body.intro)return body.intro;throw new Error('简介缺失');}).then(function(text){synopsisBusy=false;synopsisLoaded=true;if(valid())synopsis.textContent=text;},function(){synopsisBusy=false;if(valid())synopsis.textContent='简介暂不可用，下方找源继续进行。';});}
      if(root.GGSourceGroups&&typeof o.loadSharedSource==='function'){
        var referenceRows=[],sharedHost=el('div','gg-source-groups'),sharedFilters=el('div','gg-shared-detail-filters'),settingsButton=el('button','subbutton','来源 / 网盘 / 检测设置'),currentFilters=o.getSharedFilters?o.getSharedFilters():{};
        settingsButton.type='button';settingsButton.onclick=function(){if(o.openSharedSettings)o.openSharedSettings();};sharedFilters.appendChild(settingsButton);
        var qualityControl=root.GGResourceView.createQualityControls(doc,{legend:'画质',values:root.GGSearchFilters.selected(currentFilters.quality||''),keepUnknown:currentFilters.keepUnknownQuality!==false,onChange:function(values,keep){if(o.setSharedFilters)o.setSharedFilters({quality:values.join('|'),keepUnknownQuality:keep});if(scope.groups)scope.groups.refresh();}});sharedFilters.appendChild(qualityControl.node);
        var sortButton=el('button','subbutton','排序'),sortChoices=el('div','gg-detail-sort-choices');sortButton.type='button';sortChoices.hidden=true;sortButton.onclick=function(){sortChoices.hidden=!sortChoices.hidden;if(!sortChoices.hidden){var first=sortChoices.querySelector('button');if(first)first.focus();}};root.GGResourceView.createSortChoices(doc,sortChoices,function(value,label){if(o.setSharedFilters)o.setSharedFilters({sort:value});sortButton.textContent=label;sortChoices.hidden=true;sortButton.focus();if(scope.groups)scope.groups.refresh();});sharedFilters.appendChild(sortButton);sharedFilters.appendChild(sortChoices);
        sources.appendChild(sharedFilters);sources.appendChild(sharedHost);refBox.hidden=true;
        ref=root.GGReferenceSearch.mount({container:refBox,providers:root.GGProviders,request:function(url,opts){opts=opts||{};opts.scope=scope;opts.isCurrent=function(){return scope.active&&g===detailGen&&!modal.hidden;};return o.referenceRequest(url,opts);},hideForm:true,hideSites:true,collectOnly:true,imageSource:o.imageSource,onRows:function(items){referenceRows=items.map(function(item){var copy={};Object.keys(item).forEach(function(k){copy[k]=item[k];});copy.id='reference:'+item.siteKey+':'+item.url;copy.__reference=true;copy.type='';return copy;});},onShare:function(share,source){share.note=source.title||row.title;share.image=row.image;share.wallPic=detailWallPic||'';o.onShare(share,source);},onNativeSearch:function(t){o.onNativeSearch(t,row);}});
        scope.groups=root.GGSourceGroups.mount({container:sharedHost,load:function(key){if(key==='reference')return ref.search(row.title,o.getReferenceKeys?o.getReferenceKeys():null).then(function(){return {rows:referenceRows.slice()};});return o.loadSharedSource(key,row.title,scope);},filter:function(items){return o.filterSharedRows?o.filterSharedRows(items,row.title):items;},create:function(item,key){item.image=item.image||row.image;item.wallPic=detailWallPic||row.backdrop||'';var node=o.makeSharedResource(item);if(item.__reference)node.onclick=function(){if(ref)ref.open(item);};return node;},onVisible:function(items){if(scope.active&&o.onSharedVisible)o.onSharedVisible(items);},onRecheck:function(items){if(scope.active&&o.onSharedRecheck)o.onSharedRecheck(items);}});
        function enabledGroups(){var sourceKeys=typeof o.getSearchSources==='function'?o.getSearchSources():[],map={tg:['tgSelf'],pan:['panSelf','panPub'],mipan:['mipan'],qupan:['qupan'],ref:['reference']},keys=[];sourceKeys.forEach(function(k){keys=keys.concat(map[k]||[]);});return keys;}
        scope.groups.reset(enabledGroups());scope.inspect=function(){return scope.groups&&scope.groups.inspect();};
        detailSourceHandler=function(){if(scope.active)scope.groups.reset(enabledGroups());};root.addEventListener('gg-search-sources-changed',detailSourceHandler);
        detailFilterHandler=function(){if(scope.active&&scope.groups)scope.groups.updateStatus();};root.addEventListener('gg-check-updated',detailFilterHandler);
        recheckBtn.onclick=function(){if(scope.active&&scope.groups)scope.groups.recheck();};
        return;
      }
      var refSeen={};
      ref=root.GGReferenceSearch.mount({container:refBox,providers:root.GGProviders,request:function(url,options){options=options||{};var previous=options.isCurrent;options.scope=scope;options.isCurrent=function(){return scope.active&&g===detailGen&&!modal.hidden&&(!previous||previous());};return o.referenceRequest(url,options);},hideForm:true,hideSites:true,autoResolve:true,directSharesOnly:true,maxDomRows:48,expectedYear:row.year||'',imageSource:o.imageSource,shareFilter:function(share){if(!isAllowedDisk(diskKeyForShare(share)))return false;var u=share&&share.url;if(!u)return true;var k=(root.GGCore&&root.GGCore.dedupKey)?root.GGCore.dedupKey(u):u;if(refSeen[k])return false;refSeen[k]=true;return true;},onShare:function(share,source){share.note=source.title||row.title;share.image=row.image;share.wallPic=detailWallPic||'';o.onShare(share,source);},onNativeSearch:function(t){o.onNativeSearch(t,row);}});
      var refDone=false,checkInFlight=false,checkQueued=false,preselectedBtn=null,preselectFrozen=false,preselectFocusDone=false;
      var mipanToken='';
      function parseJsonBody(res){
        var body=res&&res.body;if(typeof body==='string'){try{body=JSON.parse(body);}catch(e){throw new Error('bad json');}}
        return body;
      }
      function fetchPanSelf(){
        if(typeof o.searchPanSelf==='function')return o.searchPanSelf(row.title,'pan',scope);
        return Promise.resolve({rows:[],ms:0,error:'failed'});
      }
      function fetchPanPublic(){
        if(typeof o.searchPanPublic==='function')return o.searchPanPublic(row.title,scope);
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
          return o.postRequest('https://www.mipan.so/api/token',{method:'GET',headers:{'Accept':'application/json','Referer':'https://www.mipan.so/'},timeout:10,scope:scope,isCurrent:function(){return scope.active&&g===detailGen&&!modal.hidden;}}).then(function(res){
            var body=parseJsonBody(res);
            if(!body||!body.token)throw new Error('no token');
            mipanToken=body.token;return mipanToken;
          });
        }
        function searchOnce(token){
          return o.postRequest('https://www.mipan.so/api/search',{headers:{'Content-Type':'application/json','X-Mipan-Token':token,'Referer':'https://www.mipan.so/'},body:JSON.stringify({kw:row.title}),timeout:20,scope:scope,isCurrent:function(){return scope.active&&g===detailGen&&!modal.hidden;}}).then(function(res){
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
        return o.postRequest('https://b.funletu.com/search',{headers:{'Content-Type':'application/json','Origin':'https://b.funletu.com','Referer':'https://b.funletu.com'},body:JSON.stringify({keyword:row.title,categoryid:0,filetypeid:1,courseid:1,page:1,pageSize:15,sortBy:'sort',order:'desc',offset:0}),timeout:20,scope:scope,isCurrent:function(){return scope.active&&g===detailGen&&!modal.hidden;}}).then(function(res){
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
        var status=el('p','discovery-self-status',labelText+'尚未加载；点击上方按钮开始');
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
            for(i=0;i<btns.length;i++){
              b=btns[i];if(b.dataset.ggChecked||!visibleInViewport(b))continue;safe=null;
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
              if(g!==detailGen||modal.hidden)return;items.forEach(function(it,idx){
                var st=states&&states[idx]||'unknown';
                it.button.dataset.ggCheck=st;it.button.dataset.ggChecked='1';
                var d=it.button.querySelector('.discovery-health-dot');
                if(d)d.setAttribute('data-state',(root.GGCore&&root.GGCore.healthDotState)?root.GGCore.healthDotState(st):'idle');
              });
              applyDetailFilters();
            }).catch(function(){});
          });
        }
        var windowSize=24,windowStep=12,windowStart=0,windowEnd=0,diskRows=Object.create(null),diskOrder=[],heightByIndex=Object.create(null),averageHeight=50,groupList=null,topSpace=null,bottomSpace=null,nodesByIndex=Object.create(null),scrollFrame=null;
        results.tabIndex=0;
        function expectedHeight(index){return Number(heightByIndex[index])||averageHeight;}
        function syncSpacers(){if(!topSpace||!bottomSpace)return;var top=0,i,rows=diskRows[selected]||[];for(i=0;i<windowStart;i++)top+=expectedHeight(i);var bottom=0;for(i=windowEnd;i<rows.length;i++)bottom+=expectedHeight(i);topSpace.style.height=top+'px';bottomSpace.style.height=bottom+'px';}
        function makeResource(index){var rr=(diskRows[selected]||[])[index],button=root.GGResourceView.create(doc,rr,{className:'subbutton discovery-resource',source:(root.GGCore.disks[selected]||selected)});button.dataset.detailIndex=String(index);button.__ggPanShare=rr;button.onclick=function(item){return function(){o.onSelfRow({url:item.url,title:item.title,password:item.password,type:item.type,image:row.image||item.image||'',wallPic:detailWallPic||'',discoveryType:row.discoveryType||row.type||'movie'});};}(rr);nodesByIndex[index]=button;return button;}
        function recordVisibleHeights(){var total=0,count=0;Object.keys(nodesByIndex).forEach(function(key){var n=nodesByIndex[key];if(!n||!n.parentNode)return;var h=n.getBoundingClientRect().height;if(h>0){heightByIndex[key]=h;total+=h;count++;}});if(count)averageHeight=total/count;}
        function setWindow(start,end,resetScroll){var list=diskRows[selected]||[];windowStart=Math.max(0,start);windowEnd=Math.min(list.length,end);results.textContent='';nodesByIndex=Object.create(null);if(!list.length){groupList=null;topSpace=null;bottomSpace=null;return;}var group=root.GGResourceView.createGroup(doc,'discovery-self-group'),sec=group.section;sec.dataset.disk=selected;group.title.textContent=(root.GGCore.disks[selected]||selected)+'（'+list.length+'）';group.head.classList.add('discovery-self-group-head');group.list.classList.add('discovery-self-group-list');groupList=group.list;topSpace=el('div','discovery-result-spacer');bottomSpace=el('div','discovery-result-spacer');topSpace.setAttribute('aria-hidden','true');bottomSpace.setAttribute('aria-hidden','true');groupList.appendChild(topSpace);for(var i=windowStart;i<windowEnd;i++)groupList.appendChild(makeResource(i));groupList.appendChild(bottomSpace);results.appendChild(sec);syncSpacers();if(resetScroll)results.scrollTop=0;}
        function advanceDown(){var list=diskRows[selected]||[];if(windowEnd>=list.length)return false;recordVisibleHeights();var drop=Math.min(windowStep,windowEnd-windowStart),i,removed=0,first;for(i=windowStart;i<windowStart+drop;i++){first=nodesByIndex[i];removed+=expectedHeight(i);if(first&&first.parentNode)first.parentNode.removeChild(first);delete nodesByIndex[i];}windowStart+=drop;var newEnd=Math.min(list.length,windowEnd+windowStep);for(i=windowEnd;i<newEnd;i++)groupList.insertBefore(makeResource(i),bottomSpace);windowEnd=newEnd;syncSpacers();runPanCheck();applyDetailFilters();return true;}
        function advanceUp(){var list=diskRows[selected]||[];if(windowStart<=0)return false;recordVisibleHeights();var add=Math.min(windowStep,windowStart),newStart=windowStart-add,i,anchor=nodesByIndex[windowStart],added=0;for(i=newStart;i<windowStart;i++){var h=expectedHeight(i);added+=h;groupList.insertBefore(makeResource(i),anchor||bottomSpace);}var removeEnd=Math.min(windowEnd,windowStart+windowSize);for(i=windowEnd-1;i>=removeEnd;i--){var old=nodesByIndex[i];if(old&&old.parentNode)old.parentNode.removeChild(old);delete nodesByIndex[i];}windowStart=newStart;windowEnd=removeEnd;syncSpacers();results.scrollTop+=added;runPanCheck();applyDetailFilters();return true;}
        function onResultsScroll(){if(scrollFrame)return;var raf=doc.defaultView.requestAnimationFrame||function(fn){return setTimeout(fn,16);};scrollFrame=raf(function(){scrollFrame=null;if(!groupList||!scope.active||modal.hidden)return;runPanCheck();if(results.scrollTop+results.clientHeight>=results.scrollHeight-100)advanceDown();else if(results.scrollTop<=60)advanceUp();});}
        results.addEventListener('scroll',onResultsScroll,{passive:true});
        results.addEventListener('keydown',function(event){if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;var active=doc.activeElement,index=active&&Number(active.dataset.detailIndex);if(!isFinite(index))return;if(event.key==='ArrowDown'&&index===windowEnd-1&&advanceDown()){event.preventDefault();var next=nodesByIndex[index+1];if(next)next.focus();}else if(event.key==='ArrowUp'&&index===windowStart&&advanceUp()){event.preventDefault();var previous=nodesByIndex[index-1];if(previous)previous.focus();}});
        function render(rows,ms){var order=(typeof o.getDiskOrder==='function')?o.getDiskOrder():null,sorted=(root.GGCore&&root.GGCore.sortByDisk)?root.GGCore.sortByDisk(rows,order):rows;var ownSet=(key==='pan')?panRendered:(key==='qupan')?qupanRendered:mipanRendered,seen={},uniq=[],i,r,k;for(i=0;i<sorted.length;i++){r=sorted[i];if(!r||!r.url||!isAllowedDisk(r.type||'other'))continue;k=(root.GGCore&&root.GGCore.dedupKey)?root.GGCore.dedupKey(r.url):r.url;if(seen[k])continue;seen[k]=true;ownSet[k]=true;uniq.push(r);}diskRows=Object.create(null);diskOrder=[];uniq.forEach(function(item){var type=item.type||'other';if(!diskRows[type]){diskRows[type]=[];diskOrder.push(type);}diskRows[type].push(item);});diskOrder.forEach(function(type){var decorated=diskRows[type].map(function(item,index){return {r:item,i:index};});decorated.sort(function(a,b){var C=root.GGCore,ra=C&&C.resRank?C.resRank(a.r.title||''):3,rb=C&&C.resRank?C.resRank(b.r.title||''):3;return (ra-rb)||(a.i-b.i);});diskRows[type]=decorated.map(function(item){return item.r;});});tabs.textContent='';tabs.hidden=!diskOrder.length;diskOrder.forEach(function(type){var button=el('button','discovery-disk-tab',(root.GGCore.disks[type]||type)+'（'+diskRows[type].length+'）');button.type='button';button.dataset.disk=type;button.onclick=function(){selected=type;var buttons=tabs.querySelectorAll('.discovery-disk-tab');for(var j=0;j<buttons.length;j++)buttons[j].classList.toggle('active',buttons[j]===button);setWindow(0,Math.min(windowSize,(diskRows[selected]||[]).length),true);runPanCheck();applyDetailFilters();};tabs.appendChild(button);});if(!diskOrder.length){status.textContent='暂无'+labelText+'资源';results.textContent='';applyDetailFilters();return;}status.textContent=labelText+'：'+uniq.length+' 条'+(typeof ms==='number'?' · '+(ms/1000).toFixed(1)+' 秒':'');if(!selected||diskOrder.indexOf(selected)<0)selected=diskOrder[0];var buttons=tabs.querySelectorAll('.discovery-disk-tab');for(var bi=0;bi<buttons.length;bi++)buttons[bi].classList.toggle('active',buttons[bi].dataset.disk===selected);heightByIndex=Object.create(null);averageHeight=50;setWindow(0,Math.min(windowSize,(diskRows[selected]||[]).length),true);runPanCheck();applyDetailFilters();}
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
        return {container:container,status:status,tabs:tabs,results:results,load:load,stash:stash,rerunCheck:runPanCheck,resort:function(){if(!loaded||!selected)return;Object.keys(diskRows).forEach(function(type){diskRows[type]=root.GGRecommendations.rank(diskRows[type],{query:row.title,disks:typeof o.getDiskOrder==='function'?o.getDiskOrder():[],mode:detailSort,ledger:root.GGCheckLedger});});setWindow(0,Math.min(windowSize,(diskRows[selected]||[]).length),true);applyDetailFilters();}};
      }
      var panSelfSec=buildPanSection('pan','盘搜自建',fetchPanSelf,'self','discovery-pan-section');
      var panPubSec=buildPanSection('pan','盘搜公共',fetchPanPublic,'pub','discovery-pan-section');
      panSelfSec.container.hidden=false;panPubSec.container.hidden=false;
      var panModeContainer=el('div','discovery-pan-mode');panModeContainer.hidden=true;
      panModeContainer.appendChild(panSelfSec.container);panModeContainer.appendChild(panPubSec.container);
      var panMode={container:panModeContainer,sections:[panSelfSec,panPubSec],load:function(){panSelfSec.load();panPubSec.load();},stash:function(combined){if(combined){panSelfSec.stash(combined.self);panPubSec.stash(combined.pub);}}};
      var mipanMode=buildPanSection('mipan','觅搜',fetchMipan,'mipan','discovery-pan-mode');
      var qupanMode=buildPanSection('qupan','趣盘',fetchQupan,'qupan','discovery-pan-mode');
      var tgMode=buildPanSection('tg','TG · 自建',function(){return o.searchPanSelf(row.title,'tg',scope);},'tg','discovery-pan-mode');
      var resourceMode=el('div','discovery-resource-mode');
      [diskTabs,sourcesEmpty,diskNote,sourcesProgress,refBox].forEach(function(n){resourceMode.appendChild(n);});
      var sourceHint=el('p','discovery-sources-progress','按设置加载搜索来源');
      var detailFilter=el('section','discovery-detail-filter');
      var detailFilterTitle=el('h4','','本页筛选');detailFilter.appendChild(detailFilterTitle);
      var detailStatusValues=['ok','bad','locked','pending','unknown','expired','timeout','unsupported','rate_limited'];
      var detailStatusNames={ok:'分享可访问',bad:'确认失效',locked:'需密码/权限',pending:'未检测',unknown:'未知',expired:'已过期',timeout:'超时',unsupported:'不支持',rate_limited:'受限'};
      var detailSelectedStatuses=detailStatusValues.slice(),detailSelectedQualities=[],detailKeepUnknown=true;
      var detailStatusRow=el('div','discovery-detail-filter-row'),detailQualityRow=el('div','discovery-detail-filter-row');
      detailStatusRow.setAttribute('role','group');detailStatusRow.setAttribute('aria-label','按检测状态筛选');
      detailQualityRow.setAttribute('role','group');detailQualityRow.setAttribute('aria-label','按来源画质标注筛选');
      detailStatusRow.appendChild(el('span','discovery-detail-filter-label','状态'));
      detailQualityRow.appendChild(el('span','discovery-detail-filter-label','画质标注'));
      var detailStatusButtons={},detailQualityButtons={},detailUnknownButton=null,detailFilterNote=el('p','discovery-detail-filter-note','状态使用已有检测记录；画质来自来源标题或标签，仅供筛选，不代表实测。');
      function makeDetailFilterButton(row,store,key,label,onToggle){
        var button=el('button','discovery-detail-filter-chip',label);button.type='button';button.dataset.filter=key;button.setAttribute('aria-pressed','true');
        button.onclick=function(){onToggle(key);updateDetailFilterButtons();applyDetailFilters();};row.appendChild(button);store[key]=button;return button;
      }
      var allStatusButton=el('button','discovery-detail-filter-chip discovery-detail-filter-all','全部状态');allStatusButton.type='button';allStatusButton.setAttribute('aria-pressed','true');allStatusButton.onclick=function(){detailSelectedStatuses=detailStatusValues.slice();updateDetailFilterButtons();applyDetailFilters();};detailStatusRow.appendChild(allStatusButton);
      detailStatusValues.forEach(function(key){makeDetailFilterButton(detailStatusRow,detailStatusButtons,key,detailStatusNames[key],function(value){var index=detailSelectedStatuses.indexOf(value);if(index>=0)detailSelectedStatuses.splice(index,1);else detailSelectedStatuses.push(value);});});
      var detailQualityControl=root.GGResourceView.createQualityControls(doc,{legend:'画质',values:detailSelectedQualities,keepUnknown:detailKeepUnknown,onChange:function(values,keep){detailSelectedQualities=values;detailKeepUnknown=keep;applyDetailFilters();}});detailFilter.appendChild(detailQualityControl.node);
      function updateDetailFilterButtons(){
        Object.keys(detailStatusButtons).forEach(function(key){detailStatusButtons[key].classList.toggle('active',detailSelectedStatuses.indexOf(key)>=0);detailStatusButtons[key].setAttribute('aria-pressed',String(detailSelectedStatuses.indexOf(key)>=0));});
        allStatusButton.classList.toggle('active',detailSelectedStatuses.length===detailStatusValues.length);allStatusButton.setAttribute('aria-pressed',String(detailSelectedStatuses.length===detailStatusValues.length));
        detailQualityControl.sync(detailSelectedQualities,detailKeepUnknown);
      }
      updateDetailFilterButtons();
      function detailMatch(share){
        var F=root.GGSearchFilters,ledger=root.GGCheckLedger;if(!F||!share)return true;
        if(typeof F.quality==='function'&&!F.quality({title:share.title||share.name||share.note||'',tags:share.tags||[]},detailSelectedQualities.join('|'),detailKeepUnknown))return false;
        var record=ledger&&typeof ledger.get==='function'?ledger.get(share):null;
        var state=typeof F.category==='function'?F.category(share,ledger):'unknown', selected;
        try { selected=JSON.parse(root.localStorage.getItem('gg.webhome.search-check-filter.v1')); } catch(e) {}
        if(!Array.isArray(selected))selected=(F.states||detailStatusValues).filter(function(k){return k!=='bad';});
        return selected.indexOf(state)>=0;
      }
      function applyDetailFilters(){
        var roots=[resourceMode,panModeContainer,mipanMode.container,qupanMode.container,tgMode.container],ri,rootNode,nodes,ni,node,share,groupButtons,gi,group,visible,total,filtered;
        for(ri=0;ri<roots.length;ri++){
          rootNode=roots[ri];if(!rootNode)continue;nodes=rootNode.querySelectorAll('.ref-auto-share,.discovery-resource');total=0;visible=0;
          for(ni=0;ni<nodes.length;ni++){node=nodes[ni];share=node.__ggPanShare||node.__ggShare;filtered=!!share&&!detailMatch(share);node.classList.toggle('is-detail-filtered-out',filtered);total++;if(!filtered)visible++;}
          groupButtons=rootNode.querySelectorAll('.discovery-self-group');
          for(gi=0;gi<groupButtons.length;gi++){group=groupButtons[gi];var groupNodes=group.querySelectorAll('.discovery-resource'),any=false,gj;for(gj=0;gj<groupNodes.length;gj++)if(!groupNodes[gj].classList.contains('is-detail-filtered-out')){any=true;break;}group.classList.toggle('is-detail-group-filtered-out',!any);}
          var emptyNote=rootNode.querySelector('.discovery-detail-filter-empty');if(!emptyNote){emptyNote=el('p','discovery-detail-filter-empty','当前来源没有符合条件的资源');rootNode.appendChild(emptyNote);}emptyNote.hidden=!(total>0&&visible===0);
        }
        // RC95: render the actual bounded source rows, not a second hidden-source copy.
        // This keeps scroll recycling, focus, checks and playback on the same DOM nodes.
        if(aggregate){aggregate.section.hidden=true;aggregate.list.textContent='';}

      }
      detailFilterHandler=function(){clearTimeout(detailFilterTimer);detailFilterTimer=setTimeout(function(){if(g===detailGen&&!modal.hidden)applyDetailFilters();},100);};root.addEventListener('gg-check-updated',detailFilterHandler);
      var detailFilterRoots=[resourceMode,panModeContainer,mipanMode.container,qupanMode.container,tgMode.container];
      detailFilterRoots.forEach(function(filterRoot){var note=el('p','discovery-detail-filter-empty','当前来源没有符合条件的资源');note.hidden=true;filterRoot.appendChild(note);});
      function switchModeFilterRefresh(){applyDetailFilters();}
      sources.appendChild(sourceHint);sources.appendChild(detailFilter);sources.appendChild(resourceMode);sources.appendChild(panMode.container);sources.appendChild(mipanMode.container);sources.appendChild(qupanMode.container);sources.appendChild(tgMode.container);var aggregate=root.GGResourceView.createGroup(doc,'discovery-aggregate');aggregate.title.textContent='已选来源';sources.appendChild(aggregate.section);var aggregateNodes=Object.create(null),detailSort='relevance',detailSortButton=el('button','subbutton','推荐'),detailSortModal=el('div','modal search-sort-modal'),detailSortPanel=el('div','search-sort-panel');detailSortButton.type='button';detailSortModal.hidden=true;detailSortModal.setAttribute('role','dialog');detailSortModal.setAttribute('aria-label','排序');detailSortPanel.appendChild(el('h2','','排序'));root.GGResourceView.createSortChoices(doc,detailSortPanel,function(value,label){detailSort=value;detailSortButton.textContent=label;detailSortModal.hidden=true;detailSortButton.focus();[panMode,mipanMode,qupanMode,tgMode].forEach(function(m){if(m&&m.resort)m.resort();});sortRefShares();applyDetailFilters();});var detailSortClose=el('button','subbutton','取消');detailSortClose.type='button';detailSortClose.setAttribute('data-close','detail-sort');detailSortClose.onclick=function(){detailSortModal.hidden=true;detailSortButton.focus();};detailSortPanel.appendChild(detailSortClose);detailSortModal.appendChild(detailSortPanel);panel.appendChild(detailSortModal);detailSortButton.onclick=function(){detailSortModal.hidden=false;var first=detailSortPanel.querySelector('[data-sort-choice="'+detailSort+'"]');if(first)first.focus();};detailFilter.appendChild(detailSortButton);
      var selectedSources=typeof o.getSearchSources==='function'?o.getSearchSources():['ref','pan','tg','mipan','qupan'],sourceOptions=o.sourceOptions||[['ref','资源'],['pan','盘搜'],['tg','TG · 自建'],['mipan','觅搜'],['qupan','趣盘']],startedSources=[],sourceLoadButtons=Object.create(null),sourceLoadRow=el('div','discovery-source-load-controls');
      sourceOptions.forEach(function(pair){var button=el('button','subbutton discovery-load-source','加载 '+pair[1]);button.type='button';button.dataset.detailSource=pair[0];button.onclick=function(){loadSource(pair[0]);};sourceLoadButtons[pair[0]]=button;sourceLoadRow.appendChild(button);});sourcesHead.appendChild(sourceLoadRow);sources.insertBefore(sourceLoadRow,dotLegend);
      function showSelectedSources(){resourceMode.hidden=selectedSources.indexOf('ref')<0;panModeContainer.hidden=selectedSources.indexOf('pan')<0;mipanMode.container.hidden=selectedSources.indexOf('mipan')<0;qupanMode.container.hidden=selectedSources.indexOf('qupan')<0;tgMode.container.hidden=selectedSources.indexOf('tg')<0;sourceOptions.forEach(function(pair){var button=sourceLoadButtons[pair[0]],loaded=startedSources.indexOf(pair[0])>=0;button.hidden=selectedSources.indexOf(pair[0])<0;button.disabled=loaded;button.textContent=(loaded?'已加载 ':'加载 ')+pair[1];});applyDetailFilters();}
      var referenceStarted=false;
      function loadSource(key,force){if(!scope.active||modal.hidden||selectedSources.indexOf(key)<0)return;if(!force&&startedSources.indexOf(key)>=0)return;if(startedSources.indexOf(key)<0)startedSources.push(key);showSelectedSources();sourceHint.textContent='正在加载 '+(sourceOptions.filter(function(pair){return pair[0]===key;})[0]||[key,key])[1]+'…';if(key==='ref'){if(!referenceStarted||force){referenceStarted=true;refDone=false;ref.search(row.title).then(function(){if(g===detailGen&&!modal.hidden){refDone=true;schedulePreselect();}},function(){if(g===detailGen&&!modal.hidden){refDone=true;schedulePreselect();}});}}else if(key==='pan')panMode.load();else if(key==='mipan')mipanMode.load();else if(key==='qupan')qupanMode.load();else if(key==='tg')tgMode.load();sourceHint.textContent='已开始 '+(sourceOptions.filter(function(pair){return pair[0]===key;})[0]||[key,key])[1]+'；其它来源可按需加载';}
      function startSelected(){if(!selectedSources.length){sourceHint.textContent='未选择来源，请到设置中的搜索来源选择';startedSources=[];showSelectedSources();return;}var first=selectedSources.indexOf('pan')>=0?'pan':selectedSources[0];loadSource(first);}
      showSelectedSources();detailSourceHandler=function(){if(g!==detailGen||modal.hidden)return;selectedSources=typeof o.getSearchSources==='function'?o.getSearchSources():[];startedSources=startedSources.filter(function(key){return selectedSources.indexOf(key)>=0;});showSelectedSources();if(!startedSources.length)startSelected();};root.addEventListener('gg-search-sources-changed',detailSourceHandler);
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
        for(i=0;i<refBtns.length;i++){ btn=refBtns[i]; if(btn.__ggShare&&btn.offsetParent!==null&&visibleInViewport(btn)){ list.push({kind:'ref',share:btn.__ggShare,button:btn,order:list.length}); } }
        return list;
      }
      function visibleInViewport(node){if(!node||!node.getClientRects||!node.getClientRects().length)return false;var r=node.getBoundingClientRect(),w=doc.defaultView,top=0,left=0,bottom=w.innerHeight||doc.documentElement.clientHeight,right=w.innerWidth||doc.documentElement.clientWidth,n=node.parentElement,style;while(n&&n!==doc.body&&n!==doc.documentElement){try{style=w.getComputedStyle(n);var oy=style.overflowY,ox=style.overflowX,clip=n.getBoundingClientRect();if(oy==='auto'||oy==='scroll'||oy==='hidden'||oy==='clip'){top=Math.max(top,clip.top);bottom=Math.min(bottom,clip.bottom);}if(ox==='auto'||ox==='scroll'||ox==='hidden'||ox==='clip'){left=Math.max(left,clip.left);right=Math.min(right,clip.right);}}catch(e){}n=n.parentElement;}return r.bottom>top&&r.top<bottom&&r.right>left&&r.left<right;}
      function checkItemsFor(cands){
        var items=[],i,c,safe;
        for(i=0;i<cands.length;i++){
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
        sourcesProgress.textContent='已找到 '+refCount+' 条（资源 '+refCount+'）'+(!refDone?'，还在查…':'');
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
        preselectTimer=setTimeout(function(){ if(g!==detailGen||modal.hidden)return; var beforeFocus=doc.activeElement; sortRefShares(); renderDiskTabs(); runPreselect(); updateSourcesProgress(); paintHealthDots(); applyDetailFilters(); checkUnchecked(); if(doc.activeElement===doc.body&&beforeFocus&&beforeFocus!==doc.body&&doc.documentElement.contains(beforeFocus)){ var vis=true; try{vis=beforeFocus.offsetParent!==null;}catch(e){} if(vis){ try{beforeFocus.focus();}catch(e2){} } } },150);
      }
      if(typeof doc.defaultView.MutationObserver==='function'){
        detailObserver=new doc.defaultView.MutationObserver(function(){ schedulePreselect(); });
        detailObserver.observe(refBox,{childList:true,subtree:true});
      }
      var visibleCheckTimer=null;
      modal.onscroll=function(){if(visibleCheckTimer)clearTimeout(visibleCheckTimer);visibleCheckTimer=setTimeout(function(){visibleCheckTimer=null;if(!scope.active||g!==detailGen||modal.hidden)return;[panMode,mipanMode,qupanMode,tgMode].forEach(function(m){if(m&&m.rerunCheck)m.rerunCheck();});checkUnchecked();},150);};
      schedulePreselect();startSelected();
      function diskRank(type){var order=typeof o.getDiskOrder==='function'?o.getDiskOrder():(Array.isArray(o.diskOrder)?o.diskOrder:[]),index;if(!Array.isArray(order))order=[];index=order.indexOf(type);return index<0?999:index;}
    }
    modal.onclick=function(e){if(e.target===modal)close();};
    function key(e){var k=e.key||({4:'Escape'}[e.keyCode]);if(k==='Escape'||k==='BrowserBack'||k==='GoBack'||k==='Back'){if(historyEdit){e.preventDefault();e.stopImmediatePropagation();exitHistoryEdit();return;}if(!modal.hidden){e.preventDefault();e.stopImmediatePropagation();close();}}}
    doc.addEventListener('keydown',key,true);
    function show(){o.container.hidden=false;if(!loadedHome){if(routeSection==='home'||routeSection==='for-you')home(routeSection,true);else browse(routeSection,{fromRoute:true,route:routeSection});}}
    function hide(){o.container.hidden=true;}
    function inspect(){return {section:section,page:page,count:rows.length,filters:filters,detailOpen:!modal.hidden,railCount:content.querySelectorAll('.discovery-rail').length};}
    if(routeSection==='home'||routeSection==='for-you')home(routeSection,true);else browse(routeSection,{fromRoute:true,route:routeSection});
    return {consumeBack:function(){if(!historyEdit)return false;var active=doc.activeElement;exitHistoryEdit();if(active&&doc.documentElement.contains(active))try{active.focus();}catch(e){}return true;},show:show,hide:hide,home:home,browse:browse,refreshHistory:refreshHistory,open:open,load:function(){return section==='home'?home():loadBrowse();},inspect:inspect,destroy:function(){if(browseCleanup){browseCleanup();browseCleanup=null;}if(browseSentinelObserver){browseSentinelObserver.disconnect();browseSentinelObserver=null;}close();clearImages(content);if(imageObserver){imageObserver.disconnect();imageObserver=null;}gen++;historyRequestId++;doc.removeEventListener('keydown',key,true);doc.removeEventListener('focusin',syncTopbar,false);doc.body.classList.remove('gg-topbar-collapsed');doc.defaultView.removeEventListener('popstate',onRoutePop,false);box.remove();modal.remove();}};
  }
  root.GGDiscovery={mount:mount};
}(this));










