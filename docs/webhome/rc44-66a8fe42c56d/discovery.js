(function (root) {
  'use strict';
  function mount(o) {
    var doc=o.container.ownerDocument, data=root.GGDiscoveryData, gen=0, detailGen=0, page=1, loadedHome=false, rows=[], focusBack=null, ref=null, imageObserver=null;
    var nativeSelections={movie:{},tv:{}}, filters={type:'movie',genre:'',region:'',year:'',sort:'T'}, section='home', activeNav='home', routeSection='home', filteredBrowse=false, routeToken='ggs-'+new Date().getTime()+'-'+Math.floor(Math.random()*1000000000), routeOrigin=doc.defaultView.location.protocol+'//'+doc.defaultView.location.host, choices=data.filters(), renderedRailIds={},historyRequestId=0,historyScope=null,pendingHistoryRefresh=false;
    try { var saved=JSON.parse(localStorage.getItem('gg.discovery.filters')||'{}'); Object.keys(filters).forEach(function(k){if(typeof saved[k]==='string'&&k!=='type')filters[k]=saved[k];}); } catch(e) {}
    function el(tag,cls,text){var n=doc.createElement(tag);n.className=cls||'';if(text!==undefined&&text!==null)n.textContent=text;return n;}
    var box=el('section','discovery'),tabs=el('div','discovery-types'),content=el('div','discovery-content');
    tabs.hidden=false;
    box.appendChild(tabs);box.appendChild(content);o.container.appendChild(box);
    var routeReplace=false;
    function syncTopbar(){var a=doc.activeElement,top=doc.querySelector('.topbar');if(!a)return;if(content.contains(a))doc.body.classList.add('gg-topbar-collapsed');else if(!a.closest||!a.closest('.modal[role="dialog"],.discovery-modal[role="dialog"],.ref-dialog[role="dialog"]'))doc.body.classList.remove('gg-topbar-collapsed');}
    doc.addEventListener('focusin',syncTopbar,false);
    var modal=el('section','discovery-modal');modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','影片详情与找源');doc.body.appendChild(modal);
    var deleteLayer=el('section','discovery-modal discovery-delete-layer');deleteLayer.hidden=true;deleteLayer.setAttribute('role','dialog');deleteLayer.setAttribute('aria-modal','true');deleteLayer.setAttribute('aria-label','删除最近观看记录');doc.body.appendChild(deleteLayer);
    function save(){try{localStorage.setItem('gg.discovery.filters',JSON.stringify(filters));}catch(e){}}
    function sectionChange(value){section=value;if(typeof o.onSectionChange==='function')o.onSectionChange(value);}
    function routeUrl(value){var href=doc.defaultView.location.href,hashAt=href.indexOf('#'),hash=hashAt<0?'':href.slice(hashAt),base=hashAt<0?href:href.slice(0,hashAt),queryAt=base.indexOf('?'),path=queryAt<0?base:base.slice(0,queryAt),parts=queryAt<0?[]:base.slice(queryAt+1).split('&'),kept=[],i,key;for(i=0;i<parts.length;i++){key=parts[i].split('=')[0];if(key!=='gg_section')kept.push(parts[i]);}if(value&&value!=='home')kept.push('gg_section='+encodeURIComponent(value));return path+(kept.length?'?'+kept.join('&'):'')+hash;}
    function routeState(value){var current=doc.defaultView.history.state,state={},key;if(current&&typeof current==='object')for(key in current)if(Object.prototype.hasOwnProperty.call(current,key))state[key]=current[key];state.ggSectionHistoryOwner=routeToken;state.ggSection=value;return state;}
    function readRoute(){var match=/(?:\?|&)gg_section=([^&#]*)/.exec(doc.defaultView.location.href);if(!match)return 'home';try{return decodeURIComponent(match[1]);}catch(e){return 'home';}}
    function setRoute(value,push){var win=doc.defaultView,origin=win.location.protocol+'//'+win.location.host;if(origin!==routeOrigin)return;if(value===routeSection)return;if(push)try{if(routeReplace)win.history.replaceState(routeState(value),'',routeUrl(value));else win.history.pushState(routeState(value),'',routeUrl(value));}catch(e){return;}routeSection=value;}
    function activeType(){Array.prototype.forEach.call(tabs.children,function(b){b.classList.toggle('active',b.dataset.type===activeNav);b.setAttribute('aria-pressed',String(b.dataset.type===activeNav));});}
    function normalizedImageUrl(url){if(/https:\/\/img\d+\.doubanio\.com\//.test(url||''))return url.replace(/https:\/\/img\d+\.doubanio\.com\//,'https://img2.doubanio.com/');return url;}
    function loadImage(img){var url=img.getAttribute('data-gg-src');if(!url)return;if(imageObserver)imageObserver.unobserve(img);img.removeAttribute('data-gg-src');img.__ggImageUrl=url;img.src=o.imageSource(url);}
    function clearImages(container){if(!imageObserver||!container)return;var images=container.querySelectorAll('img[data-gg-src]');for(var i=0;i<images.length;i++)imageObserver.unobserve(images[i]);}
    if(typeof doc.defaultView.IntersectionObserver==='function')imageObserver=new doc.defaultView.IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting||entry.intersectionRatio>0)loadImage(entry.target);});},{root:null,rootMargin:'400px 400px',threshold:0});
    function image(url,cls,priority){var img=el('img',cls),attempt=0;url=normalizedImageUrl(url);img.alt='';img.referrerPolicy='no-referrer';img.onerror=function(){var current=img.__ggImageUrl||url;if(attempt===0&&/https:\/\/img2\.doubanio\.com\//.test(current)){attempt++;current=current.replace('https://img2.','https://img1.');img.__ggImageUrl=current;img.src=o.imageSource(current);return;}img.hidden=true;var fallback=el('span','discovery-no-image','海报暂不可用');if(img.parentNode&&!img.parentNode.querySelector('.discovery-no-image'))img.parentNode.appendChild(fallback);};if(priority||!imageObserver)img.src=o.imageSource(url);else{img.setAttribute('data-gg-src',url);imageObserver.observe(img);}return img;}
    function typedRow(row,type){var copy={},key;for(key in row)if(Object.prototype.hasOwnProperty.call(row,key))copy[key]=row[key];copy.discoveryType=type;return copy;}
    var HIDDEN_HISTORY_KEY='gg.webhome.hidden-history-v1';
    var tmdbCache={};
    function readHiddenHistory(){ try{ var v=JSON.parse(localStorage.getItem(HIDDEN_HISTORY_KEY)||'[]'); return Array.isArray(v)?v:[]; }catch(e){ return []; } }
    var deleteTargetCard=null,deleteTargetRow=null;
    function closeDeleteLayer(){
      if(deleteLayer.hidden)return;
      deleteLayer.hidden=true;deleteLayer.textContent='';
      deleteTargetCard=null;deleteTargetRow=null;
      if(pendingHistoryRefresh){pendingHistoryRefresh=false;setTimeout(refreshHistory,0);}
    }
    function openDeleteLayer(cardEl,row){
      if(!cardEl||!deleteLayer.hidden)return;
      deleteTargetCard=cardEl;deleteTargetRow=row;
      deleteLayer.textContent='';
      var panel=el('div','discovery-detail');
      panel.appendChild(el('h2','','删除这条记录？'));
      panel.appendChild(el('p','discovery-delete-title',row.title||''));
      panel.appendChild(el('p','discovery-delete-note','只在本页隐藏这条记录，宿主 App 里的观看历史不会被删除。'));
      var actions=el('div','discovery-delete-actions'),confirm=el('button','subbutton discovery-delete-confirm','删除'),cancel=el('button','subbutton discovery-close','取消');
      confirm.type='button';cancel.type='button';
      confirm.onclick=function(){ var c=deleteTargetCard,r=deleteTargetRow; closeDeleteLayer(); deleteHistory(c,r); };
      cancel.onclick=function(){ var c=deleteTargetCard; closeDeleteLayer(); if(c&&doc.documentElement.contains(c)){ try{c.focus();}catch(e){} } };
      actions.appendChild(confirm);actions.appendChild(cancel);panel.appendChild(actions);
      deleteLayer.appendChild(panel);deleteLayer.hidden=false;
      try{cancel.focus();}catch(e){}
    }
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
      function startHold(){ clearHold(); holdTimer=setTimeout(function(){ holdTimer=null; suppressClick=true; openDeleteLayer(b,row); },800); }
      if(row.history){
        b.setAttribute('data-gg-longpress','history');
        b.addEventListener('gg-longpress',function(){ openDeleteLayer(b,row); },false);
        b.addEventListener('mousedown',startHold,false);
        b.addEventListener('touchstart',startHold,false);
        b.addEventListener('mouseup',clearHold,false);
        b.addEventListener('mouseleave',clearHold,false);
        b.addEventListener('touchend',clearHold,false);
        b.addEventListener('touchcancel',clearHold,false);
      }
      b.onclick=function(){ if(suppressClick){ suppressClick=false; return; } var item=typedRow(row,type);if(row.history&&typeof o.onHistory==='function')o.onHistory(row);else open(item);};return b;}
    function renderRail(rail){var id=String(rail&&rail.id||rail&&rail.title||('rail-'+Object.keys(renderedRailIds).length)),existing=null,nodes,i;if(renderedRailIds[id])return;renderedRailIds[id]=true;nodes=content.querySelectorAll('.discovery-rail');for(i=0;i<nodes.length;i++)if(nodes[i].dataset.rail===id){existing=nodes[i];break;}var node=el('section','discovery-rail'),head=el('div','discovery-rail-heading'),track=el('div','discovery-rail-track');node.dataset.rail=id;head.appendChild(el('h2','',rail&&rail.title||'豆瓣推荐'));node.appendChild(head);if(rail&&rail.error||!rail||!rail.items||!rail.items.length){var message=el('p','discovery-rail-error',rail&&rail.error?'暂时无法读取：'+rail.error:'暂时没有可显示的推荐');var retry=el('button','subbutton discovery-rail-retry','重试');retry.type='button';retry.onclick=function(){retry.disabled=true;message.textContent='正在重试…';delete renderedRailIds[id];var got=false;function update(next){if(!next||String(next.id||next.title)!==id)return;got=true;delete renderedRailIds[id];renderRail(next);}if(typeof data.recommendations==='function')Promise.resolve(data.recommendations(o.request,update)).then(function(list){if(!got&&Array.isArray(list))list.forEach(update);},function(){message.textContent='重试失败，请稍后再试。';retry.disabled=false;});else retry.disabled=false;};node.appendChild(message);node.appendChild(retry);}else{rail.items.forEach(function(item){track.appendChild(card(item,rail.type||item.discoveryType||item.type||'movie'));});node.appendChild(track);}if(existing&&existing.parentNode)existing.parentNode.replaceChild(node,existing);else if(id==='recently-watched'){var firstRail=content.querySelector('.discovery-rail');if(firstRail)content.insertBefore(node,firstRail);else content.appendChild(node);}else content.appendChild(node);}
    function historyRail(){return content.querySelector('.discovery-rail[data-rail="recently-watched"]');}
    function renderHistory(items,state,scope){
      var previous=historyRail(),active=doc.activeElement,hadFocus=!!(previous&&previous.contains(active)),focusId=hadFocus&&active.dataset?active.dataset.id:'',oldTrack=previous&&previous.querySelector('.discovery-rail-track'),oldCards=oldTrack?oldTrack.querySelectorAll('.discovery-card'):[],focusIndex=Array.prototype.indexOf.call(oldCards,active),left=oldTrack?oldTrack.scrollLeft:0,scrollY=doc.defaultView.pageYOffset,signature=JSON.stringify([scope,state,items.map(function(row){return [row.id,row.title,row.image];})]);
      if(previous&&previous.__historySignature===signature){var oldNotice=previous.querySelector('.history-refresh-error');if(oldNotice)oldNotice.remove();return;}
      var node=el('section','discovery-rail'),head=el('div','discovery-rail-heading');node.dataset.rail='recently-watched';node.__historySignature=signature;head.appendChild(el('h2','','最近观看'));node.appendChild(head);
      if(items.length){var track=el('div','discovery-rail-track');items.forEach(function(row){track.appendChild(card(row,'movie'));});node.appendChild(track);track.scrollLeft=left;}
      else{node.appendChild(el('p','discovery-rail-error',state==='loading'?'正在读取观看记录…':state==='error'?'暂时无法读取观看记录，请重试。':'当前点播配置暂无观看记录。'));if(state==='error'){var retry=el('button','subbutton discovery-rail-retry','重试');retry.type='button';retry.onclick=refreshHistory;node.appendChild(retry);}}
      if(previous&&previous.parentNode){clearImages(previous);previous.parentNode.replaceChild(node,previous);}else{var first=content.querySelector('.discovery-rail');if(first)content.insertBefore(node,first);else content.appendChild(node);}
      if(hadFocus){var cards=node.querySelectorAll('.discovery-card'),i,target=null;for(i=0;i<cards.length;i++)if(cards[i].dataset.id===focusId){target=cards[i];break;}if(!target&&cards.length)target=cards[Math.min(Math.max(0,focusIndex),cards.length-1)];if(!target)target=tabs.querySelector('.discovery-type.active');if(target){try{target.focus();}catch(e){}}if(oldTrack&&node.querySelector('.discovery-rail-track'))node.querySelector('.discovery-rail-track').scrollLeft=left;if(Math.abs(doc.defaultView.pageYOffset-scrollY)>4)doc.defaultView.scrollTo(0,scrollY);}
    }
    function refreshHistory(){
      if(section!=='home'||o.container.hidden||typeof o.loadHistory!=='function')return Promise.resolve();
      if(!deleteLayer.hidden){pendingHistoryRefresh=true;return Promise.resolve();}
      var ticket=++historyRequestId,generation=gen;if(!historyRail())renderHistory([],'loading',null);
      return Promise.resolve().then(function(){return o.loadHistory();}).then(function(result){
        if(ticket!==historyRequestId||generation!==gen||section!=='home'||o.container.hidden)return;
        if(!deleteLayer.hidden){pendingHistoryRefresh=true;return;}
        if(!result||!Array.isArray(result.items))throw new Error('invalid history');
        var hidden=readHiddenHistory(),items=result.items.filter(function(row){return row&&(!row.history||hidden.indexOf(row.history.key)<0);});historyScope=result.scope===undefined?null:result.scope;renderHistory(items,'ready',historyScope);
      }).catch(function(error){
        if(ticket!==historyRequestId||generation!==gen||section!=='home'||o.container.hidden)return;
        if(!deleteLayer.hidden){pendingHistoryRefresh=true;return;}
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
      function gotRail(rail){if(generation!==gen||section!=='home')return;if(rail&&Array.isArray(rail.items)){rail.items=rail.items.filter(function(it){var id=it&&it.id;if(!id)return true;if(seenHomeIds[id])return false;seenHomeIds[id]=true;return true;});if(!rail.items.length&&!rail.error)return;}clearSkeletons();renderRail(rail);if(content.querySelector('.discovery-rail'))status.remove();}
      if(typeof data.recommendations==='function'){
        var result;try{result=data.recommendations(o.request,gotRail);}catch(e){result=Promise.reject(e);}
        return Promise.resolve(result).then(function(rails){if(generation!==gen||section!=='home')return; if(Array.isArray(rails))rails.forEach(gotRail);clearSkeletons();if(!content.querySelector('.discovery-rail'))status.textContent='推荐暂时不可用，请稍后重试。';else status.remove();},function(){if(generation===gen){clearSkeletons();if(!content.querySelector('.discovery-rail'))status.textContent='推荐暂时不可用，请稍后重试。';}});
      }
      return data.list({type:'movie',sort:'T'},1,o.request).then(function(result){if(generation===gen)gotRail({id:'douban',title:'豆瓣推荐',items:result.items});},function(){if(generation===gen){clearSkeletons();status.textContent='推荐暂时不可用，请稍后重试。';}});
    }
    function renderBrowseHeader(){var head=el('div','discovery-browse-head'),title=el('h1','discovery-browse-title',(navCategories.filter(function(t){return t.id===activeNav;})[0]||choices.type.filter(function(t){return t.id===section;})[0]||{name:'电影'}).name);head.appendChild(title);content.appendChild(head);}
    function renderGrid(items){var grid=content.querySelector('.discovery-grid');if(!grid){grid=el('div','discovery-grid');content.appendChild(grid);}grid.textContent='';items.forEach(function(row){grid.appendChild(card(row,section));});return grid;}
    var pendingFilterFocus=false;
    function renderInlineFilters(){var kind=filters.type==='tv'?'tv':'movie',groups=data.nativeFilters(kind),current=nativeSelections[kind]||{},wrap=el('div','discovery-inline-filters');groups.forEach(function(group){var row=el('div','discovery-filter-row'),lab=el('span','discovery-filter-label',group.name),opts=el('div','discovery-filter-options');row.appendChild(lab);group.value.forEach(function(item){var b=el('button','discovery-filter-chip',item.n);b.type='button';b.dataset.group=group.key;b.dataset.value=item.v;var cur=current[group.key];if(cur===undefined)cur=group.value[0].v;if(cur===item.v)b.classList.add('active');b.setAttribute('aria-pressed',String(cur===item.v));b.onclick=function(){applyInlineFilter(kind,group.key,item.v);};opts.appendChild(b);});row.appendChild(opts);wrap.appendChild(row);});var anyActive=groups.some(function(group){var cur=current[group.key];return cur!==undefined&&cur!==group.value[0].v;});if(anyActive||filteredBrowse){var reset=el('button','subbutton discovery-filter-reset','重置筛选');reset.type='button';reset.onclick=function(){nativeSelections[kind]={};filteredBrowse=false;page=1;loadBrowse();};wrap.appendChild(reset);}content.appendChild(wrap);}
    function applyInlineFilter(kind,groupKey,value){var current=nativeSelections[kind]||{};current[groupKey]=value;nativeSelections[kind]=current;var groups=data.nativeFilters(kind),allDefault=groups.every(function(group){var cur=current[group.key];return cur===undefined||cur===group.value[0].v;});filteredBrowse=!allDefault;page=1;pendingFilterFocus=true;loadBrowse();}
    function loadBrowse(){var g=++gen;loadedHome=true;page=Math.max(1,page);clearImages(content);content.textContent='';renderBrowseHeader();renderInlineFilters();var status=el('p','discovery-status','正在读取豆瓣片单…'),grid=el('div','discovery-grid');grid.setAttribute('aria-busy','true');content.appendChild(status);content.appendChild(grid);for(var bsi=0;bsi<6;bsi++){var bsc=el('div','discovery-card discovery-skeleton');bsc.appendChild(el('div','discovery-poster'));bsc.appendChild(el('span','discovery-skeleton-title'));grid.appendChild(bsc);}var paging=el('div','discovery-paging'),prev=el('button','subbutton','上一页'),label=el('span','','第 '+page+' 页'),next=el('button','subbutton','下一页');prev.disabled=page<=1;next.disabled=true;prev.onclick=function(){if(page>1){page--;loadBrowse();}};next.onclick=function(){page++;loadBrowse();};paging.appendChild(prev);paging.appendChild(label);paging.appendChild(next);content.appendChild(paging);
      var request=filteredBrowse?data.nativeList(filters.type,nativeSelections[filters.type],page,o.request):(typeof data.categoryList==='function'?data.categoryList(section,page,o.request):data.list(filters,page,o.request));return request.then(function(result){if(g!==gen)return;rows=result.items||[];renderGrid(rows);if(pendingFilterFocus){pendingFilterFocus=false;var fc=grid.querySelector('.discovery-card');if(fc){try{fc.focus();}catch(e){}}}status.textContent=rows.length?'豆瓣 · 第 '+page+' 页':'没有符合条件的影片。';label.textContent='第 '+page+' 页';prev.disabled=page<=1;next.disabled=!result.hasMore;grid.setAttribute('aria-busy','false');},function(e){if(g!==gen)return;grid.textContent='';grid.setAttribute('aria-busy','false');status.textContent='片单加载失败：'+(e&&e.message||'请稍后重试');var retry=el('button','subbutton','重试');retry.onclick=loadBrowse;grid.appendChild(retry);next.disabled=true;});
    }
    function browse(type,options){options=options||{};activeNav=type;var known=choices.type.filter(function(t){return t.id===type;})[0];if(!known&&type!=='variety')type='movie';if(options.fromRoute)routeSection=options.route||activeNav;else setRoute(activeNav,true);filters.type=(type==='variety'||type==='anime')?'tv':type==='documentary'?'movie':type;filteredBrowse=!!options.keepFilter;page=1;save();sectionChange(type);activeType();var request=loadBrowse();return request;}
    function filterKind(){return filters.type==='tv'?'tv':'movie';}
    var navCategories=[{id:'home',name:'首页'},{id:'for-you',name:'猜你喜欢'},{id:'movie',name:'热门电影'},{id:'tv',name:'热播剧集'},{id:'anime',name:'热门动漫'},{id:'variety',name:'热播综艺'}];
    function onRoutePop(){var href=doc.defaultView.location.href,target=readRoute(),valid=navCategories.filter(function(item){return item.id===target;})[0];if(/(?:\?|&)gg_overlay=/.test(href)||!valid||target===routeSection)return;routeSection=target;if(target==='home'||target==='for-you')home(target,true);else browse(target,{fromRoute:true,route:target});}
    routeSection=readRoute();
    navCategories.forEach(function(type){var b=el('button','discovery-type',type.name);b.type='button';b.dataset.type=type.id;b.onclick=function(){if(type.id==='home'||type.id==='for-you')home(type.id);else browse(type.id);};b.addEventListener('focus',function(){if(type.id===activeNav)return;routeReplace=true;try{if(type.id==='home'||type.id==='for-you')home(type.id);else browse(type.id);}finally{routeReplace=false;}},false);tabs.appendChild(b);});
    tabs.appendChild(el('span','discovery-types-sep'));
    [['live','直播'],['search','搜索'],['favorites','收藏'],['push','推送'],['settings','设置'],['native','原生点播']].forEach(function(action){var button=el('button','discovery-type',action[1]);button.type='button';button.dataset.action=action[0];button.onclick=function(){if(typeof o.onQuickAction==='function')o.onQuickAction(action[0]);};tabs.appendChild(button);});
    tabs.appendChild(el('span','discovery-types-sep'));
    doc.defaultView.addEventListener('popstate',onRoutePop,false);
    var detailObserver=null,preselectTimer=null,lastCheckAt=0,checkRetryTimer=null;
    function close(){detailGen++;if(detailObserver){detailObserver.disconnect();detailObserver=null;}if(preselectTimer){clearTimeout(preselectTimer);preselectTimer=null;}if(checkRetryTimer){clearTimeout(checkRetryTimer);checkRetryTimer=null;}clearImages(modal);modal.hidden=true;if(ref){ref.destroy();ref=null;}if(focusBack&&doc.documentElement.contains(focusBack))focusBack.focus();}
    function resourceLabel(item){var sourceNames={pan:'PanSou',tg:'TG'},sourceLabel=(item.sources||[]).map(function(source){return sourceNames[source]||source;}).join(' + ');return (root.GGCore.disks[item.type]||item.type||'网盘')+(sourceLabel?' · '+sourceLabel:'')+' · '+item.title;}
    function resourceButton(item,row){var b=el('button','subbutton discovery-resource','');b.type='button';var dot=el('span','discovery-health-dot','');dot.setAttribute('data-state','idle');b.appendChild(dot);b.appendChild(el('span','discovery-resource-label',resourceLabel(item)));b.__ggCandidate={kind:'self',item:item};b.onclick=function(){var selected={},key;for(key in item)if(Object.prototype.hasOwnProperty.call(item,key))selected[key]=item[key];selected.image=row.image||item.image||'';selected.discoveryType=row.discoveryType||row.type||'movie';o.onSelfRow(selected);};return b;}
    function open(row){var g=++detailGen;focusBack=doc.activeElement;if(ref)ref.destroy();clearImages(modal);modal.textContent='';modal.hidden=false;
      var panel=el('div','discovery-detail'),closeBtn=el('button','discovery-close','× 关闭'),head=el('div','discovery-detail-head discovery-detail-hero'),poster=el('div','discovery-detail-poster'),copy=el('div','discovery-detail-copy');closeBtn.type='button';closeBtn.onclick=close;var heroCls=(root.GGCore&&typeof root.GGCore.heroClass==='function')?root.GGCore.heroClass(!!row.backdrop,!!row.image):(row.backdrop?'has-art':(row.image?'poster-only':''));
      if(heroCls)panel.classList.add(heroCls);
      var heroBackdrop=null;
      if(row.backdrop||row.image){heroBackdrop=image(row.backdrop||row.image,'discovery-detail-backdrop',true);heroBackdrop.alt='';panel.appendChild(heroBackdrop);}panel.appendChild(el('div','discovery-detail-shade'));panel.appendChild(closeBtn);if(row.image)poster.appendChild(image(row.image,'discovery-detail-image',true));else poster.appendChild(el('span','discovery-no-image','暂无海报'));head.appendChild(poster);copy.appendChild(el('span','eyebrow','影片详情'));copy.appendChild(el('h2','',row.title));copy.appendChild(el('p','discovery-meta',[row.year,row.rating?'豆瓣 '+row.rating:''].filter(Boolean).join(' · ')));var synopsis=el('p','discovery-synopsis','正在读取简介…');copy.appendChild(synopsis);var synopsisHint=el('button','subbutton discovery-synopsis-hint','双击显示简介');synopsisHint.type='button';copy.appendChild(synopsisHint);function toggleSynopsis(){var show=panel.classList.toggle('show-synopsis');synopsisHint.textContent=show?'双击隐藏简介':'双击显示简介';}synopsisHint.onclick=function(){toggleSynopsis();};head.addEventListener('dblclick',function(e){if(e.target===synopsisHint)return;toggleSynopsis();});head.appendChild(copy);panel.appendChild(head);
      (function(){
        if(row.backdrop||typeof o.getTmdbKey!=='function')return;
        var key=o.getTmdbKey(); if(!key)return;
        var cacheKey=(row.title||'')+'|'+(row.year||'');
        function applyBackdrop(path){
          var url=(root.GGCore&&typeof root.GGCore.tmdbBackdropUrl==='function')?root.GGCore.tmdbBackdropUrl(path):'';
          if(!url)return;
          if(heroBackdrop){
            var originalSrc=heroBackdrop.src,reverted=false;
            heroBackdrop.onerror=function(){ if(!reverted){reverted=true;heroBackdrop.src=originalSrc;panel.classList.remove('has-art');panel.classList.add('poster-only');} };
            heroBackdrop.src=url;
          } else {
            heroBackdrop=el('img','discovery-detail-backdrop');heroBackdrop.alt='';heroBackdrop.referrerPolicy='no-referrer';
            heroBackdrop.onerror=function(){ if(heroBackdrop.parentNode)heroBackdrop.parentNode.removeChild(heroBackdrop);heroBackdrop=null;panel.classList.remove('has-art'); };
            heroBackdrop.src=url;panel.insertBefore(heroBackdrop,panel.firstChild);
          }
          panel.classList.remove('poster-only');panel.classList.add('has-art');
        }
        if(tmdbCache[cacheKey]){ applyBackdrop(tmdbCache[cacheKey]); return; }
        if(typeof o.request!=='function')return;
        var url=(root.GGCore&&typeof root.GGCore.tmdbSearchUrl==='function')?root.GGCore.tmdbSearchUrl(key,row.title,row.year):'';
        if(!url)return;
        o.request(url,{}).then(function(response){
          var body=response&&response.body; if(typeof body==='string'){ try{body=JSON.parse(body);}catch(e){body=null;} }
          var results=body&&Array.isArray(body.results)?body.results:[];
          var path=(root.GGCore&&typeof root.GGCore.tmdbPickBackdrop==='function')?root.GGCore.tmdbPickBackdrop(results,row.title,row.year):'';
          if(path&&g===detailGen){ tmdbCache[cacheKey]=path; applyBackdrop(path); }
        },function(){});
      })();
      var sources=el('section','discovery-sources'),sourcesHead=el('div','discovery-sources-heading'),allSources=el('button','primary discovery-all-sources','查看全部来源');allSources.type='button';allSources.onclick=function(){o.onNativeSearch(row.title,row);};sourcesHead.appendChild(el('h3','','播放源'));sourcesHead.appendChild(allSources);sources.appendChild(sourcesHead);var selfStatus=el('p','discovery-self-status','正在查询 PanSou 与 TG…');sources.appendChild(selfStatus);var diskTabs=el('div','discovery-disk-tabs');diskTabs.hidden=true;sources.appendChild(diskTabs);var selfResults=el('div','discovery-self-results');sources.appendChild(selfResults);var sourcesEmpty=el('p','discovery-sources-empty','暂未找到资源，可查看全部来源或调整搜索范围。');sourcesEmpty.hidden=true;sources.appendChild(sourcesEmpty);var diskNote=el('p','discovery-sources-note','');diskNote.hidden=true;sources.appendChild(diskNote);var sourcesProgress=el('p','discovery-sources-progress','');sourcesProgress.hidden=true;sources.appendChild(sourcesProgress);
      (function(){var a=allowedDisks();if(!a||!a.length)return;var all=Object.keys((root.GGCore&&root.GGCore.disks)||{});if(a.length>=all.length)return;var names=a.map(function(t){return (root.GGCore.disks[t]||t);});var only=(typeof o.getDisplayDisksOnly==='function')&&o.getDisplayDisksOnly();diskNote.textContent=(only?'当前仅显示：':'优先显示：')+names.join('、')+'（设置 → 优先显示网盘可调整）';diskNote.hidden=false;})();var refBox=el('div','discovery-reference-content');sources.appendChild(refBox);panel.appendChild(sources);modal.appendChild(panel);closeBtn.focus();
      var rowType=row.discoveryType||row.type||'movie',detailKind=(rowType==='tv'||rowType==='variety')?'tv':'movie',metaURL='https://m.douban.com/rexxar/api/v2/'+detailKind+'/'+encodeURIComponent(row.id);
      o.request(metaURL,{headers:{Referer:'https://m.douban.com/'}}).then(function(response){var body=response.body;if(typeof body==='string')body=JSON.parse(body);if(body&&body.intro)return body.intro;throw new Error('简介缺失');}).catch(function(){return data.detail(row.id,o.request).then(function(html){var d=new DOMParser().parseFromString(html,'text/html'),n=d.querySelector('#link-report [property="v:summary"], [property="v:summary"], #link-report');if(!n)throw new Error('简介缺失');return n.textContent.replace(/\s+/g,' ').trim();});}).then(function(text){if(g===detailGen)synopsis.textContent=text;},function(){if(g===detailGen)synopsis.textContent='简介暂不可用，下方找源继续进行。';});
      ref=root.GGReferenceSearch.mount({container:refBox,providers:root.GGProviders,request:o.referenceRequest,hideForm:true,hideSites:true,autoResolve:true,directSharesOnly:true,expectedYear:row.year||'',imageSource:o.imageSource,shareFilter:function(share){if(!isAllowedDisk(diskKeyForShare(share)))return false;var u=share&&share.url;if(!u)return true;var k=(root.GGCore&&root.GGCore.dedupKey)?root.GGCore.dedupKey(u):u;return !selfUrlSet[k];},onShare:function(share,source){share.note=source.title||row.title;share.image=row.image;o.onShare(share,source);},onNativeSearch:function(t){o.onNativeSearch(t,row);}});
      var selfDone=false,refDone=false,checkInFlight=false,checkQueued=false,preselectedBtn=null,preselectFrozen=false,preselectFocusDone=false;
      function allowedDisks(){ return (typeof o.getDisplayDisks==='function')?o.getDisplayDisks():null; }
      function isAllowedDisk(type){ if(typeof o.getDisplayDisksOnly==='function'&&o.getDisplayDisksOnly()){ var a=allowedDisks(); return !a||a.indexOf(type)>=0; } return true; }
      function diskKeyForShare(share){ try{ var s=root.GGCore.safeShare(share.url||''); if(s&&s.type)return s.type; }catch(e){} var t=share.type||''; return (root.GGCore.disks&&root.GGCore.disks[t])?t:'other'; }
      function collectCandidates(){
        var list=[],i,btn;
        var selfBtns=selfResults.querySelectorAll('.discovery-resource');
        for(i=0;i<selfBtns.length;i++){ btn=selfBtns[i]; if(btn.__ggCandidate&&btn.offsetParent!==null){ btn.__ggCandidate.button=btn; btn.__ggCandidate.order=list.length; list.push(btn.__ggCandidate); } }
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
      function checkUnchecked(){
        if(typeof o.checkLinks!=='function')return;
        if(checkInFlight){checkQueued=true;return;}
        if(g!==detailGen||modal.hidden)return;
        var now=Date.now();
        if(now-lastCheckAt<4000){
          if(!checkRetryTimer){checkRetryTimer=setTimeout(function(){checkRetryTimer=null;checkUnchecked();},lastCheckAt+4000-now);}
          return;
        }
        var items=checkItemsFor(collectCandidates());
        if(!items.length)return;
        checkInFlight=true;lastCheckAt=Date.now();
        o.checkLinks(items).then(function(results){
          if(g===detailGen)items.forEach(function(it,i){ if(it.button&&doc.documentElement.contains(it.button)){it.button.dataset.ggCheck=results[i]||'unknown';it.button.dataset.ggChecked='1';} });
          checkInFlight=false; if(checkQueued){checkQueued=false;checkUnchecked();} else if(g===detailGen&&!modal.hidden){paintHealthDots();runPreselect();}
        },function(){ checkInFlight=false; if(checkQueued){checkQueued=false;checkUnchecked();} else if(g===detailGen&&!modal.hidden)runPreselect(); });
      }
      function paintHealthDots(){
        var btns=[],i,b,dot,st;
        var selfBtns=selfResults.querySelectorAll('.discovery-resource');
        for(i=0;i<selfBtns.length;i++)btns.push(selfBtns[i]);
        var refBtns=refBox?refBox.querySelectorAll('.ref-auto-share'):[];
        for(i=0;i<refBtns.length;i++)btns.push(refBtns[i]);
        for(i=0;i<btns.length;i++){ b=btns[i]; dot=b.querySelector('.discovery-health-dot'); if(!dot){dot=el('span','discovery-health-dot','');b.insertBefore(dot,b.firstChild);} st=(root.GGCore&&typeof root.GGCore.healthDotState==='function')?root.GGCore.healthDotState(b.dataset.ggCheck||''): 'idle'; dot.setAttribute('data-state',st); }
      }
      function sortRefShares(){var btns=refBox?refBox.querySelectorAll('.ref-auto-share'):[];if(!btns.length)return;var groups=[],i,j,b,p,g;for(i=0;i<btns.length;i++){b=btns[i];p=b.parentNode;if(!p)continue;g=null;for(j=0;j<groups.length;j++)if(groups[j].parent===p){g=groups[j];break;}if(!g){g={parent:p,items:[]};groups.push(g);}g.items.push({btn:b,rank:diskRank(diskKeyForShare(b.__ggShare||{})),index:i});}groups.forEach(function(g){g.items.sort(function(a,b2){return a.rank-b2.rank||a.index-b2.index;});g.items.forEach(function(it){g.parent.appendChild(it.btn);});});}
      var detailDisk=null,detailDiskAuto=true,lastTabSig='';
      function refDiskCounts(){var counts={},btns=refBox?refBox.querySelectorAll('.ref-auto-share'):[];for(var i=0;i<btns.length;i++){var t=diskKeyForShare(btns[i].__ggShare||{});counts[t]=(counts[t]||0)+1;}return counts;}
      function selfDiskCounts(){var counts={};Object.keys(selfGroups).forEach(function(t){if(selfGroups[t].entries.length)counts[t]=selfGroups[t].entries.length;});return counts;}
      function renderDiskTabs(){
        var order=typeof o.getDiskOrder==='function'?o.getDiskOrder():[];
        var tabs=(root.GGCore&&typeof root.GGCore.diskTabList==='function')?root.GGCore.diskTabList(selfDiskCounts(),refDiskCounts(),order):[];
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
        Object.keys(selfGroups).forEach(function(t){selfGroups[t].node.style.display=(!detailDisk||selfGroups[t].type===detailDisk)?'':'none';});
        var btns=refBox?refBox.querySelectorAll('.ref-auto-share'):[];for(var i=0;i<btns.length;i++){var b=btns[i];b.style.display=(!detailDisk||diskKeyForShare(b.__ggShare||{})===detailDisk)?'':'none';}
        var sections=refBox?refBox.querySelectorAll('.ref-site-state'):[];for(var j=0;j<sections.length;j++){var shares=sections[j].querySelectorAll('.ref-auto-share'),any=false;for(var k=0;k<shares.length;k++)if(shares[k].style.display!=='none'){any=true;break;}if(shares.length)sections[j].style.display=any?'':'none';}
      }
      function updateSourcesProgress(){
        var refCount=refBox?refBox.querySelectorAll('.ref-auto-share').length:0,total=selfCount+refCount;
        if(!total){sourcesProgress.hidden=true;return;}
        sourcesProgress.textContent='已找到 '+total+' 条（自建 '+selfCount+' · 参考 '+refCount+'）'+((!selfDone||!refDone)?'，还在查…':'');
        sourcesProgress.hidden=false;
      }
      function updateSourcesHint(){
        if(selfDone&&refDone&&!collectCandidates().length)sourcesEmpty.hidden=false;
        else sourcesEmpty.hidden=true;
      }
      function runPreselect(){
        if(g!==detailGen||modal.hidden||preselectFrozen)return;
        var active=doc.activeElement;
        if(active&&modal.contains(active)&&active!==closeBtn&&active!==modal&&active!==preselectedBtn){preselectFrozen=true;return;}
        var cands=collectCandidates();
        if(!cands.length){updateSourcesHint();return;}
        var ranked=cands.map(function(c){ var type=c.kind==='self'?c.item.type:diskKeyForShare(c.share); return {ok:c.button.dataset.ggCheck==='ok',verifiedClarity:null,rank:diskRank(type),order:c.order,button:c.button}; });
        var bestIdx=(root.GGCore&&typeof root.GGCore.rankPreselect==='function')?root.GGCore.rankPreselect(ranked):(ranked.length?0:-1);
        if(bestIdx<0)return;
        var btn=ranked[bestIdx].button;
        if(!btn||!doc.documentElement.contains(btn))return;
        if(btn!==preselectedBtn){
          if(preselectedBtn&&doc.documentElement.contains(preselectedBtn)){preselectedBtn.classList.remove('is-preselected');var old=preselectedBtn.querySelector('.discovery-preselect-badge,.ref-preselect-badge');if(old&&old.parentNode)old.parentNode.removeChild(old);}
          btn.classList.add('is-preselected');
          if(btn.classList.contains('discovery-resource')){ if(!btn.querySelector('.discovery-preselect-badge'))btn.appendChild(el('span','discovery-preselect-badge','预选')); }
          else if(!btn.querySelector('.ref-preselect-badge'))btn.appendChild(el('span','ref-preselect-badge','预选'));
          preselectedBtn=btn;
        }
        var now=doc.activeElement;
        if(!preselectFocusDone&&(now===closeBtn||now===modal||now===doc.body)){ try{btn.focus();}catch(e){} try{btn.scrollIntoView({block:'nearest',inline:'nearest'});}catch(e2){ try{btn.scrollIntoView(false);}catch(e3){} } preselectFocusDone=true; }
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
        detailObserver.observe(selfResults,{childList:true,subtree:true});
        detailObserver.observe(refBox,{childList:true,subtree:true});
      }
      schedulePreselect();
      var selfGroups={},selfEntries={},selfMessages=[],selfCount=0,selfBatch=30,selfUrlSet={};
      function diskRank(type){var order=typeof o.getDiskOrder==='function'?o.getDiskOrder():(Array.isArray(o.diskOrder)?o.diskOrder:[]),index;if(!Array.isArray(order))order=[];index=order.indexOf(type);return index<0?999:index;}
      function ensureSelfGroup(type){var state=selfGroups[type],diskName=root.GGCore.disks[type]||type,before=null,beforeRank=1000,key,other,rank;if(state)return state;state={type:type,entries:[],rendered:0,node:el('section','discovery-source-group'),heading:el('h4','',diskName+'（0）'),list:el('div','discovery-self-list'),more:el('button','subbutton discovery-load-more','加载更多')};state.more.type='button';state.more.hidden=true;state.more.onclick=function(){var start=state.rendered,end=Math.min(state.entries.length,start+selfBatch),i,entry,hadFocus=doc.activeElement===state.more;for(i=start;i<end;i++){entry=state.entries[i];if(!entry.button){entry.button=resourceButton(entry.item,row);state.list.appendChild(entry.button);}}state.rendered=end;state.more.hidden=state.rendered>=state.entries.length;if(hadFocus&&!state.more.hidden)state.more.focus();else if(hadFocus&&state.rendered>start&&state.entries[start].button)state.entries[start].button.focus();};state.node.appendChild(state.heading);state.node.appendChild(state.list);state.node.appendChild(state.more);selfGroups[type]=state;Object.keys(selfGroups).forEach(function(existing){other=selfGroups[existing];rank=diskRank(existing);if(existing!==type&&rank>diskRank(type)&&rank<beforeRank){before=other.node;beforeRank=rank;}});selfResults.insertBefore(state.node,before);return state;}
      function updateSelfStatus(done,result){var parts=[];if(selfCount)parts.push('自建已预查 '+selfCount+' 条，点上方网盘切换查看；'+(done?'选择资源后交给播放器。':'仍在查询其他来源。'));if(selfMessages.length)parts.push(selfMessages.join('；'));if(!parts.length)parts.push(done?(result&&result.message||'暂未找到自建资源，可查看全部来源。'):'正在查询 PanSou 与 TG…');selfStatus.textContent=parts.join(' ');}
      function addSelfResult(result,done){if(g!==detailGen)return;result=result||{};var incoming=Array.isArray(result.rows)?result.rows:[],message=result.message||'',sourceNames={pan:'PanSou',tg:'TG'},error=result.error;if(!incoming.length&&result.id&&result.title)incoming=[result];if(error&&!message)message=(sourceNames[result.source]||result.source||'来源')+'：'+(error.message||error);if(message&&selfMessages.indexOf(message)<0)selfMessages.push(message);incoming.forEach(function(item){if(!item||!item.title)return;var type=item.type||'other';if(!isAllowedDisk(type))return;if(item.url){try{var dk=(root.GGCore&&root.GGCore.dedupKey)?root.GGCore.dedupKey(item.url):item.url;selfUrlSet[dk]=true;}catch(e){}}var key=String(item.id||item.url||(type+'|'+item.title)),entry=selfEntries[key],state;if(entry){if(item.sources&&item.sources.length){entry.item.sources=entry.item.sources||[];item.sources.forEach(function(source){if(entry.item.sources.indexOf(source)<0)entry.item.sources.push(source);});}if(entry.button){var lbl=entry.button.querySelector('.discovery-resource-label');if(lbl)lbl.textContent=resourceLabel(entry.item);else entry.button.textContent=resourceLabel(entry.item);}return;}state=ensureSelfGroup(type);entry={key:key,item:item,button:null};selfEntries[key]=entry;state.entries.push(entry);selfCount++;state.heading.textContent=(root.GGCore.disks[type]||type)+'（'+state.entries.length+'）';if(state.rendered<selfBatch){entry.button=resourceButton(item,row);state.list.appendChild(entry.button);state.rendered++;}state.more.hidden=state.rendered>=state.entries.length;});updateSelfStatus(done,result);}
      Promise.resolve().then(function(){return o.searchSelf(row.title,function(partial){addSelfResult(partial,false);});}).then(function(result){addSelfResult(result,true);if(g===detailGen){selfDone=true;schedulePreselect();}},function(){if(g!==detailGen)return;if(selfMessages.indexOf('自建资源暂时不可用')<0)selfMessages.push('自建资源暂时不可用');updateSelfStatus(true,null);if(g===detailGen){selfDone=true;schedulePreselect();}});
    }
    modal.onclick=function(e){if(e.target===modal)close();};
    function key(e){var k=e.key||({4:'Escape'}[e.keyCode]);if(k==='Escape'||k==='BrowserBack'||k==='GoBack'){if(!deleteLayer.hidden){e.preventDefault();e.stopImmediatePropagation();var c=deleteTargetCard;closeDeleteLayer();if(c&&doc.documentElement.contains(c)){try{c.focus();}catch(e2){}}return;}if(!modal.hidden){e.preventDefault();e.stopImmediatePropagation();close();}}}
    doc.addEventListener('keydown',key,true);
    function show(){o.container.hidden=false;if(!loadedHome){if(routeSection==='home'||routeSection==='for-you')home(routeSection,true);else browse(routeSection,{fromRoute:true,route:routeSection});}}
    function hide(){o.container.hidden=true;}
    function inspect(){return {section:section,page:page,count:rows.length,filters:filters,detailOpen:!modal.hidden,railCount:content.querySelectorAll('.discovery-rail').length};}
    if(routeSection==='home'||routeSection==='for-you')home(routeSection,true);else browse(routeSection,{fromRoute:true,route:routeSection});
    return {show:show,hide:hide,home:home,browse:browse,refreshHistory:refreshHistory,open:open,load:function(){return section==='home'?home():loadBrowse();},inspect:inspect,destroy:function(){close();if(!deleteLayer.hidden)closeDeleteLayer();clearImages(content);if(imageObserver){imageObserver.disconnect();imageObserver=null;}gen++;historyRequestId++;doc.removeEventListener('keydown',key,true);doc.removeEventListener('focusin',syncTopbar,false);doc.body.classList.remove('gg-topbar-collapsed');doc.defaultView.removeEventListener('popstate',onRoutePop,false);box.remove();modal.remove();deleteLayer.remove();}};
  }
  root.GGDiscovery={mount:mount};
}(this));





