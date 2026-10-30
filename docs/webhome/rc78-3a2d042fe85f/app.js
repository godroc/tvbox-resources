(function () {
  'use strict';
  var searchEditing=true,focusedCheckHold=null;
  var referenceMixRows=[],playbackReturn=null,mixMode=false,mixOrder=[],mixPage=1,mixRefresh=true;
  var C=window.GGCore,doc=document,catalog=null,discovery=null,referenceSearch=null,viewMode='home',navigation=null,overlayHistory=null,deviceKnown=false,chromeRequest='',chromeUI=null,searchInput=null;
  function $(id){return doc.getElementById(id);}
  function all(selector,root){return Array.prototype.slice.call((root||doc).querySelectorAll(selector));}
  function element(tag,className,text){var e=doc.createElement(tag);if(className)e.className=className;if(typeof text!=='undefined')e.textContent=text;return e;}
  function read(key,fallback){try{var v=localStorage.getItem('gg.webhome.'+key);return v===null?fallback:JSON.parse(v);}catch(e){return fallback;}}
  function write(key,value){try{localStorage.setItem('gg.webhome.'+key,JSON.stringify(value));return true;}catch(e){return false;}}
  function remove(key){try{localStorage.removeItem('gg.webhome.'+key);}catch(e){}}
  var PUSH_ARTWORK_KEY='gg.webhome.push-artwork-v1',pushArtworkChain=Promise.resolve();
  function readPushArtworkMap(){var m=read('push-artwork-v1',{});return m&&typeof m==='object'?m:{};}
  function cachePushArtwork(fm,url,title,pic,wallPic){
    if(!url||(!pic&&!wallPic))return;
    try{var map=readPushArtworkMap();if(C&&C.artworkMapSet)map=C.artworkMapSet(map,url,title,pic,wallPic);else map[url]={pic:pic||'',wallPic:wallPic||'',title:title||'',t:Date.now()};write('push-artwork-v1',map);}catch(e){}
    if(fm&&fm.cache&&typeof fm.cache.get==='function'&&typeof fm.cache.set==='function'){
      pushArtworkChain=pushArtworkChain.then(function(){
        return Promise.resolve().then(function(){return fm.cache.get(PUSH_ARTWORK_KEY);}).then(function(raw){
          var map={};try{map=raw?JSON.parse(raw):{};}catch(e){map={};}
          if(!map||typeof map!=='object')map={};
          if(C&&C.artworkMapSet)map=C.artworkMapSet(map,url,title,pic,wallPic);else map[url]={pic:pic||'',wallPic:wallPic||'',title:title||'',t:Date.now()};
          return fm.cache.set(PUSH_ARTWORK_KEY,JSON.stringify(map));
        });
      }).catch(function(){});
    }
  }
  function loadPushArtworkMap(fm){
    var merged=readPushArtworkMap();
    if(!fm||!fm.cache||typeof fm.cache.get!=='function')return Promise.resolve(merged);
    return Promise.resolve().then(function(){return fm.cache.get(PUSH_ARTWORK_KEY);}).then(function(raw){
      var map={};try{map=raw?JSON.parse(raw):{};}catch(e){map={};}
      if(map&&typeof map==='object')Object.keys(map).forEach(function(k){merged[k]=map[k];});
      return merged;
    }).catch(function(){return merged;});
  }
  var defaults={diskOrder:['quark','tianyi','aliyun','baidu','uc','123','xunlei','mobile','115','guangya','pikpak'],sourceOrder:['pan'],pageSize:24,grouped:true};
  var prefs=read('preferences.v1',defaults);if(!prefs||typeof prefs!=='object')prefs=defaults;
  prefs.diskOrder=Array.isArray(prefs.diskOrder)?prefs.diskOrder.filter(function(x){return !!C.disks[x];}):defaults.diskOrder.slice();
  prefs.sourceOrder=['pan'];
  prefs.pageSize=[24,40,60].indexOf(Number(prefs.pageSize))>=0?Number(prefs.pageSize):24;prefs.grouped=prefs.grouped!==false;
  if(!Array.isArray(prefs.displayDisks))prefs.displayDisks=['quark'];else prefs.displayDisks=prefs.displayDisks.filter(function(x){return !!C.disks[x];});
  var refKeys=window.GGProviders?window.GGProviders.definitions.map(function(d){return d.key;}):[];
  var scopeDefaults=C.defaultSearchScope(prefs.sourceOrder,refKeys);
  if(!Array.isArray(prefs.searchRef))prefs.searchRef=scopeDefaults.ref;else prefs.searchRef=prefs.searchRef.filter(function(k){return refKeys.indexOf(k)>=0;});
  if(typeof prefs.displayDisksOnly!=='boolean')prefs.displayDisksOnly=false;
  if(typeof prefs.tmdbKey!=='string')prefs.tmdbKey='';
  if(typeof prefs.prefetchPan!=='boolean')prefs.prefetchPan=true;
  if(typeof prefs.prefetchMipan!=='boolean')prefs.prefetchMipan=true;
  function diskPriorityOrder(){ return C.priorityDiskOrder(prefs.displayDisks,prefs.diskOrder); }
  var credential=read('device-key.v1','');if(!C.validKey(credential))credential='';
  var recent=read('recent.v1',[]);if(!Array.isArray(recent))recent=[];recent=recent.filter(function(x){return typeof x==='string'&&x.length<=120;}).slice(0,8);
  var favorites=read('favorites.v1',[]);if(!Array.isArray(favorites))favorites=[];favorites=favorites.filter(function(x){return x&&C.safeShare(x.url)&&typeof x.id==='string'&&Array.isArray(x.sources)&&Array.isArray(x.tags);}).slice(0,300);
  var savedFilters=read('filters.v1',{}),cache={},cacheKeys=[],generation=0,focusRestore=null,toastTimer=null,selected=null,bridgeReady=false,pageOrder=null;
  var state={query:'',rows:[],source:'all',disk:'',page:1,grouped:prefs.grouped,favorites:false,active:{pan:'idle',tg:'idle'},errors:{},filter:{quality:'',keepUnknownQuality:true,sort:'relevance',since:'0',minSize:'0',exclude:'',keepUnknown:true}};
  ['quality','keepUnknownQuality','sort','since','minSize','exclude','keepUnknown'].forEach(function(k){if(typeof savedFilters[k]===typeof state.filter[k])state.filter[k]=savedFilters[k];});
  var F=window.GGSearchFilters,checkFilter=read('search-check-filter.v1',null),filterRenderTimer=null;
  if(!Array.isArray(checkFilter))checkFilter=F.states.filter(function(k){return k!=='bad';});else checkFilter=checkFilter.filter(function(k){return F.states.indexOf(k)>=0;});
  state.filter.quality=F.selected(state.filter.quality).join('|');
  function displayMatchBase(row){return F.quality(row,state.filter.quality,state.filter.keepUnknownQuality)&&(state.favorites||checkFilter.indexOf(F.category(row,window.GGCheckLedger))>=0);}
  function displayMatch(row){return !!(focusedCheckHold&&row.id===focusedCheckHold.id)||displayMatchBase(row);}
  function holdFocusedCheckChange(){var target=doc.activeElement,card=target&&target.closest&&target.closest('#searchGroups [data-id]');if(!card&&focusRestore&&doc.querySelector('.modal:not([hidden])'))card=focusRestore.closest&&focusRestore.closest('#searchGroups [data-id]');if(card&&card.__ggPanShare&&!displayMatchBase(card.__ggPanShare))focusedCheckHold={id:card.dataset.id};}
  doc.addEventListener('focusin',function(e){if(focusedCheckHold){var card=e.target.closest&&e.target.closest('[data-id]');if(!card||card.dataset.id!==focusedCheckHold.id){focusedCheckHold=null;setTimeout(function(){renderFilterViews();},60);}}});
  var providerNames={pan:'盘搜 · 自建'},providerTexts={idle:'等待搜索',loading:'搜索中…',pending:'后台搜索中…',done:'搜索完成',partial:'部分结果',error:'请求失败',unauthorized:'密钥不可用',rate:'请求较频繁',skipped:'未选中搜索源'};
  function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(function(){$('toast').hidden=true;},3200);}
  function waitSdk(timeout){
    return new Promise(function(resolve,reject){
      var ended=false,timer=null,interval=null;
      function finish(ok){if(ended)return;ended=true;clearTimeout(timer);clearInterval(interval);window.removeEventListener('fmsdk',probe);if(ok)resolve(window.fm);else reject(new Error('播放器接口尚未就绪，请确认使用支持 WebHome 的客户端后重试。'));}
      function probe(){if(window.fm&&typeof window.fm.req==='function')finish(true);}
      window.addEventListener('fmsdk',probe);interval=setInterval(probe,150);timer=setTimeout(function(){finish(false);},timeout||10000);probe();
    });
  }
  function showBridge(ok){bridgeReady=ok;$('bridgeStatus').classList.toggle('ready',ok);$('bridgeLabel').textContent=ok?'播放器已连接':'等待播放器';}
  function decodeSdkBody(value){var count=0;while(count++<3){if(typeof value==='string'){try{value=JSON.parse(value);}catch(e){return null;}}else if(value&&Object.prototype.hasOwnProperty.call(value,'body'))value=value.body;else break;}return value;}
  function applyChrome(fm,tv){var mode=tv?'tv-full':'immersive';chromeRequest=mode;if(chromeUI){chromeUI.request(false);return;}var ui=fm.ui||{};function legacy(){if(tv&&typeof ui.setToolbar==='function')return ui.setToolbar(false);}
    Promise.resolve().then(function(){if(typeof ui.setChrome==='function')return ui.setChrome({mode:mode,restoreAffordance:'none'});return legacy();}).catch(function(){try{Promise.resolve(legacy()).catch(function(){});}catch(e){}});
  }
  function probeBridge(){return waitSdk(5000).then(function(fm){showBridge(true);applyChrome(fm,doc.body.classList.contains('gg-tv'));if(!deviceKnown&&typeof fm.device==='function'){deviceKnown=true;Promise.resolve().then(function(){return fm.device();}).then(function(value){var device=decodeSdkBody(value);if(device&&device.type!==undefined){var tv=Number(device.type)===0;doc.body.classList.toggle('gg-tv',tv);if(navigation)navigation.setTV(tv);applyChrome(fm,tv);}},function(){deviceKnown=false;});}if(viewMode==='home'&&discovery){discovery.show();return Promise.resolve(discovery.refreshHistory());}if(viewMode==='sites'&&catalog)catalog.loadDefault();},function(){showBridge(false);});}
  var queue=[],activeRequests=0;
  function startJob(job){activeRequests++;Promise.resolve().then(job.run).then(job.resolve,job.reject).then(function(){activeRequests--;pump();});}
  function pump(){while(activeRequests<2&&queue.length)startJob(queue.shift());}
  function schedule(run,priority){return new Promise(function(resolve,reject){var job={run:run,resolve:resolve,reject:reject};if(priority)queue.unshift(job);else queue.push(job);pump();});}
  function request(source,query,token,gen){
    return schedule(function(){
      if(gen!==generation)throw new Error('stale');
      return waitSdk().then(function(fm){
        if(gen!==generation)throw new Error('stale');showBridge(true);
        var url=C.endpoint(source),body={kw:query};
        return fm.req(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,'User-Agent':'Mozilla/5.0'},body:JSON.stringify(body),responseType:'json',timeout:16});
      }).then(function(response){
        if(!response||typeof response!=='object')throw new Error('播放器返回了无效响应');
        if(response.url&&response.url!==C.endpoint(source))throw new Error('搜索接口发生了非预期跳转');
        var status=Number(response.status)||0,data=response.body;
        if(typeof data==='string'){try{data=JSON.parse(data);}catch(e){throw new Error('搜索接口返回了非 JSON 内容');}}
        if(status===401){var auth=new Error('设备密钥未设置、已撤销或不可用，请检查本机设置');auth.kind='unauthorized';throw auth;}
        if(status===429){var limit=new Error('请求较频繁，请稍后点击重试');limit.kind='rate';throw limit;}
        if(status!==202&&(!response.ok||status<200||status>=300))throw new Error('搜索服务暂不可用（'+status+'），可单独重试该来源');
        if(!data||typeof data!=='object')throw new Error('搜索服务数据格式不正确');
        if(status===202||data.pending)return {pending:true};
        if(typeof data.code==='number'&&data.code!==0&&data.code!==200)throw new Error('搜索服务未完成请求，请稍后重试');
        return {pending:false,rows:C.normalize(data,source),complete:data.complete!==false};
      });
    },true);
  }
  function search(query,force){
    query=String(query||'').replace(/^\s+|\s+$/g,'');if(!query||query.length>120){toast('请输入 1～120 字的片名');return;}
    generation++;focusedCheckHold=null;referenceMixRows=[];mixOrder=[];mixPage=1;mixRefresh=true;pageOrder=null;var gen=generation;state.query=query;state.rows=[];state.disk='';state.page=1;state.favorites=false;state.errors={};state.active={pan:'idle',tg:'idle'};$('query').value=query;
    recent=[query].concat(recent.filter(function(x){return x!==query;})).slice(0,8);write('recent.v1',recent);setMode('search');setSearchEditor(false,false);setTimeout(function(){if(viewMode==='search'&&!searchEditing){var card=$('searchGroups').querySelector('[data-id]');(card||$('editSearch')).focus();}},30);
    var sb=$('suggestBox');if(sb)sb.hidden=true;
    var sh=$('suggestHome');if(sh)sh.hidden=true;
    var sp=$('suggestPanel');if(sp)sp.hidden=true;
    var wantRef=searchSourcesHas('ref')&&prefs.searchRef.length>0;
    $('referenceResults').hidden=!wantRef;
    if(referenceSearch){if(wantRef){referenceSearch.show();referenceSearch.search(query,prefs.searchRef);}else referenceSearch.hide();}
    searchGroups={panSelf:{rows:[],status:'idle',error:''},panPub:{rows:[],status:'idle',error:''},mipan:{rows:[],status:'idle',error:''},qupan:{rows:[],status:'idle',error:''}};
    searchCheckStates={};searchCheckInflight={};
    renderSearchGroups();
    if(searchSources.length){fetchSearchGroup('panSelf',searchPanSelf(query));fetchSearchGroup('panPub',searchPanPublic(query));
    fetchSearchGroup('mipan',searchMipan(query));fetchSearchGroup('qupan',searchQupan(query));}
  }
  var SEARCH_GROUP_NAMES={panSelf:'盘搜 · 自建',panPub:'盘搜 · 公共',mipan:'觅搜',qupan:'趣盘'};
  var SEARCH_GROUP_ORDER=['panSelf','panPub','mipan','qupan'];
  var SEARCH_SOURCES=[['ref','资源'],['pan','盘搜'],['mipan','觅搜'],['qupan','趣盘']];
  var searchSources=read('search-sources.v1',null);
  if(!Array.isArray(searchSources))searchSources=SEARCH_SOURCES.map(function(x){return x[0];});
  searchSources=searchSources.filter(function(k){return SEARCH_SOURCES.some(function(x){return x[0]===k;});});
  if(!searchSources.length)searchSources=SEARCH_SOURCES.map(function(x){return x[0];});
  function searchSourcesHas(key){return searchSources.indexOf(key)>=0;}
  function visibleGroupKeys(){
    return C.visibleSearchGroups ? C.visibleSearchGroups(searchSources) : [];
  }
  function fetchSearchGroup(key,promise){
    var gen=generation;
    searchGroups[key].status='loading';searchGroups[key].error='';
    renderSearchGroups();
    promise.then(function(res){
      if(gen!==generation)return;
      searchGroups[key].rows=(res&&res.rows)||[];runSearchChecks(searchGroups[key].rows);
      searchGroups[key].status=(res&&res.error)?'error':'done';
      searchGroups[key].error=(res&&res.error)||'';
      renderSearchGroups();
    },function(){
      if(gen!==generation)return;
      searchGroups[key].rows=[];searchGroups[key].status='error';searchGroups[key].error='failed';
      renderSearchGroups();
    });
  }
  function retrySearchGroup(key){
    if(!state.query)return;
    if(key==='panSelf')fetchSearchGroup('panSelf',searchPanSelf(state.query));
    else if(key==='panPub')fetchSearchGroup('panPub',searchPanPublic(state.query));
    else if(key==='mipan')fetchSearchGroup('mipan',searchMipan(state.query));
    else if(key==='qupan')fetchSearchGroup('qupan',searchQupan(state.query));
  }
  function groupFilter(rows){
    var f=state.filter;
    var base=rows;
    if(prefs.displayDisksOnly&&prefs.displayDisks.length)base=rows.filter(function(r){return prefs.displayDisks.indexOf(r.type)>=0;});
    var out=C.filter(base,{query:state.query,source:'all',disk:'',quality:'',sort:f.sort,since:Number(f.since)>0?Date.now()-Number(f.since)*86400000:0,minSize:Number(f.minSize),exclude:f.exclude,keepUnknown:f.keepUnknown});
    if(f.sort==='relevance'||!f.sort)out=C.sortByDisk(out,diskPriorityOrder());
    return out.filter(displayMatch);
  }
  function panKeysForDedup(){
    var keys={};
    searchGroups.panSelf.rows.concat(searchGroups.panPub.rows).forEach(function(r){keys[C.dedupKey(r.url)]=true;});
    return keys;
  }
  function groupRowsFor(key){
    var rows=searchGroups[key].rows;
    if(key==='mipan'||key==='qupan'){var pk=panKeysForDedup();rows=rows.filter(function(r){return !pk[C.dedupKey(r.url)];});}
    return groupFilter(rows);
  }
  var enrichCache={};
  var enrichQueue=[],enrichActive=0,enrichWaiters={};
  var searchCheckStates={},searchCheckInflight={};
  function pumpEnrich(){
    while(enrichActive<2&&enrichQueue.length){
      var job=enrichQueue.shift();enrichActive++;
      job(function(){enrichActive--;pumpEnrich();});
    }
  }
  function applyPoster(card,url){
    if(!url||!card.parentNode)return;
    var poster=card.querySelector('.poster');if(!poster)return;
    if(poster.querySelector('img'))return;
    var img=element('img');img.src=imageSource(url);img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';
    img.onerror=function(){if(img.parentNode)img.parentNode.removeChild(img);};
    poster.appendChild(img);
  }
  function runEnrichLookup(title,year,cb){
    function tmdbFrom(body){
      var data=null;
      try{data=(typeof body==='string')?JSON.parse(body||'{}'):(body||null);}catch(e){data=null;}
      return (data&&C.tmdbPickPoster)?C.tmdbPickPoster(data.results||[],title,year):'';
    }
    function doubanFrom(body){
      var data=[];
      try{data=(typeof body==='string')?JSON.parse(body||'[]'):(body||[]);}catch(e){data=[];}
      return (C.doubanSuggestPoster)?C.doubanSuggestPoster(data,title,year):'';
    }
    function tmdbRelay(direct){
      var relay=(C.tmdbRelaySearchUrl)?C.tmdbRelaySearchUrl('https://tv.godroc.dpdns.org',direct):'';
      if(!relay){cb('');return;}
      directGet(relay,{timeout:8}).then(function(res2){var u=tmdbFrom(res2.body);cb(u||'');},function(){cb('');});
    }
    function doubanRelay(){
      directGet('https://tv.godroc.dpdns.org/douban-suggest/?q='+encodeURIComponent(title),{timeout:8}).then(function(res2){var u=doubanFrom(res2.body);cb(u||'');},function(){cb('');});
    }
    if(prefs.tmdbKey){
      var direct=C.tmdbSearchUrl(prefs.tmdbKey,title,year);
      directGet(direct,{timeout:8}).then(function(res){
        var u=tmdbFrom(res.body);if(u)cb(u);else doubanRelay();
      },function(){doubanRelay();});
    }else{
      directGet('https://movie.douban.com/j/subject_suggest?q='+encodeURIComponent(title),{timeout:8,headers:{'Referer':'https://movie.douban.com/'}}).then(function(res){
        var u=doubanFrom(res.body);if(u)cb(u);else doubanRelay();
      },function(){doubanRelay();});
    }
  }
  function makeGroupCard(row){
    var card=makeResource(row);if(row.__reference){card.onclick=function(){if(referenceSearch)referenceSearch.open(row);};var sourceLabel=card.querySelector('.poster-source');if(sourceLabel)sourceLabel.textContent=row.sources.join(' · ');enrichSearchCard(card,row);return card;}card.__ggPanShare=row;card.setAttribute('data-gg-longpress','check');card.addEventListener('contextmenu',function(e){e.preventDefault();openCheck(row);});card.addEventListener('gg-longpress',function(){openCheck(row);});
    card.onclick=function(){if(row&&row.url&&C.safeShare(row.url))playDirect(row);else openDetail(row);};
    var posterEl=card.querySelector('.poster');
    if(posterEl){
      var dot=element('span','card-health-dot');
      dot.setAttribute('data-state',(searchCheckStates[row.id]&&C.healthDotState)?C.healthDotState(searchCheckStates[row.id]):'idle');
      posterEl.appendChild(dot);
    }
    var badges=C.qualityBadges?C.qualityBadges(row.title||''):[]; 
    if(badges.length){
      var wrap=element('div','card-badges');
      badges.forEach(function(bd){wrap.appendChild(element('span','gg-quality-badge',bd));});
      var info=card.querySelector('.card-info');if(info)info.appendChild(wrap);
    }
    var checkText=element('span','check-caption',window.GGCheckLedger.label(row)+(focusedCheckHold&&focusedCheckHold.id===row.id?' · 移开焦点后隐藏':''));checkText.title='长按资源查看检查时间与重新检测';if(posterEl)posterEl.appendChild(checkText);
    enrichSearchCard(card,row);
    return card;
  }
  function enrichSearchCard(card,row){
    if(!card||!row||row.image||card.dataset.enriched)return;
    card.dataset.enriched='1';card.__ggPosterRow=row;
    var cleaned=(C.cleanSearchTitle)?C.cleanSearchTitle(row.title||''):{title:row.title||'',year:''};
    var title=cleaned.title,year=cleaned.year||row.year||'';
    if(!title)return;
    var cacheKey=title+"|"+String(year);
    var cached=enrichCache[cacheKey];
    if(cached!==undefined){if(cached){row.image=cached;var cc=card;setTimeout(function(){applyPoster(cc,cached);},0);}return;}
    var waiters=enrichWaiters[cacheKey];
    if(waiters){waiters.push(card);return;}
    enrichWaiters[cacheKey]=[card];
    enrichQueue.push(function(done){
      var live=(enrichWaiters[cacheKey]||[]).some(function(c){return doc.documentElement.contains(c);});if(!live){delete enrichWaiters[cacheKey];done();return;}
      runEnrichLookup(title,year,function(url){
        if(Object.keys(enrichCache).length>=200)delete enrichCache[Object.keys(enrichCache)[0]];enrichCache[cacheKey]=url||'';
        var list=enrichWaiters[cacheKey]||[];delete enrichWaiters[cacheKey];
        if(url)list.forEach(function(c){if(c.__ggPosterRow)c.__ggPosterRow.image=url;applyPoster(c,url);});
        done();
      });
    });
    setTimeout(pumpEnrich,0);
  }
  function applySearchCheckDots(){
    var box=$('searchGroups');if(!box)return;
    var cards=box.querySelectorAll('.resource-card');
    Array.prototype.forEach.call(cards,function(card){
      var dot=card.querySelector('.card-health-dot');if(!dot)return;
      var record=card.__ggPanShare&&window.GGCheckLedger.get(card.__ggPanShare);var st=record?(record.origin==='未检测'?'pending':record.state):searchCheckStates[card.dataset.id];var caption=card.querySelector('.check-caption');if(caption&&card.__ggPanShare)caption.textContent=window.GGCheckLedger.label(card.__ggPanShare)+(focusedCheckHold&&focusedCheckHold.id===card.dataset.id?' · 移开焦点后隐藏':'');
      if(st&&C.healthDotState)dot.setAttribute('data-state',C.healthDotState(st));
    });
  }
  function runSearchChecks(rows){
    var todo=[];
    (rows||[]).forEach(function(r){
      if(r&&r.url&&C.safeShare(r.url)&&!searchCheckStates[r.id]&&!searchCheckInflight[r.id])todo.push(r);
    });
    if(!todo.length)return;
    var gen=generation;
    getCheckMode().then(function(mode){
      if(gen!==generation||mode==='off')return;
      var checkFn=(mode==='host')?checkHost:checkLinks;
      var i,chunk;
      for(i=0;i<todo.length;i+=40){
        (function(chunk){
        chunk.forEach(function(r){searchCheckInflight[r.id]=true;});
        checkFn(chunk.map(function(r){return {url:r.url,password:r.password||'',disk_type:r.type};})).then(function(states){
          if(gen!==generation)return;
          chunk.forEach(function(r,idx){
            var st=states&&states[idx];
            searchCheckStates[r.id]=st||'unknown';
            delete searchCheckInflight[r.id];
          });
          applySearchCheckDots();
        },function(){
          if(gen!==generation)return;
          chunk.forEach(function(r){searchCheckStates[r.id]='unknown';delete searchCheckInflight[r.id];});
          applySearchCheckDots();
        });
        }(todo.slice(i,i+40)));
      }
    },function(){});
  }

  function openCheck(row){
    var id='checkInspector',modal=$(id);if(!modal){modal=element('div','modal');modal.id=id;modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');var panel=element('div','modal-panel');modal.appendChild(panel);doc.body.appendChild(modal);}
    var panel=modal.firstChild;panel.textContent='';panel.appendChild(element('h2','',row.title||'链接检测'));panel.appendChild(element('p','check-description',window.GGCheckLedger.label(row)));panel.appendChild(element('p','field-note','可访问不等于已经验证视频可播放。账号权限、文件和清晰度由播放器继续判断。'));
    var fresh=element('button','primary','立即重新检测（不读旧缓存）'),close=element('button','subbutton','关闭');panel.appendChild(fresh);panel.appendChild(close);close.setAttribute('data-close',id);close.onclick=function(){closeModal(id);};
    var supported=row.type==='quark'||row.type==='uc';fresh.disabled=!supported;if(!supported)fresh.textContent='该网盘暂不支持实时重新检测';
    fresh.onclick=function(){if(!C.validKey(credential)){toast('请先设置这台设备的访问密钥');return;}fresh.disabled=true;var payload=[{url:row.url,password:row.password||'',disk_type:row.type}];waitSdk().then(function(fm){return fm.req(C.checkEndpoint().replace('/links','/refresh'),{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+credential},body:JSON.stringify({items:payload}),responseType:'json',timeout:25});}).then(function(res){var b=decodeSdkBody(res);if(!res||!res.ok||Number(res.status)!==200)throw new Error('实时检测暂不可用，请稍后重试');var list=b&&(b.results||(b.data&&b.data.results));if(!list||list.length!==1||list[0].cache_hit!==false||!list[0].checked_at)throw new Error('服务未返回可验证的新检测结果');window.GGCheckLedger.record(b,payload,C.parseCheckResults(b,payload),'fresh');panel.querySelector('.check-description').textContent=window.GGCheckLedger.label(row);searchCheckStates[row.id]=window.GGCheckLedger.get(row).state;applySearchCheckDots();},function(){throw new Error('实时检测暂不可用，请稍后重试');}).catch(function(e){panel.querySelector('.check-description').textContent=e.message||'实时检测失败';}).then(function(){fresh.disabled=false;});};openModal(id);
  }
  function renderMixed(){renderMixedInternal();refreshSearchSummary();}
  function renderMixedInternal(){
    if(doc.querySelector('.ref-dialog:not([hidden]),.modal:not([hidden])'))return;
    $('referenceResults').hidden=true;var box=$('searchGroups'),focus=box.contains(doc.activeElement)?doc.activeElement.dataset.id:'',rows=[];visibleGroupKeys().forEach(function(k){rows=rows.concat(groupRowsFor(k));});if(searchSourcesHas('ref'))rows=rows.concat(referenceMixRows.filter(displayMatch));
    rows=window.GGRecommendations.aggregate(rows,{query:state.query,disks:diskPriorityOrder(),refresh:mixRefresh,previous:mixOrder});mixRefresh=false;mixOrder=rows.map(function(r){return r.__mixKey;});var paged=C.page(rows,mixPage,prefs.pageSize);mixPage=paged.page;box.textContent='';box.hidden=false;
    $('resultTitle').textContent='“'+state.query+'” · 综合推荐';$('resultSummary').textContent=rows.length+' 条候选 · 网盘直接播放，站点卡进入详情；检测状态仅适用于分享链接';$('resourceGrid').hidden=true;$('pagination').hidden=true;
    var grid=element('div','resource-grid');paged.items.forEach(function(row){grid.appendChild(makeGroupCard(row));});box.appendChild(grid);
    var paging=element('div','discovery-paging');['上一页','下一页'].forEach(function(label,i){var btn=element('button','subbutton',label);btn.disabled=i?mixPage>=paged.totalPages:mixPage<=1;btn.onclick=function(){mixPage+=i?1:-1;renderMixed();var card=box.querySelector('.resource-card');if(card)card.focus();};paging.appendChild(btn);});box.appendChild(paging);if(!rows.length)box.appendChild(element('p','search-group-empty','暂无网盘候选，来源返回后会自动补充。'));$('emptyState').hidden=true;
    if(focus){var cards=box.querySelectorAll('[data-id]');for(var i=0;i<cards.length;i++)if(cards[i].dataset.id===focus){cards[i].focus();break;}}
  }

  var checkDecorateTimer=null;
  function decorateShareChecks(){
    all('.discovery-resource,.ref-auto-share,.catalog-share').forEach(function(node){var raw=node.__ggPanShare||node.__ggShare;if(!raw||!raw.url)return;var parsed=C.safeShare(raw.url);if(!parsed)return;
      if(!node.__ggCheckInspector){node.__ggCheckInspector=true;node.setAttribute('data-gg-longpress','check');function inspect(e){if(e)e.preventDefault();var row={url:raw.url,type:parsed.type,password:raw.password||parsed.password||'',title:raw.title||raw.note||'分享链接'};openCheck(row);}node.addEventListener('contextmenu',inspect);node.addEventListener('gg-longpress',inspect);}
      var caption=node.querySelector('.share-check-caption');if(!caption){caption=element('span','share-check-caption');node.appendChild(caption);}var record=window.GGCheckLedger.get(raw);if(record.origin!=='未检测'){node.dataset.ggCheck=record.state;var dot=node.querySelector('.discovery-health-dot');if(dot)dot.setAttribute('data-state',C.healthDotState(record.state));}var text=window.GGCheckLedger.label(raw)+' · 长按重新检测';if(caption.textContent!==text)caption.textContent=text;
    });
  }
  function scheduleCheckDecorate(){if(checkDecorateTimer)return;checkDecorateTimer=setTimeout(function(){checkDecorateTimer=null;decorateShareChecks();},80);}
  if(window.MutationObserver)new MutationObserver(scheduleCheckDecorate).observe(doc.body,{childList:true,subtree:true});window.addEventListener('gg-check-updated',scheduleCheckDecorate);

  var mixTools=element('div','search-view-tools'),mixToggle=element('button','subbutton','综合推荐'),qualityRefresh=element('button','subbutton','刷新优质');mixTools.appendChild(mixToggle);mixTools.appendChild(qualityRefresh);$('searchGroups').parentNode.insertBefore(mixTools,$('searchGroups'));qualityRefresh.hidden=true;
  mixToggle.onclick=function(){mixMode=!mixMode;mixToggle.textContent=mixMode?'按来源查看':'综合推荐';qualityRefresh.hidden=!mixMode;mixRefresh=true;mixPage=1;if(!mixMode&&referenceSearch&&searchSourcesHas('ref'))referenceSearch.show();renderSearchGroups();};qualityRefresh.onclick=function(){mixRefresh=true;renderSearchGroups();toast('已按片名、网盘偏好及检测状态重新排序；清晰度仅为来源标注');};
  mixTools.hidden=true;
  playbackReturn=window.GGPlaybackReturn.mount({context:function(){return [viewMode,state.query,state.source,state.disk,state.page,mixPage].join('|');}});

  function renderSearchGroups(){renderSearchGroupsInternal();refreshSearchSummary();}
  function renderSearchGroupsInternal(){
    if(mixMode){renderMixed();return;}
    var keys=visibleGroupKeys();
    var headingEl=$('resultTitle').parentElement.parentElement;if(headingEl)headingEl.hidden=false;
    var metaEl=$('resultSummary').parentElement;if(metaEl)metaEl.hidden=false;
    $('resultTitle').textContent=state.query?'“'+state.query+'”':'搜索结果';
    $('resultEyebrow').textContent='SEARCH RESULTS';
    $('providerMessages').hidden=true;
    $('resourceGrid').hidden=true;
    $('pagination').hidden=true;
    var groupsBox=$('searchGroups');var restoreId=groupsBox&&groupsBox.contains(doc.activeElement)?doc.activeElement.dataset.id:'';if(groupsBox)groupsBox.hidden=false;
    groupsBox.textContent='';
    if(!searchSources.length){
      groupsBox.appendChild(element('div','search-group-empty','未选来源：请在左侧勾选至少一个来源'));
      searchTotal=0;
      $('resultSummary').textContent='未选来源';
      $('emptyState').hidden=true;
      $('retryButton').hidden=true;
      $('favoriteCount').textContent=String(favorites.length);
      return;
    }
    if(!keys.length){
      $('resultSummary').textContent='仅看资源站结果';
      $('emptyState').hidden=true;
      $('retryButton').hidden=true;
      searchTotal=0;
      $('favoriteCount').textContent=String(favorites.length);
      return;
    }
    var total=0,anyError=false,anyLoading=false;
    keys.forEach(function(key){
      var g=searchGroups[key];
      var rows=groupRowsFor(key);
      total+=rows.length;
      if(g.status==='error')anyError=true;
      if(g.status==='loading')anyLoading=true;
      if(g.status==='done'&&!rows.length)return;
      var sec=element('section','search-group');
      var head=element('div','search-group-head');
      head.appendChild(element('h3','',SEARCH_GROUP_NAMES[key]));
      head.appendChild(element('span','search-group-count',g.status==='loading'?'正在搜索…':(rows.length+' 条')));
      if(g.status==='error'){
        var msg=g.error==='need-key'?'未设置设备密钥，设置里填写后可搜':(g.error==='timeout'?'搜索超时':(g.error&&g.error.indexOf('http-')===0?'公共源暂时不可用（'+g.error+'）':'搜索失败'));
        head.appendChild(element('span','search-group-status',msg));
        sec.appendChild(head);
        var rb=element('button','subbutton search-group-retry','重试');
        rb.type='button';rb.onclick=function(){retrySearchGroup(key);};
        sec.appendChild(rb);
      }else{
        sec.appendChild(head);
        var grid=element('div','resource-grid');
        rows.forEach(function(row){grid.appendChild(makeGroupCard(row));});
        sec.appendChild(grid);

      }
      groupsBox.appendChild(sec);
    });
    if(restoreId){var restoreCards=groupsBox.querySelectorAll('[data-id]');for(var ri=0;ri<restoreCards.length;ri++)if(restoreCards[ri].dataset.id===restoreId){restoreCards[ri].focus();break;}}
    searchTotal=total;
    $('resultSummary').textContent=total+' 条候选';
    $('emptyState').hidden=!!total;
    $('emptyTitle').textContent=anyLoading?'正在寻找资源…':'没有匹配的候选';
    $('emptyText').textContent=anyLoading?'先返回的来源会先显示，不必等待全部结束。':(anyError?'检查来源提示，或单独重试失败来源。':'试试完整片名，或放宽网盘筛选。');
    $('favoriteCount').textContent=String(favorites.length);
    $('retryButton').hidden=!anyError;
  }
  function applySourceFilter(){
    write('search-sources.v1',searchSources);
    renderSourceChecks();
    if(!state.query){renderSearchGroups();return;}
    var wantRef=searchSourcesHas('ref')&&prefs.searchRef.length>0;
    $('referenceResults').hidden=!wantRef;
    if(referenceSearch){if(wantRef){referenceSearch.show();referenceSearch.search(state.query,prefs.searchRef);}else referenceSearch.hide();}
    renderSearchGroups();
  }
  function renderSourceChecks(){
    var box=$('sourceChecks');if(!box)return;box.textContent='';
    var allLabel=element('label','source-check-all'),allCheck=doc.createElement('input');
    allCheck.type='checkbox';allCheck.checked=searchSources.length===SEARCH_SOURCES.length;
    allCheck.onchange=function(){
      searchSources=allCheck.checked?SEARCH_SOURCES.map(function(x){return x[0];}):[];
      applySourceFilter();
    };
    allLabel.appendChild(allCheck);allLabel.appendChild(doc.createTextNode('全选'));box.appendChild(allLabel);
    SEARCH_SOURCES.forEach(function(x){
      var label=element('label','source-check'),check=doc.createElement('input');
      check.type='checkbox';check.value=x[0];check.checked=searchSources.indexOf(x[0])>=0;
      check.onchange=function(){
        var sel=[];Array.prototype.forEach.call(box.querySelectorAll('input'),function(inp){if(inp.checked&&inp!==allCheck)sel.push(inp.value);});
        searchSources=sel;applySourceFilter();
      };
      label.appendChild(check);label.appendChild(doc.createTextNode(x[1]));box.appendChild(label);
    });
  }

  var searchGroups={panSelf:{rows:[],status:'idle',error:''},panPub:{rows:[],status:'idle',error:''},mipan:{rows:[],status:'idle',error:''},qupan:{rows:[],status:'idle',error:''}};
  var searchTotal=0;
  var favoritesEdit=false;
  function setMode(mode){
    viewMode=mode;if(mode!=='search')focusedCheckHold=null;if(typeof mixTools!=='undefined'&&mixTools)mixTools.hidden=mode!=='search';if(mode!=='favorites'){favoritesEdit=false;$('resourceGrid').removeAttribute('data-gg-back-layer');}var home=mode==='home',sites=mode==='sites',landing=mode==='search'&&!state.query&&!state.favorites;
    $('hero').hidden=true;$('resultsSection').hidden=home||sites||landing;
    $('searchArea').hidden=home||sites;
    var shb=$('searchHomeBtn');if(shb)shb.hidden=true;
    if(mode==='search')$('searchArea').setAttribute('data-gg-back-layer','search');else $('searchArea').removeAttribute('data-gg-back-layer');
    $('referenceResults').hidden=mode!=='search'||!state.query||!prefs.searchRef.length||!searchSourcesHas('ref');
    $('discoverySection').hidden=!home;$('catalogSection').hidden=!sites;
    if(sites)$('catalogSection').setAttribute('data-gg-back-layer','sites');else $('catalogSection').removeAttribute('data-gg-back-layer');
    if(mode==='favorites')$('resultsSection').setAttribute('data-gg-back-layer','favorites');else $('resultsSection').removeAttribute('data-gg-back-layer');
    $('workspace').classList.toggle('catalog-mode',home||sites);
    if(catalog){if(sites){catalog.show();if(bridgeReady)catalog.loadDefault();}else catalog.hide();}
    if(discovery){if(home&&bridgeReady){discovery.show();discovery.refreshHistory();}else discovery.hide();}
    $('homeNav').classList.toggle('active',home);$('sitesNav').classList.toggle('active',sites);$('searchNav').classList.toggle('active',mode==='search');$('favoritesNav').classList.toggle('active',state.favorites);
    if(home||sites){generation++;state.query='';state.rows=[];state.favorites=false;$('query').value='';renderProvider();}
    if(mode!=='search'&&searchInput)searchInput.close(false,true);if(mode==='search')setSearchEditor(!state.query,false);
    doc.dispatchEvent(new Event('gg-back-layer-change'));
  }
  function renderProvider(){
    var counts={pan:0};state.rows.forEach(function(r){r.sources.forEach(function(s){if(s in counts)counts[s]++;});});
    var ca=$('countAll');if(ca)ca.textContent=String(state.rows.length);var cp=$('countPan');if(cp)cp.textContent=String(counts.pan);
    var box=$('providerMessages'),focused=doc.activeElement&&doc.activeElement.dataset&&doc.activeElement.dataset.provider;
    box.textContent='';prefs.sourceOrder.forEach(function(s){
      var stEl=$(s+'Status');if(stEl)stEl.textContent=providerTexts[state.active[s]]||'请求失败';
      if(state.favorites)return;
      var status=state.active[s],b=element('div','provider-message '+(status==='loading'||status==='pending'?'loading':state.errors[s]?'error':''));
      b.textContent=providerNames[s]+' · '+(state.errors[s]||providerTexts[status])+(status==='done'||status==='partial'?' · '+counts[s]+' 条':'');box.appendChild(b);
    });
    $('retryButton').hidden=!Object.keys(state.errors).length||state.favorites;
  }
  function filtered(withDisk){
    var f=state.filter,rows=C.filter(state.rows,{query:state.query,source:state.source,disk:withDisk?state.disk:'',quality:'',sort:f.sort,since:Number(f.since)>0?Date.now()-Number(f.since)*86400000:0,minSize:Number(f.minSize),exclude:f.exclude,keepUnknown:f.keepUnknown});if(pageOrder){rows.forEach(function(row){if(pageOrder.indexOf(row.id)<0)pageOrder.push(row.id);});rows.sort(function(a,b){return pageOrder.indexOf(a.id)-pageOrder.indexOf(b.id);});}if(f.sort==='relevance'||!f.sort)rows=C.sortByDisk(rows,diskPriorityOrder());return rows.filter(displayMatch);
  }
  function formatDate(stamp){if(stamp===null)return '日期未知';var d=new Date(stamp);return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
  function formatSize(n){if(n===null)return '大小未知';if(n>=1e12)return (n/1e12).toFixed(1)+' TB';if(n>=1e9)return (n/1e9).toFixed(1)+' GB';if(n>=1e6)return (n/1e6).toFixed(0)+' MB';return n+' B';}
  function titleLetters(title){return C.titleKey(title).replace(/[^\u3400-\u9fffA-Za-z0-9]/g,'').slice(0,4)||'GG';}
  function reconcile(container,items,create,update){
    var old={},focused=doc.activeElement,focusId=focused&&focused.dataset?focused.dataset.id:null,scroll=window.pageYOffset;
    Array.prototype.slice.call(container.children).forEach(function(node){old[node.dataset.id]=node;});
    var next=container.firstElementChild;
    items.forEach(function(item){var id=item.id,node=old[id];if(node){delete old[id];update(node,item);}else node=create(item);
      if(node!==next)container.insertBefore(node,next);next=node.nextElementSibling;
    });Object.keys(old).forEach(function(k){container.removeChild(old[k]);});
    if(focusId&&focused&&doc.documentElement.contains(focused)){
      if(doc.activeElement!==focused)focused.focus();
      if(Math.abs(window.pageYOffset-scroll)>4)window.scrollTo(0,scroll);
    }
  }
  function renderResults(changedView){
    if(!state.favorites){renderSearchGroups();return;}
    renderProvider();
    var favHeading=$('resultTitle').parentElement.parentElement;if(favHeading)favHeading.hidden=false;
    var favMeta=$('resultSummary').parentElement;if(favMeta)favMeta.hidden=false;
    $('resultTitle').textContent='我的收藏';$('resultEyebrow').textContent='YOUR COLLECTION';
    var groupsBox=$('searchGroups');if(groupsBox)groupsBox.hidden=true;
    $('providerMessages').hidden=false;
    $('resourceGrid').hidden=false;
    if(state.favorites&&favoritesEdit)$('resourceGrid').setAttribute('data-gg-back-layer','favorites-edit');else $('resourceGrid').removeAttribute('data-gg-back-layer');
    var result=filtered(true),paged=C.page(result,state.page,prefs.pageSize);state.page=paged.page;
    $('resultSummary').textContent=result.length+' 条候选'+(state.rows.length!==result.length?' / 共 '+state.rows.length+' 条':'');
    $('pagination').hidden=!paged.total;$('pageInfo').textContent=state.page+' / '+paged.totalPages+' 页';$('previousPage').disabled=state.page<=1;$('nextPage').disabled=state.page>=paged.totalPages;
    reconcile($('resourceGrid'),paged.items,makeResource,updateResource);
    $('resourceGrid').classList.toggle('favorites-edit',!!state.favorites&&favoritesEdit);
    if($('favoritesDone'))$('favoritesDone').hidden=!(state.favorites&&favoritesEdit);
    $('emptyState').hidden=!!result.length;
    $('emptyTitle').textContent='还没有收藏';
    $('emptyText').textContent='试试完整片名，或放宽网盘、时间和格式筛选。';
    $('favoriteCount').textContent=String(favorites.length);
  }
  function makeResource(row){
    var b=element('button','resource-card');b.dataset.id=row.id;
    var poster=element('div','poster'),letters=element('span','poster-letters',titleLetters(row.title));poster.appendChild(letters);
    if(row.image){var img=element('img');img.src=imageSource(row.image);img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=function(){if(img.parentNode)img.parentNode.removeChild(img);};poster.appendChild(img);}
    poster.appendChild(element('span','poster-disk',C.disks[row.type]||row.type));poster.appendChild(element('span','poster-source'));
    var info=element('div','card-info gg-poster-copy');info.appendChild(element('div','card-title',row.title));var meta=element('div','card-meta');meta.appendChild(element('span','card-date'));meta.appendChild(element('span','card-size'));info.appendChild(meta);info.appendChild(element('div','card-tags'));b.appendChild(poster);b.appendChild(info);b.appendChild(element('span','resource-delete-badge','×'));
    b.onclick=function(){if(state.favorites&&favoritesEdit){deleteFavorite(b.dataset.id);return;}var found=state.rows.filter(function(x){return x.id===b.dataset.id;})[0];if(found)openDetail(found);};
    b.addEventListener('gg-longpress',function(){if(state.favorites)enterFavoritesEdit(b.dataset.id);},false);
    b.addEventListener('contextmenu',function(e){if(e&&e.preventDefault)e.preventDefault();if(state.favorites)enterFavoritesEdit(b.dataset.id);},false);
    return updateResource(b,row);
  }
  function updateResource(node,row){node.querySelector('.poster-source').textContent=row.sources.map(function(x){return x==='tg'?'TGSEARCH':'PANSOU';}).join(' + ');node.querySelector('.card-date').textContent=formatDate(row.date);node.querySelector('.card-size').textContent=formatSize(row.size);node.querySelector('.card-tags').textContent=row.tags.length?row.tags.join(' · ')+' 标注':'';if(state.favorites)node.setAttribute('data-gg-longpress','favorite');else node.removeAttribute('data-gg-longpress');return node;}
  function openModal(id){focusRestore=doc.activeElement;$(id).hidden=false;doc.body.style.overflow='hidden';var focus=$(id).querySelector('input:not(:disabled),button:not(:disabled),select:not(:disabled)');if(focus)focus.focus();}
  function closeModal(id){$(id).hidden=true;doc.body.style.overflow='';if(id==='settingsModal'){$('deviceKey').value='';$('tmdbKey').value='';$('exportText').hidden=true;}$('playButton').disabled=false;if(focusRestore&&doc.documentElement.contains(focusRestore)){focusRestore.focus();if(topbarEl&&topbarEl.contains(focusRestore))topbarShow();}}
  function showSettingsTab(tab){
    all('[data-settings-tab]').forEach(function(btn){btn.classList.toggle('active',btn.dataset.settingsTab===tab);});
    all('[data-settings-panel]').forEach(function(p){p.hidden=p.dataset.settingsPanel!==tab;});
  }
  function renderSearchRefSettings(){
    var box=$('searchRefSettings');if(!box||!window.GGProviders)return;
    var defs=window.GGProviders.definitions||[],keys=defs.map(function(d){return d.key;});
    function persist(){
      var sel=[];Array.prototype.forEach.call(box.querySelectorAll('input:checked'),function(x){sel.push(x.value);});
      prefs.searchRef=sel;write('preferences.v1',prefs);
      try{localStorage.setItem('gg-reference-search-sites-v1',JSON.stringify(sel));}catch(e){}
    }
    box.textContent='';
    defs.forEach(function(d){
      var label=element('label','ref-site-option'),check=doc.createElement('input');
      check.type='checkbox';check.value=d.key;check.checked=prefs.searchRef.indexOf(d.key)>=0;check.onchange=persist;
      label.appendChild(check);label.appendChild(doc.createTextNode(d.name));box.appendChild(label);
    });
    var actions=element('div','ref-site-actions');
    var allBtn=element('button','subbutton','全选');allBtn.type='button';allBtn.onclick=function(){prefs.searchRef=keys.slice();write('preferences.v1',prefs);try{localStorage.setItem('gg-reference-search-sites-v1',JSON.stringify(keys));}catch(e){}renderSearchRefSettings();};
    var noneBtn=element('button','subbutton','清空');noneBtn.type='button';noneBtn.onclick=function(){prefs.searchRef=[];write('preferences.v1',prefs);try{localStorage.setItem('gg-reference-search-sites-v1',JSON.stringify([]));}catch(e){}renderSearchRefSettings();};
    actions.appendChild(allBtn);actions.appendChild(noneBtn);actions.appendChild(element('small','','更改立即保存；下次搜索生效'));
    box.appendChild(actions);
  }
  var settingsSourceOrder='pan',settingsPageSize=24;
  function renderSettingsOptions(){
    all('#sourceOrderOptions button').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-value')===settingsSourceOrder));b.onclick=function(){settingsSourceOrder=b.getAttribute('data-value');renderSettingsOptions();};});
    all('#pageSizeOptions button').forEach(function(b){b.setAttribute('aria-pressed',String(Number(b.getAttribute('data-value'))===settingsPageSize));b.onclick=function(){settingsPageSize=Number(b.getAttribute('data-value'));renderSettingsOptions();};});
  }
  function renderDisplayDisks(){
    var box=$('displayDiskSettings');if(!box)return;box.textContent='';
    var order=prefs.diskOrder.filter(function(d){return !!C.disks[d];});Object.keys(C.disks).forEach(function(d){if(order.indexOf(d)<0)order.push(d);});
    order.forEach(function(d){
      var label=element('label','ref-site-option');var check=element('input');check.type='checkbox';check.checked=prefs.displayDisks.indexOf(d)>=0;
      check.onchange=function(){var list=[];Array.prototype.forEach.call(box.querySelectorAll('input'),function(inp,i){if(inp.checked)list.push(order[i]);});prefs.displayDisks=list;write('preferences.v1',prefs);};
      label.appendChild(check);label.appendChild(doc.createTextNode(C.disks[d]));box.appendChild(label);
    });
  }
  function openSettings(){
    $('deviceKey').value=credential;$('tmdbKey').value=prefs.tmdbKey||'';$('rememberKey').checked=!!read('device-key.v1','');$('diskOrder').value=prefs.diskOrder.map(function(d){return C.disks[d]||d;}).join(',');settingsSourceOrder=prefs.sourceOrder.join(',');settingsPageSize=prefs.pageSize;renderSettingsOptions();$('displayDisksOnly').checked=prefs.displayDisksOnly;$('prefetchPan').checked=prefs.prefetchPan;$('prefetchMipan').checked=prefs.prefetchMipan;$('settingsError').textContent='';renderSearchRefSettings();renderDisplayDisks();updateTmdbKeyStatus();openModal('settingsModal');showSettingsTab('device');var dk=$('deviceKey');if(dk)dk.focus();
  }
  function updateKeyBadge(){var b=$('keyBadge');if(b)b.textContent=credential?'设备密钥已设置 · 本机':'设备密钥未设置';}
  function updateTmdbKeyStatus(){var s=$('tmdbKeyStatus');if(s)s.textContent=prefs.tmdbKey?'TMDB Key 已保存（本机）':'TMDB Key 未设置';}
  function saveSettings(event){
    event.preventDefault();var key=$('deviceKey').value.replace(/^\s+|\s+$/g,'');if(key&&!C.validKey(key)){$('settingsError').textContent='密钥格式不正确，应为 43 位字母、数字、下划线或短横线。';return;}
    var order=[],words=$('diskOrder').value.split(/[,，、\s]+/),names=Object.keys(C.disks);
    words.forEach(function(word){var d=C.disk(word);if(!C.disks[d])names.forEach(function(k){if(C.disks[k]===word)d=k;});if(C.disks[d]&&order.indexOf(d)<0)order.push(d);});
    if(!order.length){$('settingsError').textContent='请至少填写一个有效网盘名称。';return;}
    var changed=key!==credential;var oldTmdb=prefs.tmdbKey||'';credential=key;prefs=Object.assign({},prefs,{diskOrder:order,sourceOrder:settingsSourceOrder.split(','),pageSize:settingsPageSize,displayDisksOnly:$('displayDisksOnly').checked,tmdbKey:$('tmdbKey').value.replace(/^\s+|\s+$/g,''),prefetchPan:$('prefetchPan').checked,prefetchMipan:$('prefetchMipan').checked});
    if(prefs.tmdbKey!==oldTmdb)enrichCache={};
    var stored=write('preferences.v1',prefs);if($('rememberKey').checked&&key)stored=write('device-key.v1',key)&&stored;else remove('device-key.v1');
    if(changed){generation++;cache={};cacheKeys=[];state.rows=[];state.active={pan:'idle',tg:'idle'};state.errors={};}
    updateKeyBadge();updateTmdbKeyStatus();closeModal('settingsModal');toast(stored?'设置已保存':'本次设置可用，但当前环境无法持久保存');
    if(changed&&state.query&&key)search(state.query,true);else if(state.query||state.favorites)renderResults(true);
  }
  function openDetail(row){selected=row;$('detailTitle').textContent=row.title;$('detailDisk').textContent=(C.disks[row.type]||row.type)+' / '+row.sources.map(function(s){return providerNames[s]||'资源站点';}).join(' + ');$('detailMeta').textContent=formatDate(row.date)+' · '+formatSize(row.size)+(row.tags.length?' · '+row.tags.join(' · ')+'（来源标注）':'');$('detailPoster').textContent=titleLetters(row.title);if(row.image){var cover=element('img');cover.src=imageSource(row.image);cover.alt='';$('detailPoster').appendChild(cover);}$('detailLink').textContent=new URL(row.url).hostname+(row.password?' · 已携带提取码':'');
    var previous=$('extractionCodes');if(previous)previous.parentNode.removeChild(previous);
    if(row.passwords&&row.passwords.length>1){var label=element('label','field','不同来源提供了多个提取码'),select=element('select');label.id='extractionCodes';select.setAttribute('aria-label','选择提取码');row.passwords.forEach(function(code){var option=element('option','',code);option.value=code;select.appendChild(option);});select.value=row.password;select.onchange=function(){selected.password=this.value;};label.appendChild(select);$('detailLink').parentNode.insertBefore(label,$('playError'));}
    $('playError').textContent='';updateFavoriteButton();openModal('detailModal');}
  function updateFavoriteButton(){$('favoriteButton').textContent=selected&&favorites.some(function(r){return r.id===selected.id;})?'取消收藏':'加入收藏';}
  function play(){
    if(!selected)return;markNativeChrome();var row=selected;$('playButton').disabled=true;$('playError').textContent='';
    waitSdk().then(function(fm){
      if(fm.pan&&typeof fm.pan.play==='function'){var parsed=new URL(row.url);if(row.password&&parsed.searchParams.has('pwd'))parsed.searchParams.set('pwd',row.password);if(row.password&&parsed.searchParams.has('password'))parsed.searchParams.set('password',row.password);var pic=row.image||'';var wall=row.wallPic||row.backdrop||'';if(typeof fm.preloadArtwork==='function'){try{fm.preloadArtwork(pic,wall);}catch(e){}}cachePushArtwork(fm,row.url,row.title,pic,wall);return fm.pan.play({type:row.type,url:parsed.href,password:row.password,title:row.title,pic:pic,wallPic:wall});}
      if(typeof fm.play==='function'){var url=row.url;if(row.password&&!/[?&](?:pwd|password)=/.test(url))url+=(url.indexOf('?')>=0?'&':'?')+'pwd='+encodeURIComponent(row.password);return fm.play('push://'+url,row.title,{pic:row.image||'',wallPic:row.wallPic||row.backdrop||''});}
      throw new Error('此客户端没有可用的原生播放入口，请使用保留的原生自建站点。');
    }).then(function(){toast('已交给播放器；后续解析由原插件处理');$('playButton').disabled=false;},function(){resumeNativeChrome();$('playError').textContent='原生播放调用未完成。请检查客户端支持与原配置中心授权，再重试。';$('playButton').disabled=false;});
  }
  function playDirect(row){
    if(!row || !row.url){toast('此资源没有可用的播放地址');return;}
    markNativeChrome();var password=row.password||(row.passwords&&row.passwords[0])||'';
    waitSdk().then(function(fm){
      if(fm.pan&&typeof fm.pan.play==='function'){var pic=row.image||'';var wall=row.wallPic||row.backdrop||'';if(typeof fm.preloadArtwork==='function'){try{fm.preloadArtwork(pic,wall);}catch(e){}}cachePushArtwork(fm,row.url,row.title,pic,wall);return fm.pan.play({type:row.type,url:row.url,password:password,title:row.title,pic:pic,wallPic:wall});}
      if(typeof fm.play==='function'){var url=row.url;if(password&&!/[?&](?:pwd|password)=/.test(url))url+=(url.indexOf('?')>=0?'&':'?')+'pwd='+encodeURIComponent(password);return fm.play('push://'+url,row.title,{pic:row.image||'',wallPic:row.wallPic||row.backdrop||''});}
      throw new Error('当前客户端不支持此播放入口');
    }).then(function(){toast('已交给播放器解析');},function(){resumeNativeChrome();toast('播放调用失败，请检查客户端和网盘授权');});
  }
  function playShareDirect(row,source){var data={data:{merged_by_type:{}}};data.data.merged_by_type[row.type||'other']=[row];var normalized=C.normalize(data,'catalog');if(normalized.length){normalized[0].wallPic=row.wallPic||'';if(!normalized[0].image)normalized[0].image=row.image||'';playDirect(normalized[0]);}else toast('此资源类型暂不支持直接播放');}
  function showFavorites(){generation++;state.favorites=true;state.rows=favorites.slice();state.query='';state.disk='';state.page=1;state.grouped=false;state.errors={};setMode('favorites');renderResults(true);}
  function changeFilters(){pageOrder=null;['quality','sort','since','minSize','exclude'].forEach(function(k){state.filter[k]=$(k).value;});state.filter.keepUnknown=$('keepUnknown').checked;write('filters.v1',state.filter);syncFilterControls();renderFilterViews();}
  function closestButton(target){while(target&&target!==doc.body){if(target.tagName==='BUTTON')return target;target=target.parentElement;}return null;}
  function visibleFocusable(root){return all('button,input,select,textarea,[tabindex="0"]',root).filter(function(e){return !e.disabled&&e.offsetWidth>0&&e.offsetHeight>0;});}
  function keyNavigation(event){
    var modal=!$('settingsModal').hidden?$('settingsModal'):!$('detailModal').hidden?$('detailModal'):doc.querySelector('.ref-dialog:not([hidden]),.discovery-modal:not([hidden])'),key=event.key||({19:'ArrowUp',20:'ArrowDown',21:'ArrowLeft',22:'ArrowRight',23:'Enter',4:'Escape'}[event.keyCode]),current=doc.activeElement;
    if(key==='Escape'||key==='BrowserBack'||key==='GoBack'){
      if(state.favorites&&favoritesEdit){favoritesEdit=false;renderResults(false);var first=$('resourceGrid').firstElementChild;if(first)first.focus();event.preventDefault();return;}
      if(modal){if(current&&((current.tagName==='TEXTAREA')||(current.tagName==='INPUT'&&current.type!=='checkbox'&&current.type!=='radio'&&current.type!=='submit'&&current.type!=='button'))){try{current.blur();}catch(e){}event.preventDefault();return;}if(modal.id)closeModal(modal.id);event.preventDefault();return;}
      if(!modal&&viewMode==='search'){state.favorites=false;setMode('home');if($('homeNav'))$('homeNav').focus();event.preventDefault();return;}
      if(!modal&&current&&((current.tagName==='TEXTAREA')||(current.tagName==='INPUT'&&current.type!=='checkbox'&&current.type!=='radio'&&current.type!=='submit'&&current.type!=='button'))){try{current.blur();}catch(e){}if(current.id==='query'){var fk=doc.querySelector('#letterPicker .letter-key');if(fk){try{fk.focus();}catch(e){}}}event.preventDefault();return;}
      if(state.query||state.favorites){state.favorites=false;setMode('home');$('query').focus();event.preventDefault();return;}return;
    }
    if(key==='Tab'&&modal){var fs=visibleFocusable(modal),at=fs.indexOf(current);if(event.shiftKey&&at<=0){fs[fs.length-1].focus();event.preventDefault();}else if(!event.shiftKey&&at===fs.length-1){fs[0].focus();event.preventDefault();}return;}
    if(!/^Arrow/.test(key))return;
    if(key==='ArrowDown'&&current&&current.id==='query'){var s=doc.querySelector('#suggestBox:not([hidden]) .suggest-item')||doc.querySelector('#suggestHome:not([hidden]) .suggest-item');if(s){s.focus();event.preventDefault();return;}var first=doc.querySelector('#letterPicker .letter-key');if(first){first.focus();event.preventDefault();return;}}
    if(key==='ArrowDown'&&current&&current.classList&&current.classList.contains('suggest-item')){var fk=doc.querySelector('#letterPicker .letter-key');if(fk){fk.focus();event.preventDefault();return;}}
    if(current&&/^(INPUT|SELECT|TEXTAREA)$/.test(current.tagName))return;
    var nodes=visibleFocusable(modal||doc),best=null,bestScore=Infinity,rect=current&&current.getBoundingClientRect();if(!rect)return;
    var x=rect.left+rect.width/2,y=rect.top+rect.height/2;
    nodes.forEach(function(node){if(node===current)return;var r=node.getBoundingClientRect(),dx=r.left+r.width/2-x,dy=r.top+r.height/2-y,along,cross;
      if(key==='ArrowLeft'){along=-dx;cross=Math.abs(dy);}else if(key==='ArrowRight'){along=dx;cross=Math.abs(dy);}else if(key==='ArrowUp'){along=-dy;cross=Math.abs(dx);}else{along=dy;cross=Math.abs(dx);}
      if(along<=3)return;var s=along+cross*2.8;if(s<bestScore){best=node;bestScore=s;}
    });if(best){best.focus();try{best.scrollIntoView({block:'nearest',inline:'nearest'});}catch(e){best.scrollIntoView(false);}event.preventDefault();}
  }
  var suggestTimer=null;
  function renderLetterPicker(){
    var box=$('letterPicker');if(!box||box.dataset.built)return;box.dataset.built='1';
    var keys=[];
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('').forEach(function(ch){
      var b=element('button','letter-key',ch);b.type='button';
      b.onclick=function(){var q=$('query');q.value=(q.value+ch).slice(0,120);updateSuggestions();};
      keys.push(b);
    });
    var back=element('button','letter-key letter-action','退格');back.type='button';
    back.onclick=function(){var q=$('query');q.value=q.value.slice(0,-1);updateSuggestions();};
    var clear=element('button','letter-key letter-action','清空');clear.type='button';
    clear.onclick=function(){var q=$('query');q.value='';updateSuggestions();};
    var rows=[keys.slice(0,6),keys.slice(6,12),keys.slice(12,18),keys.slice(18,24),keys.slice(24,30),keys.slice(30,36),[back,clear]];
    rows.forEach(function(row){
      var rowEl=element('div','letter-picker-row');
      row.forEach(function(b){rowEl.appendChild(b);});
      box.appendChild(rowEl);
    });
  }
  function localSuggestCandidates(){
    var out=[];
    recent.forEach(function(q){if(out.indexOf(q)<0)out.push(q);});
    favorites.forEach(function(f){if(f&&f.title&&out.indexOf(f.title)<0)out.push(f.title);});
    return out;
  }
  function renderSuggestList(items,note){
    var box=$('suggestBox');if(!box)return;box.textContent='';
    if(!items.length&&!note){box.hidden=true;return;}
    items.forEach(function(t){var b=element('button','suggest-item',t);b.type='button';b.onclick=function(){search(t);};box.appendChild(b);});
    if(note)box.appendChild(element('span','suggest-note',note));
    box.hidden=false;
  }
  function discoveryTitles(){
    var out=[],seen={},els=doc.querySelectorAll('.discovery-rail .discovery-title, .discovery-grid .discovery-title'),i,t;
    for(i=0;i<els.length&&out.length<60;i++){t=(els[i].textContent||'').replace(/^\s+|\s+$/g,'');if(t&&!seen[t]){seen[t]=true;out.push(t);}}
    return out;
  }
  function renderSuggestHome(){
    var home=$('suggestHome');if(!home)return;home.textContent='';
    var hb=element('div','suggest-section');
    hb.appendChild(element('h4','suggest-head','历史搜索'));
    if(!recent.length)hb.appendChild(element('span','suggest-note','暂无历史搜索'));
    recent.slice(0,8).forEach(function(t){var b=element('button','suggest-item',t);b.type='button';b.onclick=function(){search(t);};hb.appendChild(b);});
    home.appendChild(hb);
    var hot=element('div','suggest-section');
    hot.appendChild(element('h4','suggest-head','热门搜索'));
    var DD=window.GGDiscoveryData;
    if(!DD||typeof DD.recommendations!=='function'){hot.appendChild(element('span','suggest-note','热门搜索暂不可用'));home.appendChild(hot);home.hidden=false;return;}
    var hotSeen={},hotTitles=[],hotCached=read('hot-search.v1',null),hotNote=element('span','suggest-note','正在后台更新热门搜索…');
    function appendHot(t){if(typeof t!=='string'||!t||t.length>120||hotSeen[t]||hotTitles.length>=12)return;hotSeen[t]=true;hotTitles.push(t);var b=element('button','suggest-item',t);b.type='button';b.onclick=function(){search(t);};hot.appendChild(b);}
    if(hotCached&&Array.isArray(hotCached.titles)&&Date.now()-Number(hotCached.time)<86400000)hotCached.titles.forEach(appendHot);
    discoveryTitles().slice(0,12).forEach(appendHot);
    hot.appendChild(hotNote);
    var freshTitles=[],freshSeen={};
    function hotSection(sec){if(!sec||['hot-tv','hot-movie','hot-variety'].indexOf(sec.id)<0||!sec.items)return;
      sec.items.slice(0,10).forEach(function(it){var t=it&&it.title;if(t&&!freshSeen[t]){freshSeen[t]=true;freshTitles.push(t);appendHot(t);}});
      if(freshTitles.length)write('hot-search.v1',{time:Date.now(),titles:freshTitles.slice(0,12)});
    }
    Promise.resolve().then(function(){return DD.recommendations(publicRequest,hotSection);}).then(function(sections){
      (sections||[]).forEach(hotSection);hotNote.textContent=freshTitles.length?'':hotTitles.length?'已显示本机缓存，暂未获得新榜单':'热门搜索暂不可用，可直接输入片名';hotNote.hidden=!!freshTitles.length;
    },function(){hotNote.textContent=hotTitles.length?'已显示本机缓存，联网后重试更新':'热门搜索暂不可用，可直接输入片名';});
    home.appendChild(hot);home.hidden=false;
  }
  var suggestGen=0;
  function updateSuggestions(){if(!searchEditing)return;
    var panel=$('suggestPanel');if(panel)panel.hidden=false;
    var q=$('query').value.replace(/^\s+|\s+$/g,'');
    var home=$('suggestHome');
    if(!q){
      if(suggestTimer)clearTimeout(suggestTimer);
      var sb0=$('suggestBox');if(sb0)sb0.hidden=true;
      renderSuggestHome();
      return;
    }
    if(home)home.hidden=true;
    var pool=localSuggestCandidates().concat(discoveryTitles());
    var local=C.rankSuggestions(q,pool).slice(0,8);
    renderSuggestList(local);
    if(suggestTimer)clearTimeout(suggestTimer);
    suggestTimer=setTimeout(function(){
      var qq=$('query').value.replace(/^\s+|\s+$/g,'');if(!qq||qq!==q)return;
      var gen=++suggestGen;
      var bySource={douban:null,iqiyi:null,tencent:null};
      var settled=0,failedLive=0;
      function current(){return $('query').value.replace(/^\s+|\s+$/g,'');}
      function anyRemote(){return (bySource.douban&&bySource.douban.length)||(bySource.iqiyi&&bySource.iqiyi.length)||(bySource.tencent&&bySource.tencent.length);}
      function renderMerged(){
        if(gen!==suggestGen||current()!==qq)return;
        var merged=C.mergeSuggestions([bySource.douban||[],bySource.iqiyi||[],bySource.tencent||[]],4,12);
        var out=local.slice();
        merged.forEach(function(t){if(out.indexOf(t)<0)out.push(t);});
        renderSuggestList(out.slice(0,12));
      }
      function settle(key,items,liveOk){
        if(gen!==suggestGen||current()!==qq)return;
        bySource[key]=items||[];
        settled++;
        if(liveOk===false)failedLive++;
        if(settled>=3){
          if(failedLive>=2&&!local.length&&!anyRemote())renderSuggestList([],'建议暂不可用，点“搜索资源”直接搜');
          else renderMerged();
        }else renderMerged();
      }
      directGet('https://movie.douban.com/j/subject_suggest?q='+encodeURIComponent(qq),{timeout:8,headers:{'Referer':'https://movie.douban.com/'}}).then(function(res){var body;try{body=JSON.parse(res.body||'[]');}catch(e){body=[];}settle('douban',C.parseDoubanSuggest(body),true);},function(){settle('douban',[],false);});
      directGet('https://suggest.video.iqiyi.com/?if=mobile&key='+encodeURIComponent(qq),{timeout:8}).then(function(res){var body;try{body=JSON.parse(res.body||'{}');}catch(e){body={};}settle('iqiyi',C.parseIqiyiSuggest(body),true);},function(){settle('iqiyi',[],false);});
      settle('tencent',[],null);
    },250);
  }
  $('searchForm').onsubmit=function(e){e.preventDefault();search($('query').value);};
  $('nativeSearchBtn').onclick=function(){nativeSearch($('query').value);};
  $('query').oninput=updateSuggestions;$('query').onfocus=updateSuggestions;$('settingsForm').onsubmit=saveSettings;
  $('settingsOpen').onclick=openSettings;
  var homeBtn=$('searchHomeBtn');if(homeBtn)homeBtn.onclick=function(){state.favorites=false;setMode('home');if($('homeNav'))$('homeNav').focus();reassertChrome();};$('brand').onclick=$('homeNav').onclick=function(){state.favorites=false;setMode('home');var go=function(){if(viewMode==='home'&&discovery)discovery.home();};if(overlayHistory&&overlayHistory.afterSync)overlayHistory.afterSync(go);else go();};$('favoritesNav').onclick=showFavorites;
  function focusSearchKeyboard(){var keys=$('letterPicker')?$('letterPicker').querySelectorAll('.letter-key'):[],first=null;for(var ki=0;ki<keys.length;ki++)if(keys[ki].textContent==='A'){first=keys[ki];break;}first=first||$('searchButton');if(first)first.focus();}
  function openWebSearch(){state.favorites=false;setMode('search');updateSuggestions();focusSearchKeyboard();}
  $('searchNav').onclick=openWebSearch;
  $('webSearchFallback').onclick=function(){closeModal('settingsModal');openWebSearch();};
  $('nativeKeySetup').onclick=function(){markNativeChrome();waitSdk().then(function(fm){if(typeof fm.vod!=='function')throw new Error('请在站点列表打开配置与诊断 · 自建，选择设备访问密钥');closeModal('settingsModal');return fm.vod('godnext_settings','device_key','原生搜索设备密钥','');}).catch(function(e){resumeNativeChrome();toast(e.message||'请从配置与诊断 · 自建填写原生设备密钥');});};
  $('sitesNav').onclick=function(){state.favorites=false;setMode('sites');};
  $('bridgeStatus').onclick=function(){probeBridge().then(function(){toast(bridgeReady?'播放器接口已连接':'尚未连接，请在支持 WebHome 的 App 中打开');});};
  all('[data-settings-tab]').forEach(function(b){b.onclick=function(){showSettingsTab(b.dataset.settingsTab);};});
  all('[data-close]').forEach(function(b){b.onclick=function(){closeModal(b.dataset.close);};});
  all('.modal').forEach(function(m){m.onclick=function(e){if(e.target===m)closeModal(m.id);};});
  all('[data-suggest]').forEach(function(b){b.onclick=function(){search(b.dataset.suggest);};});


  function setSearchEditor(expand,focus){
    searchEditing=!!expand;var grid=$('searchArea').querySelector('.search-grid');$('letterPicker').hidden=!searchEditing;$('sourceChecks').hidden=!searchEditing;doc.body.classList.toggle('gg-search-collapsed',!searchEditing);$('editSearch').hidden=!state.query;
    if(state.query&&searchEditing)grid.setAttribute('data-gg-back-layer','search-edit');else grid.removeAttribute('data-gg-back-layer');
    if(!searchEditing){if(searchInput)searchInput.close(false,true);$('suggestPanel').hidden=true;$('suggestBox').hidden=true;$('suggestHome').hidden=true;}else if(state.query)updateSuggestions();
    doc.dispatchEvent(new Event('gg-back-layer-change'));if(focus){if(searchEditing)focusSearchKeyboard();else $('editSearch').focus();}
  }
  $('editSearch').onclick=function(){setSearchEditor(true,true);};
  function statusLabel(){var all=F.states,hidden=all.filter(function(k){return k!=='bad';});if(checkFilter.length===all.length)return '全部状态';if(checkFilter.length===hidden.length&&hidden.every(function(k){return checkFilter.indexOf(k)>=0;}))return '隐藏确认失效';if(checkFilter.length===1&&checkFilter[0]==='ok')return '仅显示有效分享';var names={ok:'有效',bad:'失效',locked:'锁定',pending:'待检测',unknown:'未知/过期',timeout:'超时',unsupported:'不支持',rate_limited:'受限'};return checkFilter.length?checkFilter.map(function(k){return names[k];}).join('、'):'未选择状态';}
  function setStatusPreset(value){focusedCheckHold=null;checkFilter=value==='all'?F.states.slice():value==='valid'?['ok']:F.states.filter(function(k){return k!=='bad';});write('search-check-filter.v1',checkFilter);syncFilterControls();renderFilterViews();}
  function buildStatusPresets(parent){var wrap=element('div','status-presets');[['all','全部'],['hide-bad','隐藏失效'],['valid','仅有效']].forEach(function(item){var b=element('button','subbutton',item[1]);b.type='button';b.dataset.checkPreset=item[0];b.onclick=function(){setStatusPreset(item[0]);};wrap.appendChild(b);});wrap.appendChild(element('span','status-selection-note',statusLabel()));parent.appendChild(wrap);}
  function syncStatusPresets(){all('[data-check-preset]').forEach(function(b){var want=b.dataset.checkPreset==='all'?F.states:b.dataset.checkPreset==='valid'?['ok']:F.states.filter(function(k){return k!=='bad';});b.setAttribute('aria-pressed',String(want.length===checkFilter.length&&want.every(function(k){return checkFilter.indexOf(k)>=0;})));});all('.status-selection-note').forEach(function(n){n.textContent='显示：'+statusLabel();});}
  function collectCountRows(filtered){var rows=[],map={};visibleGroupKeys().forEach(function(k){var values=filtered?groupRowsFor(k):searchGroups[k].rows;rows=rows.concat(values);});if(searchSourcesHas('ref'))rows=rows.concat(filtered?referenceMixRows.filter(displayMatch):referenceMixRows);return rows.filter(function(row){var k=row.__reference?'ref:'+row.siteKey+':'+row.url:C.dedupKey(row.url);if(map[k])return false;map[k]=1;return true;});}
  function refreshSearchSummary(){if(viewMode!=='search'||!state.query)return;var total=collectCountRows(false),visible=collectCountRows(true),pending=total.filter(function(row){return F.category(row,window.GGCheckLedger)==='pending';}).length,loading=visibleGroupKeys().filter(function(k){return searchGroups[k].status==='loading';}).length;
    $('resultSummary').textContent='已返回 '+total.length+' 条 · 显示 '+visible.length+' 条 · 待检测 '+pending+' 条'+(loading?' · '+loading+' 来源加载中':'');$('resultSummary').dataset.total=String(total.length);$('resultSummary').dataset.visible=String(visible.length);$('resultSummary').dataset.pending=String(pending);var recovery=$('searchFilterEmpty');if(recovery){recovery.hidden=!(total.length&&!visible.length);if(!recovery.hidden)$('emptyState').hidden=true;}syncStatusPresets();
  }
  var recovery=element('div','search-filter-empty');recovery.id='searchFilterEmpty';recovery.hidden=true;recovery.appendChild(element('p','','筛选后暂无结果；原始候选仍保留。'));var recoverButton=element('button','subbutton','恢复全部筛选');recoverButton.type='button';recoverButton.onclick=function(){focusedCheckHold=null;$('resetFilters').click();};recovery.appendChild(recoverButton);var editEmpty=element('button','subbutton','修改关键词');editEmpty.type='button';editEmpty.onclick=function(){setSearchEditor(true,true);};recovery.appendChild(editEmpty);$('searchGroups').parentNode.insertBefore(recovery,$('searchGroups'));

  function renderFilterViews(){
    var active=doc.activeElement,box=$('searchGroups'),inResults=box.contains(active),id=inResults&&active.dataset.id,index=inResults?all('[data-id]',box).indexOf(active):-1,x=window.pageXOffset,y=window.pageYOffset;
    if(viewMode==='search'&&state.query)renderSearchGroups();else if(state.favorites)renderResults(false);
    if(referenceSearch&&referenceSearch.applyFilters)referenceSearch.applyFilters();
    if(inResults){var cards=all('[data-id]',box),target=null;cards.some(function(card){if(card.dataset.id===id){target=card;return true;}return false;});if(!target)target=cards[Math.min(Math.max(0,index),cards.length-1)]||$('qualityQuickAll');if(target){try{target.focus({preventScroll:true});}catch(e){target.focus();}if(target.dataset.id===id)window.scrollTo(x,y);else target.scrollIntoView({block:'nearest'});}}
  }
  function syncFilterControls(){syncStatusPresets();
    if(!$('quality'))return;$('quality').value=state.filter.quality;var selected=F.selected(state.filter.quality);all('[data-gg-quality]').forEach(function(n){n.checked=selected.indexOf(n.value)>=0;});all('[data-gg-quality-unknown]').forEach(function(n){n.checked=state.filter.keepUnknownQuality!==false;});all('[data-gg-check-filter]').forEach(function(n){n.checked=checkFilter.indexOf(n.value)>=0;});
  }
  function buildQualityControls(parent,quick){
    var field=element('fieldset','quality-filter-controls'),legend=element('legend','',quick?'画质标注筛选':'画质标注（与搜索页同步）');field.appendChild(legend);var allButton=element('button','textbutton','全部');allButton.type='button';if(quick)allButton.id='qualityQuickAll';allButton.onclick=function(){state.filter.quality='';state.filter.keepUnknownQuality=true;$('quality').value='';changeFilters();};field.appendChild(allButton);
    F.qualities.forEach(function(k){var label=element('label','filter-chip'),input=element('input');input.type='checkbox';input.value=k;input.setAttribute('data-gg-quality','');input.onchange=function(){var values=all('[data-gg-quality]',field).filter(function(n){return n.checked;}).map(function(n){return n.value;});$('quality').value=F.selected(values).join('|');changeFilters();};label.appendChild(input);label.appendChild(doc.createTextNode(k));field.appendChild(label);});
    var keep=element('label','filter-chip'),unknown=element('input');unknown.type='checkbox';unknown.setAttribute('data-gg-quality-unknown','');unknown.onchange=function(){state.filter.keepUnknownQuality=unknown.checked;write('filters.v1',state.filter);syncFilterControls();renderFilterViews();};keep.appendChild(unknown);keep.appendChild(doc.createTextNode('保留未标注'));field.appendChild(keep);field.appendChild(element('small','field-note','分辨率多选为任一；HDR/DV/高码需同时标注。未标注指没有任何画质标记；均为来源声明，非实测。'));parent.appendChild(field);
  }
  var oldQuality=$('quality'),qualityHost=oldQuality.parentNode,hiddenQuality=element('input');hiddenQuality.type='hidden';hiddenQuality.id='quality';hiddenQuality.value=state.filter.quality;var qualityContainer=element('div','quality-settings-host');qualityHost.parentNode.replaceChild(qualityContainer,qualityHost);qualityHost=qualityContainer;qualityHost.appendChild(hiddenQuality);buildQualityControls(qualityHost,false);
  var quickHost=element('div','quality-quick');$('searchGroups').parentNode.insertBefore(quickHost,$('searchGroups'));buildQualityControls(quickHost,true);buildStatusPresets(quickHost);
  var checkHostUI=element('fieldset','check-filter-controls'),legend=element('legend','','检测状态（多选，仅筛选搜索显示）');checkHostUI.appendChild(legend);var checkNames={ok:'有效',bad:'确认失效',locked:'需提取码／锁定',pending:'待检测',unknown:'未知／过期',timeout:'超时',unsupported:'不支持',rate_limited:'请求受限'};
  F.states.forEach(function(k){var label=element('label','filter-chip'),input=element('input');input.type='checkbox';input.value=k;input.setAttribute('data-gg-check-filter','');input.onchange=function(){checkFilter=all('[data-gg-check-filter]',checkHostUI).filter(function(n){return n.checked;}).map(function(n){return n.value;});write('search-check-filter.v1',checkFilter);syncFilterControls();renderFilterViews();};label.appendChild(input);label.appendChild(doc.createTextNode(checkNames[k]));checkHostUI.appendChild(label);});
  var reset=element('button','textbutton','选择全部状态');reset.type='button';reset.onclick=function(){checkFilter=F.states.slice();write('search-check-filter.v1',checkFilter);syncFilterControls();renderFilterViews();};checkHostUI.appendChild(reset);checkHostUI.appendChild(element('small','field-note','默认全部。过期或检查时间不可靠归未知；参考站详情没有网盘检测数据，也归未知。取消未知会隐藏这些站点卡。筛选不发起检测、不改变原始结果；关闭自动检测时结果可保持待检测。'));buildStatusPresets(checkHostUI);doc.querySelector('[data-settings-panel="search"]').appendChild(checkHostUI);
  syncFilterControls();
  window.addEventListener('gg-check-updated',function(){holdFocusedCheckChange();applySearchCheckDots();if(filterRenderTimer)return;filterRenderTimer=setTimeout(function(){filterRenderTimer=null;if(checkFilter.length!==F.states.length)renderFilterViews();},100);});

  ['quality','sort','since','minSize','keepUnknown'].forEach(function(k){$(k).onchange=changeFilters;$(k)[k==='keepUnknown'?'checked':'value']=state.filter[k];});
  $('exclude').value=state.filter.exclude;var filterTimer=null;$('exclude').oninput=function(){clearTimeout(filterTimer);filterTimer=setTimeout(changeFilters,200);};
  $('resetFilters').type='button';$('resetFilters').onclick=function(){state.filter={quality:'',keepUnknownQuality:true,sort:'relevance',since:'0',minSize:'0',exclude:'',keepUnknown:true};checkFilter=F.states.slice();write('search-check-filter.v1',checkFilter);['quality','sort','since','minSize','exclude'].forEach(function(k){$(k).value=state.filter[k];});$('keepUnknown').checked=true;changeFilters();};
  function movePage(step){if(!pageOrder)pageOrder=filtered(true).map(function(row){return row.id;});state.page+=step;renderResults(true);var first=$('resourceGrid').firstElementChild;if(first){first.focus();first.scrollIntoView({block:'start'});}}
  $('previousPage').onclick=function(){movePage(-1);};$('nextPage').onclick=function(){movePage(1);};
  $('retryButton').onclick=function(){if(state.query)search(state.query);};
  $('playButton').onclick=play;$('favoriteButton').onclick=function(){if(!selected)return;var found=favorites.some(function(r){return r.id===selected.id;});if(found)favorites=favorites.filter(function(r){return r.id!==selected.id;});else favorites.unshift(selected);favorites=favorites.slice(0,300);write('favorites.v1',favorites);$('favoriteCount').textContent=String(favorites.length);updateFavoriteButton();if(state.favorites){state.rows=favorites.slice();renderResults(false);}toast(found?'已取消收藏':'已加入本机收藏');};
  function deleteFavorite(id){var cards=$('resourceGrid').querySelectorAll('.resource-card'),index=-1,i;for(i=0;i<cards.length;i++)if(cards[i].dataset.id===id){index=i;break;}favorites=favorites.filter(function(r){return r.id!==id;});write('favorites.v1',favorites);$('favoriteCount').textContent=String(favorites.length);if(state.favorites){state.rows=favorites.slice();renderResults(false);}toast('已删除收藏');var rest=$('resourceGrid').querySelectorAll('.resource-card');if(rest.length){var target=rest[Math.min(Math.max(0,index),rest.length-1)];if(target)target.focus();}else{favoritesEdit=false;renderResults(false);if($('favoritesNav'))$('favoritesNav').focus();}}
  function enterFavoritesEdit(id){if(!state.favorites)return;favoritesEdit=true;renderResults(false);var cards=$('resourceGrid').querySelectorAll('.resource-card'),i;for(i=0;i<cards.length;i++)if(cards[i].dataset.id===id){cards[i].focus();break;}}
  $('copyButton').onclick=function(){if(!selected)return;var text=selected.url+(selected.password?' 提取码：'+selected.password:'');if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(function(){toast('分享链接已复制');},function(){toast('当前客户端不支持复制，请从原生详情分享');});else toast('当前客户端不支持复制，请从原生详情分享');};
  $('clearKey').onclick=function(){credential='';remove('device-key.v1');$('deviceKey').value='';generation++;cache={};cacheKeys=[];state.rows=[];state.errors={};state.active={pan:'idle',tg:'idle'};updateKeyBadge();if(state.query)renderResults(true);toast('本机密钥和搜索缓存已清除，网盘授权未改');};
  $('clearTmdbKey').onclick=function(){prefs=Object.assign({},prefs,{tmdbKey:''});enrichCache={};write('preferences.v1',prefs);if($('tmdbKey'))$('tmdbKey').value='';updateTmdbKeyStatus();toast('TMDB Key 已清除，详情改用原封面');};
  if($('favoritesDone'))$('favoritesDone').onclick=function(){if(!state.favorites||!favoritesEdit)return;favoritesEdit=false;renderResults(false);var first=$('resourceGrid').firstElementChild;if(first)first.focus();};
  $('exportSettings').onclick=function(){var clean={schema:1,preferences:prefs,filters:state.filter};$('exportText').value=JSON.stringify(clean,null,2);$('exportText').hidden=false;toast('仅导出偏好，不含密钥、收藏或分享链接');};
  var topbarEl=doc.querySelector('.topbar');
  if(window.GGChrome)chromeUI=window.GGChrome.mount({document:doc,isTV:function(){return doc.body.classList.contains('gg-tv');},header:false});
  if(window.GGSearchInput)searchInput=window.GGSearchInput.mount({document:doc,isSearch:function(){return viewMode==='search';},onBegin:function(){setSearchEditor(true,false);},focusKeyboard:focusSearchKeyboard});
  function topbarShow(){if(chromeUI)chromeUI.show(false);}
  function topbarHide(){if(chromeUI)chromeUI.hide();}
  function markNativeChrome(){if(playbackReturn)playbackReturn.capture();if(chromeUI)chromeUI.nativeLaunch();}
  function resumeNativeChrome(){if(chromeUI)chromeUI.resume();}
  if(window.GGNavigation)navigation=window.GGNavigation.mount({document:doc,isTV:false,isSearchView:function(){return C.isSearchView(viewMode);},consumeBack:function(){return !!(discovery&&discovery.consumeBack&&discovery.consumeBack());},onBack:function(){if(state.favorites&&favoritesEdit){favoritesEdit=false;renderResults(false);var first=$('resourceGrid').firstElementChild;if(first)first.focus();return;}if(viewMode!=='home'){state.favorites=false;setMode('home');$('homeNav').focus();}}});else doc.addEventListener('keydown',keyNavigation);
  if(window.GGOverlayHistory)overlayHistory=window.GGOverlayHistory.mount({document:doc,closeTransient:function(layer){
    var kind=layer.getAttribute('data-gg-back-layer');
    if(kind==='sites'||kind==='favorites'){state.favorites=false;setMode('home');if($('homeNav'))$('homeNav').focus();reassertChrome();return true;}
    if(kind==='favorites-edit'){favoritesEdit=false;renderResults(false);var first=$('resourceGrid').firstElementChild;if(first)first.focus();return true;}
    if(kind==='search-edit'){setSearchEditor(false,true);return true;}
    if(kind==='search-input')return !!(searchInput&&searchInput.close(true));
    if(kind==='history-edit')return !!(discovery&&discovery.consumeBack&&discovery.consumeBack());
    if(kind==='search'){state.favorites=false;setMode('home');if($('homeNav'))$('homeNav').focus();reassertChrome();return true;}
    return false;
  }});
  function resumeBridge(){Promise.resolve(probeBridge()).then(function(){if(playbackReturn)playbackReturn.restore();});}
  window.addEventListener('fmsdk',function(){showBridge(!!(window.fm&&window.fm.req));});window.addEventListener('fmresume',resumeBridge);
  var chromeTimer=null;
  function reassertChrome(){if(chromeUI){chromeUI.request(false);return;}if(chromeTimer)clearTimeout(chromeTimer);chromeTimer=setTimeout(function(){waitSdk(3000).then(function(fm){applyChrome(fm,doc.body.classList.contains('gg-tv'));},function(){});},300);}
  doc.addEventListener('keydown',function(e){var k=e.key||({4:'Escape'}[e.keyCode]);if(k==='Escape'||k==='BrowserBack'||k==='GoBack'||k==='Back')reassertChrome();},true);
  window.addEventListener('pageshow',resumeBridge);
  window.GGApp={version:'RC74',inspect:function(){return {query:state.query,count:state.favorites?state.rows.length:searchTotal,source:state.source,disk:state.disk,page:state.page,providers:state.active,keyPresent:!!credential,mode:viewMode,chromeRequest:chromeRequest,chrome:chromeUI&&chromeUI.inspect(),searchInput:searchInput&&searchInput.inspect(),navigation:navigation&&navigation.inspect()};}};
  function publicRequest(url,options){
    return schedule(function(){return waitSdk().then(function(fm){var opts=options||{},headers={};Object.keys(opts.headers||{}).forEach(function(k){headers[k]=opts.headers[k];});headers['User-Agent']='Mozilla/5.0';return fm.req(url,{method:'GET',headers:headers,responseType:'text',timeout:Math.max(1,Math.min(12,opts.timeout||12))});}).then(function(response){if(!response||!response.ok)throw new Error('站点请求失败（'+(response&&response.status||'未知')+'）');return response;});},/^https:\/\/(?:movie|m)\.douban\.com\//.test(url));
  }
  function directGet(url,options){
    var opts=options||{},headers={};Object.keys(opts.headers||{}).forEach(function(k){headers[k]=opts.headers[k];});headers['User-Agent']='Mozilla/5.0';
    return waitSdk().then(function(fm){return fm.req(url,{method:'GET',headers:headers,responseType:'text',timeout:Math.max(1,Math.min(12,opts.timeout||12))});}).then(function(response){if(!response||!response.ok)throw new Error('站点请求失败（'+(response&&response.status||'未知')+'）');return response;});
  }
  function postRequest(url,options){
    var opts=options||{},headers={};Object.keys(opts.headers||{}).forEach(function(k){headers[k]=opts.headers[k];});headers['User-Agent']='Mozilla/5.0';
    var method=(opts.method==='GET')?'GET':'POST';
    return waitSdk().then(function(fm){return fm.req(url,{method:method,headers:headers,body:(method==='GET'?'':(opts.body||'')),responseType:'text',timeout:Math.max(1,Math.min(30,opts.timeout||20))});}).then(function(response){if(!response||!response.ok)throw new Error('请求失败（'+(response&&response.status||'未知')+'）');return response;});
  }
  function checkLinksOpen(items){
    if(!items.length)return Promise.resolve([]);
    var payload=items.map(function(it){return {url:it.url,password:it.password,disk_type:it.disk_type};});
    var urls=['https://pstv.godroc.dpdns.org/api/check/links'];
    function tryNext(i){
      if(i>=urls.length)return Promise.resolve(items.map(function(){return 'unknown';}));
      return waitSdk(8000).then(function(fm){
        return fm.req(urls[i],{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'Mozilla/5.0'},body:JSON.stringify({items:payload}),responseType:'json',timeout:8});
      }).then(function(response){
        var body=response&&response.body,status=Number(response&&response.status)||0;
        if(!response||!response.ok||status<200||status>=300)throw new Error('check failed');
        if(typeof body==='string'){try{body=JSON.parse(body);}catch(e){body=null;}}
        return window.GGCheckLedger.record(body,payload,C.parseCheckResults(body,payload),'backend');
      }).catch(function(){return tryNext(i+1);});
    }
    return tryNext(0);
  }
  function imageSource(url){
    if(!/^https?:\/\//i.test(url||''))return '';var fm=window.fm,headers={};if(/\.doubanio\.com\//i.test(url))headers.Referer='https://movie.douban.com/';
    if(fm&&typeof fm.res==='function'){try{var local=fm.res(url,{headers:headers});if(typeof local==='string'&&local)return local;}catch(e){}}
    return url;
  }
  function nativeSearch(title,row){title=String(title||'').trim();if(!title){toast('请先输入片名');$('query').focus();return;}markNativeChrome();waitSdk().then(function(fm){if(typeof fm.search!=='function')throw new Error('当前客户端不支持网页跳转原生搜索；请回到原生搜索输入片名');return fm.search(title,{direct:true,pic:row&&row.image||'',wallPic:row&&row.backdrop||''});}).catch(function(e){resumeNativeChrome();toast(e.message||'原生搜索调用失败');});}
  function shareRow(row,source){var data={data:{merged_by_type:{}}};data.data.merged_by_type[row.type||'other']=[row];var normalized=C.normalize(data,'catalog');var origin=window.GGProviders.definitions.filter(function(d){return d.key===(source&&source.siteKey);})[0];providerNames.catalog=origin?origin.name:'资源站点';if(normalized.length){normalized[0].image=row.image||source&&source.image||'';playDirect(normalized[0]);}else toast('此资源类型暂不支持直接交给播放器');}
  var checkModeCache=null;
  function getCheckMode(){
    if(checkModeCache)return checkModeCache;
    checkModeCache=waitSdk(3000).then(function(fm){
      if(!fm||typeof fm.config!=='function')return 'backend';
      return Promise.resolve().then(function(){return fm.config();}).then(function(value){
        var cfg=decodeSdkBody(value);
        if(cfg&&cfg.driveCheck===false)return 'off';
        if(cfg&&cfg.driveCheck===true&&fm.pan&&typeof fm.pan.check==='function')return 'host';
        return 'backend';
      },function(){return 'backend';});
    }).catch(function(){return 'backend';});
    return checkModeCache;
  }
  function checkHost(items){
    if(!items.length)return Promise.resolve([]);
    return waitSdk(8000).then(function(fm){
      if(!fm||!fm.pan||typeof fm.pan.check!=='function')throw new Error('no host check');
      var diskItems=[],map=[];
      items.forEach(function(it,idx){ if(C.disks[it.disk_type]){map.push(idx);diskItems.push({type:it.disk_type,url:it.url,password:it.password||''});} });
      if(!diskItems.length)return items.map(function(){return 'unsupported';});
      return fm.pan.check(diskItems).then(function(result){
        var body=decodeSdkBody(result),list=null;
        if(body&&Array.isArray(body.results))list=body.results;
        else if(Array.isArray(body))list=body;
        else if(body&&Array.isArray(body.data))list=body.data;
        var out=items.map(function(){return 'unsupported';});
        function norm(u){try{var x=new URL(u);x.searchParams.delete('pwd');x.searchParams.delete('password');return x.href;}catch(e){return String(u||'');}}
        if(list){
          var byUrl={};list.forEach(function(r){if(r&&typeof r.url==='string')byUrl[norm(r.url)]=r;});
          diskItems.forEach(function(di,diIdx){
            var r=byUrl[norm(di.url)];
            var st=r?String(r.state||r.status||'').toLowerCase():'';
            var mapped='unknown';
            if(st==='ok')mapped='ok';else if(st==='bad')mapped='bad';else if(st==='locked')mapped='locked';else if(st==='unsupported')mapped='unsupported';else if(st==='uncertain')mapped='uncertain';
            out[map[diIdx]]=mapped;
          });
        }
        return window.GGCheckLedger.record(body,items,out,'host');
      });
    }).catch(function(e){return window.GGCheckLedger.failed(items,/timeout|timed.?out/i.test(String(e&&e.message||''))?'timeout':'unknown','host');});
  }
  function searchPanSelf(title){
    if(!C.validKey(credential))return Promise.resolve({rows:[],ms:0,error:'need-key'});
    var started=Date.now(),g=generation;
    function once(attempt){
      return request('pan',title,credential,g).then(function(r){
        if(r.pending){
          if(attempt>=3)return Promise.resolve({rows:[],ms:Date.now()-started,error:'failed'});
          return new Promise(function(resolve){setTimeout(resolve,Math.min(8000,2000*Math.pow(2,attempt)));}).then(function(){return once(attempt+1);});
        }
        return {rows:r.rows||[],ms:Date.now()-started};
      },function(){return {rows:[],ms:Date.now()-started,error:'failed'};});
    }
    return once(0);
  }
  function searchPanPublic(title){
    var started=Date.now();
    function parsePublic(res){
      var body=res&&res.body;if(typeof body==='string'){try{body=JSON.parse(body);}catch(e){throw new Error('bad json');}}
      if(!body||body.error||(typeof body.code==='number'&&body.code!==0&&body.code!==200))throw new Error('public pan failed');
      return (C.normalize)?C.normalize(body,'pan'):[];
    }
    return postRequest('https://so.252035.xyz/api/search',{headers:{'Content-Type':'application/json'},body:JSON.stringify({kw:title}),timeout:30}).then(function(res){
      try{return {rows:parsePublic(res),ms:Date.now()-started};}
      catch(e){return {rows:[],ms:Date.now()-started,error:'failed'};}
    },function(err){
      var ms=Date.now()-started,msg=(err&&err.message)||'',m=msg.match(/（(\d+)）/),status=m?Number(m[1]):0;
      var kind=(C.panPublicErrorKind)?C.panPublicErrorKind(status,ms):'failed';
      return {rows:[],ms:ms,error:kind};
    });
  }
  var mipanToken='';
  function parseJsonBody(v){if(!v)return null;if(typeof v!=='string')return v;try{return JSON.parse(v);}catch(e){return null;}}
  function searchMipan(title){
    function getToken(){
      if(mipanToken)return Promise.resolve(mipanToken);
      return postRequest('https://www.mipan.so/api/token',{method:'GET',headers:{'Accept':'application/json','Referer':'https://www.mipan.so/'},timeout:10}).then(function(res){
        var body=parseJsonBody(res&&res.body);
        if(!body||!body.token)throw new Error('no token');
        mipanToken=body.token;return mipanToken;
      });
    }
    function searchOnce(token){
      return postRequest('https://www.mipan.so/api/search',{headers:{'Content-Type':'application/json','X-Mipan-Token':token,'Referer':'https://www.mipan.so/'},body:JSON.stringify({kw:title}),timeout:20}).then(function(res){
        var body=parseJsonBody(res&&res.body);
        if(body&&typeof body.code==='number'&&body.code!==0&&body.code!==200)throw new Error('mipan code '+body.code);
        var data=body&&body.data?body.data:body,rows=[];
        if(data){
          if(data.merged_by_type)rows=C.normalize(data,'mipan');
          else if(Array.isArray(data.results)){var grouped=C.groupResultsByDisk?C.groupResultsByDisk(data.results):{};rows=C.normalize({merged_by_type:grouped},'mipan');}
        }
        return rows;
      });
    }
    return getToken().then(function(tok){
      return searchOnce(tok).catch(function(){mipanToken='';return getToken().then(searchOnce);});
    }).then(function(rows){return {rows:rows};},function(){return {rows:[],error:'failed'};});
  }
  function searchQupan(title){
    return postRequest('https://b.funletu.com/search',{headers:{'Content-Type':'application/json','Origin':'https://b.funletu.com','Referer':'https://b.funletu.com'},body:JSON.stringify({keyword:title,categoryid:0,filetypeid:1,courseid:1,page:1,pageSize:15,sortBy:'sort',order:'desc',offset:0}),timeout:20}).then(function(res){
      var body=parseJsonBody(res&&res.body);
      if(!body||Number(body.code)!==200||!body.data||!Array.isArray(body.data.list))return {rows:[],error:'failed'};
      var grouped={},i,it,host,type,title2;
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
        title2=String(it.title||'').replace(/<\/?em>/gi,'');
        (grouped[type]||(grouped[type]=[])).push({url:it.url,title:title2,password:String(it.extcode||''),size:it.size||''});
      }
      return {rows:C.normalize({merged_by_type:grouped},'qupan')};
    },function(){return {rows:[],error:'failed'};});
  }
  function checkLinks(items){
    if(!items.length)return Promise.resolve([]);
    if(!C.validKey(credential))return Promise.resolve(items.map(function(){return 'unknown';}));
    var payload=items.map(function(it){return {url:it.url,password:it.password,disk_type:it.disk_type};});
    return waitSdk(8000).then(function(fm){
      return fm.req(C.checkEndpoint(),{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+credential,'User-Agent':'Mozilla/5.0'},body:JSON.stringify({items:payload}),responseType:'json',timeout:8});
    }).then(function(response){
      var body=response&&response.body,status=Number(response&&response.status)||0;
      if(!response||!response.ok||status<200||status>=300)throw new Error('check failed');
      if(typeof body==='string'){try{body=JSON.parse(body);}catch(e){body=null;}}
      return window.GGCheckLedger.record(body,payload,C.parseCheckResults(body,payload),'backend');
    }).catch(function(e){return window.GGCheckLedger.failed(items,/timeout|timed.?out/i.test(String(e&&e.message||''))?'timeout':'unknown','backend');});
  }
  if(window.GGReferenceSearch)referenceSearch=window.GGReferenceSearch.mount({container:$('referenceResults'),providers:window.GGProviders,request:publicRequest,imageSource:imageSource,hideForm:true,rowFilter:function(row){var copy={title:row.title,tags:row.tags||[],__reference:true};return displayMatch(copy);},onRows:function(rows,q){if(q!==state.query)return;referenceMixRows=rows.map(function(row){var copy={};Object.keys(row).forEach(function(k){copy[k]=row[k];});copy.id='reference:'+row.siteKey+':'+row.url;copy.__reference=true;copy.type='';copy.tags=[];copy.date=null;copy.size=null;copy.sources=[(window.GGProviders.definitions.filter(function(d){return d.key===row.siteKey;})[0]||{}).name||row.siteKey];return copy;});if(mixMode)renderMixed();},onDetailClose:function(){if(mixMode){$('referenceResults').hidden=true;renderMixed();}},onShare:shareRow,onNativeSearch:nativeSearch});
  function loadHistory(){
    function bounded(call,ms){return new Promise(function(resolve,reject){var finished=false,timer=setTimeout(function(){if(!finished){finished=true;reject(new Error('读取超时'));}},ms);Promise.resolve().then(call).then(function(value){if(!finished){finished=true;clearTimeout(timer);resolve(value);}},function(error){if(!finished){finished=true;clearTimeout(timer);reject(error);}});});}
    function scope(fm){if(typeof fm.config!=='function')return Promise.resolve(null);return bounded(function(){return fm.config();},2500).then(function(value){var config=decodeSdkBody(value);return config&&config.id!==undefined&&config.id!==null?'id:'+String(config.id):null;},function(){return null;});}
    return waitSdk().then(function(fm){
      if(typeof fm.history!=='function')throw new Error('播放器不支持读取最近观看');
      return scope(fm).then(function(before){
        return bounded(function(){return fm.history();},8000).then(function(value){
          return scope(fm).then(function(after){
            if(before!==null&&after!==null&&before!==after){var changed=new Error('点播配置已切换，请重试');changed.historyScope=after;throw changed;}
            var history=decodeSdkBody(value);if(!Array.isArray(history))throw new Error('播放器返回的历史格式不正确');
            var seen={},rows=[],hidden=read('hidden-history-v1',[]);if(!Array.isArray(hidden))hidden=[];
            var nameMap={},defs=window.GGProviders?window.GGProviders.definitions||[]:[];defs.forEach(function(d){if(d.key&&d.name)nameMap[d.key]=d.name;});
            history.forEach(function(item,index){
              if(!item||typeof item!=='object'||hidden.indexOf(item.key)>=0)return;
              var key=typeof item.key==='string'&&item.key?item.key:(String(item.siteKey||'')+'@@@'+String(item.vodId||index));
              var id='history:'+key;if(seen[id])return;seen[id]=true;
              rows.push({id:id,title:typeof item.vodName==='string'&&item.vodName?item.vodName:'最近观看',image:/^https?:\/\//i.test(item.vodPic||'')?item.vodPic:'',source:C.sourceNameForKey(key,nameMap),history:item});
            });
            return loadPushArtworkMap(fm).then(function(map){
              rows.forEach(function(row){var art=(C&&C.artworkForItem)?C.artworkForItem(map,row.history):null;if(art){if(/^https?:\/\//i.test(art.pic||''))row.image=art.pic;if(art.wallPic)row.wallPic=art.wallPic;}});
              return {items:rows.slice(0,20),scope:before!==null&&after!==null?after:null};
            });
          });
        }).catch(function(error){if(!error||typeof error!=='object')error=new Error('读取失败');if(error.historyScope!==undefined)throw error;return scope(fm).then(function(afterFailure){error.historyScope=afterFailure;throw error;});});
      });
    });
  }
  function openHistory(row){var h=row.history||{},parts=String(h.key||'').split('@@@');if(parts.length<2){nativeSearch(row.title,row);return;}markNativeChrome();waitSdk().then(function(fm){if(typeof fm.vod!=='function')throw new Error('当前客户端请从原生历史入口继续观看');if(row.wallPic)return fm.vod(parts[0],parts[1],row.title,row.image||'',{wallPic:row.wallPic});return fm.vod(parts[0],parts[1],row.title,row.image||'');}).catch(function(e){resumeNativeChrome();toast(e.message||'历史入口调用失败');});}
  function quickAction(action){if(action==='sites'){$('sitesNav').click();return;}if(action==='search'){$('searchNav').click();return;}if(action==='settings'){openSettings();return;}if(action==='push'){openModal('pushModal');return;}var name=action==='live'?'openLive':action==='native'?'openVod':'openKeep';markNativeChrome();waitSdk().then(function(fm){if(typeof fm[name]!=='function')throw new Error('当前客户端请从原生菜单打开此功能');return fm[name]();}).catch(function(e){resumeNativeChrome();toast(e.message);});}
  $('pushForm').onsubmit=function(e){e.preventDefault();var url=$('pushURL').value.trim();if(!/^(https?:\/\/|magnet:\?xt=urn:btih:|ed2k:\/\/|thunder:\/\/)/i.test(url)){$('pushError').textContent='请输入网盘分享、视频网址或支持的磁力链接';return;}$('pushError').textContent='';markNativeChrome();waitSdk().then(function(fm){if(!fm.pan||typeof fm.pan.play!=='function')throw new Error('此客户端请使用原生推送入口');return fm.pan.play({url:url,title:'网页推送'});}).then(function(){closeModal('pushModal');toast('已交给播放器解析');},function(error){resumeNativeChrome();$('pushError').textContent=error.message;});};
  if(window.GGDiscovery)discovery=window.GGDiscovery.mount({container:$('discoverySection'),allowFocusBrowse:false,onSectionChange:function(){if(viewMode!=='home')setMode('home');},request:publicRequest,referenceRequest:publicRequest,imageSource:imageSource,onNativeSearch:nativeSearch,onShare:playShareDirect,onSelfRow:playDirect,checkLinks:checkLinks,postRequest:postRequest,checkLinksOpen:checkLinksOpen,loadHistory:loadHistory,onHistory:openHistory,onQuickAction:quickAction,getDiskOrder:function(){return diskPriorityOrder();},getDisplayDisks:function(){return prefs.displayDisks.slice();},getDisplayDisksOnly:function(){return prefs.displayDisksOnly;},getTmdbKey:function(){return prefs.tmdbKey||'';},getCheckMode:getCheckMode,checkHost:checkHost,searchPanSelf:searchPanSelf,searchPanPublic:searchPanPublic,getPrefetchPan:function(){return prefs.prefetchPan;},getPrefetchMipan:function(){return prefs.prefetchMipan;}});
  // Consolidate the existing action nodes (and IDs/state) into the one page navigation.
  (function(){var tabs=doc.querySelector('.discovery-types'),header=doc.querySelector('.topbar'),main=doc.querySelector('main');if(!tabs||!main)return;
    var host=element('nav','page-navigation');host.id='pageNavigationHost';host.setAttribute('aria-label','页面导航');main.insertBefore(host,main.firstChild);host.appendChild(tabs);
    [['homeNav','[data-type="home"]','home'],['sitesNav','[data-action="sites"]'],['searchNav','[data-action="search"]'],['favoritesNav','[data-action="favorites"]'],['settingsOpen','[data-action="settings"]']].forEach(function(pair){
      var original=$(pair[0]),placeholder=tabs.querySelector(pair[1]);if(!original||!placeholder)return;var active=original.classList.contains('active');original.className='discovery-type'+(active?' active':'');if(pair[2])original.dataset.type=pair[2];else original.dataset.action=placeholder.dataset.action;if(pair[0]==='settingsOpen')original.textContent='设置';placeholder.parentNode.replaceChild(original,placeholder);
    });
    Array.prototype.forEach.call(tabs.querySelectorAll('button[data-type]'),function(button){var activate=button.onclick;button.onclick=function(event){var self=this,go=function(){if(viewMode==='home'&&typeof activate==='function')activate.call(self,event);};if(viewMode!=='home'){state.favorites=false;setMode('home');if(overlayHistory&&overlayHistory.afterSync)overlayHistory.afterSync(go);else go();}else go();};});
    var status=$('bridgeStatus');if(status){status.classList.add('local-nav-connection');tabs.appendChild(status);}
    if(header&&header.parentNode)header.parentNode.removeChild(header);
  }());
  if(window.GGCatalog&&window.GGProviders){
    catalog=window.GGCatalog.mount({container:$('catalogSection'),defaultSite:'wanou',request:publicRequest,onSearch:function(title){state.source='all';search(title);},onShare:shareRow,checkLinks:checkLinks,onShareDirect:playShareDirect});
  }
  renderSourceChecks();renderLetterPicker();updateKeyBadge();$('favoriteCount').textContent=String(favorites.length);renderProvider();setMode('home');probeBridge();
}());
