(function () {
  'use strict';
  var C=window.GGCore,doc=document,catalog=null,discovery=null,referenceSearch=null,viewMode='home',navigation=null,overlayHistory=null,deviceKnown=false,chromeRequest='';
  function $(id){return doc.getElementById(id);}
  function all(selector,root){return Array.prototype.slice.call((root||doc).querySelectorAll(selector));}
  function element(tag,className,text){var e=doc.createElement(tag);if(className)e.className=className;if(typeof text!=='undefined')e.textContent=text;return e;}
  function read(key,fallback){try{var v=localStorage.getItem('gg.webhome.'+key);return v===null?fallback:JSON.parse(v);}catch(e){return fallback;}}
  function write(key,value){try{localStorage.setItem('gg.webhome.'+key,JSON.stringify(value));return true;}catch(e){return false;}}
  function remove(key){try{localStorage.removeItem('gg.webhome.'+key);}catch(e){}}
  var defaults={diskOrder:['quark','tianyi','aliyun','baidu','uc','123','xunlei','mobile','115','guangya','pikpak'],sourceOrder:['pan','tg'],pageSize:24,grouped:true};
  var prefs=read('preferences.v1',defaults);if(!prefs||typeof prefs!=='object')prefs=defaults;
  prefs.diskOrder=Array.isArray(prefs.diskOrder)?prefs.diskOrder.filter(function(x){return !!C.disks[x];}):defaults.diskOrder.slice();
  prefs.sourceOrder=Array.isArray(prefs.sourceOrder)&&prefs.sourceOrder.join(',')==='tg,pan'?['tg','pan']:['pan','tg'];
  prefs.pageSize=[24,40,60].indexOf(Number(prefs.pageSize))>=0?Number(prefs.pageSize):24;prefs.grouped=prefs.grouped!==false;
  if(!Array.isArray(prefs.displayDisks))prefs.displayDisks=['quark'];else prefs.displayDisks=prefs.displayDisks.filter(function(x){return !!C.disks[x];});
  var credential=read('device-key.v1','');if(!C.validKey(credential))credential='';
  var recent=read('recent.v1',[]);if(!Array.isArray(recent))recent=[];recent=recent.filter(function(x){return typeof x==='string'&&x.length<=120;}).slice(0,8);
  var favorites=read('favorites.v1',[]);if(!Array.isArray(favorites))favorites=[];favorites=favorites.filter(function(x){return x&&C.safeShare(x.url)&&typeof x.id==='string'&&Array.isArray(x.sources)&&Array.isArray(x.tags);}).slice(0,300);
  var savedFilters=read('filters.v1',{}),cache={},cacheKeys=[],generation=0,focusRestore=null,toastTimer=null,selected=null,bridgeReady=false,pageOrder=null;
  var state={query:'',rows:[],source:'all',disk:'',page:1,grouped:prefs.grouped,favorites:false,active:{pan:'idle',tg:'idle'},errors:{},filter:{quality:'',sort:'relevance',since:'0',minSize:'0',exclude:'',keepUnknown:true}};
  ['quality','sort','since','minSize','exclude','keepUnknown'].forEach(function(k){if(typeof savedFilters[k]===typeof state.filter[k])state.filter[k]=savedFilters[k];});
  var providerNames={pan:'盘搜 · 自建',tg:'TG · 自建'},providerTexts={idle:'等待搜索',loading:'搜索中…',pending:'后台搜索中…',done:'搜索完成',partial:'部分结果',error:'请求失败',unauthorized:'密钥不可用',rate:'请求较频繁'};
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
  function applyChrome(fm,tv){var mode=tv?'tv-full':'edge';if(chromeRequest===mode)return;chromeRequest=mode;var ui=fm.ui||{};function legacy(){if(tv&&typeof ui.setToolbar==='function')return ui.setToolbar(false);}
    Promise.resolve().then(function(){if(typeof ui.setChrome==='function')return ui.setChrome({mode:mode,restoreAffordance:'none'});return legacy();}).catch(function(){try{Promise.resolve(legacy()).catch(function(){});}catch(e){}});
  }
  function probeBridge(){return waitSdk(5000).then(function(fm){showBridge(true);applyChrome(fm,doc.body.classList.contains('gg-tv'));if(!deviceKnown&&typeof fm.device==='function'){deviceKnown=true;Promise.resolve().then(function(){return fm.device();}).then(function(value){var device=decodeSdkBody(value);if(device&&device.type!==undefined){var tv=Number(device.type)===0;doc.body.classList.toggle('gg-tv',tv);if(navigation)navigation.setTV(tv);applyChrome(fm,tv);}},function(){deviceKnown=false;});}if(viewMode==='home'&&discovery)discovery.show();if(viewMode==='sites'&&catalog)catalog.loadDefault();},function(){showBridge(false);});}
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
  function setProvider(source,status,message){state.active[source]=status;if(message)state.errors[source]=message;else delete state.errors[source];renderProvider();}
  function runProvider(source,query,token,gen,attempt){
    if(gen!==generation)return;
    setProvider(source,attempt?'pending':'loading');
    request(source,query,token,gen).then(function(result){
      if(gen!==generation)return;
      if(result.pending){
        if(attempt>=3){setProvider(source,'error','后台搜索仍在进行，可稍后重试；另一来源结果已保留');return;}
        setProvider(source,'pending');setTimeout(function(){runProvider(source,query,token,gen,attempt+1);},Math.min(8000,2000*Math.pow(2,attempt)));return;
      }
      state.rows=C.merge(state.rows,result.rows);setProvider(source,result.complete?'done':'partial');
      cache[query]={time:Date.now(),rows:state.rows,active:{pan:state.active.pan,tg:state.active.tg}};
      if(cacheKeys.indexOf(query)<0)cacheKeys.push(query);while(cacheKeys.length>5)delete cache[cacheKeys.shift()];
      renderResults(false);
    },function(error){if(gen!==generation)return;setProvider(source,error.kind||'error',error.message==='stale'?'请求已取消':error.message);renderResults(false);});
  }
  function search(query,force){
    query=String(query||'').replace(/^\s+|\s+$/g,'');if(!query||query.length>120){toast('请输入 1～120 字的片名');return;}
    var scope=$('searchScope').value;if(scope==='native'){nativeSearch(query);return;}
    if(scope==='self'&&!C.validKey(credential)){openSettings();$('settingsError').textContent='请先输入这台设备的独立密钥，再搜索自建来源。';return;}
    generation++;pageOrder=null;var gen=generation;state.query=query;state.rows=[];state.disk='';state.page=1;state.grouped=prefs.grouped;state.favorites=false;state.errors={};state.active={pan:'idle',tg:'idle'};$('query').value=query;
    recent=[query].concat(recent.filter(function(x){return x!==query;})).slice(0,8);write('recent.v1',recent);renderRecent();setMode('search');
    $('referenceResults').hidden=scope==='self';if(referenceSearch){if(scope!=='self'){referenceSearch.show();referenceSearch.search(query);}else referenceSearch.hide();}
    renderResults(true);
    if(scope==='reference'){$('resultsSection').hidden=true;return;}
    if(!C.validKey(credential)){prefs.sourceOrder.forEach(function(s){setProvider(s,'unauthorized','未设置设备密钥；参考站点搜索正常进行');});return;}
    prefs.sourceOrder.forEach(function(source){runProvider(source,query,credential,gen,0);});
  }
  function setMode(mode){
    viewMode=mode;var home=mode==='home',sites=mode==='sites',landing=mode==='search'&&!state.query&&!state.favorites;
    $('hero').hidden=true;$('welcome').hidden=!landing;$('resultsSection').hidden=home||sites||landing;
    $('searchArea').hidden=home||sites;$('searchSidebar').hidden=home||sites;
    $('referenceResults').hidden=mode!=='search'||!state.query||$('searchScope').value==='self';
    $('discoverySection').hidden=!home;$('catalogSection').hidden=!sites;
    $('workspace').classList.toggle('catalog-mode',home||sites);
    if(catalog){if(sites){catalog.show();if(bridgeReady)catalog.loadDefault();}else catalog.hide();}
    if(discovery){if(home&&bridgeReady)discovery.show();else discovery.hide();}
    $('homeNav').classList.toggle('active',home);$('sitesNav').classList.toggle('active',sites);$('searchNav').classList.toggle('active',mode==='search');$('favoritesNav').classList.toggle('active',state.favorites);
    if(home||sites){generation++;state.query='';state.rows=[];state.favorites=false;$('query').value='';renderProvider();}
  }
  function renderRecent(){var box=$('recentSearches');box.textContent='';if(!recent.length){box.appendChild(element('span','','提示：输入完整片名可获得更准确的匹配'));return;}box.appendChild(element('span','','最近搜索'));recent.forEach(function(q){var b=element('button','',q);b.type='button';b.onclick=function(){search(q);};box.appendChild(b);});}
  function renderProvider(){
    var counts={pan:0,tg:0};state.rows.forEach(function(r){r.sources.forEach(function(s){if(s in counts)counts[s]++;});});
    $('countAll').textContent=String(state.rows.length);$('countPan').textContent=String(counts.pan);$('countTg').textContent=String(counts.tg);
    var box=$('providerMessages'),focused=doc.activeElement&&doc.activeElement.dataset&&doc.activeElement.dataset.provider;
    box.textContent='';prefs.sourceOrder.forEach(function(s){
      $(''+s+'Status').textContent=providerTexts[state.active[s]]||'请求失败';
      if(state.favorites)return;
      var status=state.active[s],b=element('div','provider-message '+(status==='loading'||status==='pending'?'loading':state.errors[s]?'error':''));
      b.textContent=providerNames[s]+' · '+(state.errors[s]||providerTexts[status])+(status==='done'||status==='partial'?' · '+counts[s]+' 条':'');box.appendChild(b);
    });
    $('retryButton').hidden=!Object.keys(state.errors).length||state.favorites;
    all('.source').forEach(function(b){b.classList.toggle('active',b.dataset.source===state.source);});$('providerFilter').value=state.source;
  }
  function filtered(withDisk){
    var f=state.filter,rows=C.filter(state.rows,{query:state.query,source:state.source,disk:withDisk?state.disk:'',quality:f.quality,sort:f.sort,since:Number(f.since)>0?Date.now()-Number(f.since)*86400000:0,minSize:Number(f.minSize),exclude:f.exclude,keepUnknown:f.keepUnknown});if(pageOrder){rows.forEach(function(row){if(pageOrder.indexOf(row.id)<0)pageOrder.push(row.id);});rows.sort(function(a,b){return pageOrder.indexOf(a.id)-pageOrder.indexOf(b.id);});}return rows;
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
  function renderDiskFilters(groups){
    var items=[{id:'all',type:'',name:'全部网盘',count:0}].concat(groups.map(function(g){return {id:g.type,type:g.type,name:g.name,count:g.count};}));
    reconcile($('diskFilters'),items,function(item){var b=element('button','disk-chip');b.dataset.id=item.id;b.onclick=function(){state.disk=item.type;state.page=1;state.grouped=false;renderResults(true);};return update(b,item);},update);
    function update(b,item){b.classList.toggle('active',state.disk===item.type);b.textContent=item.name+(item.type?' '+item.count:'');return b;}
  }
  function renderResults(changedView){
    renderProvider();var rows=filtered(false),groups=C.groups(rows,prefs.diskOrder);renderDiskFilters(groups);
    $('resultTitle').textContent=state.favorites?'我的收藏':(state.query?'“'+state.query+'”':'搜索结果');$('resultEyebrow').textContent=state.favorites?'YOUR COLLECTION':'SEARCH RESULTS';
    var displayGroups=state.grouped&&!state.disk&&!state.favorites,result=filtered(true),paged=C.page(result,state.page,prefs.pageSize);state.page=paged.page;
    $('resultSummary').textContent=(state.disk?(C.disks[state.disk]||state.disk)+' · ':'')+result.length+' 条候选'+(state.rows.length!==result.length?' / 共 '+state.rows.length+' 条':'')+(displayGroups?' · '+groups.length+' 个网盘':'');
    $('groupGrid').hidden=!displayGroups;$('resourceGrid').hidden=displayGroups;$('groupView').hidden=displayGroups||state.favorites;
    $('pagination').hidden=displayGroups||!paged.total;$('pageInfo').textContent=state.page+' / '+paged.totalPages+' 页';$('previousPage').disabled=state.page<=1;$('nextPage').disabled=state.page>=paged.totalPages;
    if(displayGroups)reconcile($('groupGrid'),groups.map(function(g){return {id:g.type,type:g.type,name:g.name,count:g.count};}),makeGroup,updateGroup);
    else reconcile($('resourceGrid'),paged.items,makeResource,updateResource);
    var loading=state.active.pan==='loading'||state.active.pan==='pending'||state.active.tg==='loading'||state.active.tg==='pending';
    $('emptyState').hidden=!!result.length;
    $('emptyTitle').textContent=loading?'正在寻找资源…':state.favorites?'还没有收藏':'没有匹配的候选';
    $('emptyText').textContent=loading?'先返回的来源会先显示，不必等待全部结束。':Object.keys(state.errors).length?'检查来源提示，或单独重试失败来源。':'试试完整片名，或放宽网盘、时间和格式筛选。';
    // Search updates intentionally leave scrolling unchanged; only explicit paging moves it.
    $('favoriteCount').textContent=String(favorites.length);
  }
  function makeGroup(item){var b=element('button','group-card');b.dataset.id=item.id;b.appendChild(element('span','disk-symbol',item.name.slice(0,1)));b.appendChild(element('strong','',item.name));b.appendChild(element('small',''));b.appendChild(element('em','','↗'));b.onclick=function(){state.disk=item.type;state.grouped=false;state.page=1;renderResults(true);var first=$('resourceGrid').firstElementChild;if(first)first.focus();};return updateGroup(b,item);}
  function updateGroup(node,item){node.querySelector('small').textContent=item.count+' 条候选 · 点击查看';return node;}
  function makeResource(row){
    var b=element('button','resource-card');b.dataset.id=row.id;
    var poster=element('div','poster'),letters=element('span','poster-letters',titleLetters(row.title));poster.appendChild(letters);
    if(row.image){var img=element('img');img.src=row.image;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=function(){if(img.parentNode)img.parentNode.removeChild(img);};poster.appendChild(img);}
    poster.appendChild(element('span','poster-disk',C.disks[row.type]||row.type));poster.appendChild(element('span','poster-source'));
    var info=element('div','card-info');info.appendChild(element('div','card-title',row.title));var meta=element('div','card-meta');meta.appendChild(element('span','card-date'));meta.appendChild(element('span','card-size'));info.appendChild(meta);info.appendChild(element('div','card-tags'));b.appendChild(poster);b.appendChild(info);
    b.onclick=function(){var found=state.rows.filter(function(x){return x.id===b.dataset.id;})[0];if(found)openDetail(found);};return updateResource(b,row);
  }
  function updateResource(node,row){node.querySelector('.poster-source').textContent=row.sources.map(function(x){return x==='tg'?'TGSEARCH':'PANSOU';}).join(' + ');node.querySelector('.card-date').textContent=formatDate(row.date);node.querySelector('.card-size').textContent=formatSize(row.size);node.querySelector('.card-tags').textContent=row.tags.length?row.tags.join(' · ')+' 标注':'';return node;}
  function openModal(id){focusRestore=doc.activeElement;$(id).hidden=false;doc.body.style.overflow='hidden';var focus=$(id).querySelector('input,button,select');if(focus)focus.focus();}
  function closeModal(id){$(id).hidden=true;doc.body.style.overflow='';if(id==='settingsModal'){$('deviceKey').value='';$('exportText').hidden=true;}$('playButton').disabled=false;if(focusRestore&&doc.documentElement.contains(focusRestore))focusRestore.focus();}
  function renderRefSiteSettings(){
    var box=$('refSiteSettings');if(!box||!window.GGProviders)return;
    var defs=window.GGProviders.definitions||[],keys=defs.map(function(d){return d.key;}),stored=null;
    try{ stored=JSON.parse(localStorage.getItem('gg-reference-search-sites-v1')||'null'); }catch(e){ stored=null; }
    if(!Array.isArray(stored))stored=['wanou','muou','huajuan','duoduo'].filter(function(k){return keys.indexOf(k)>=0;});
    stored=stored.filter(function(k){return keys.indexOf(k)>=0;});
    function persist(){ var sel=[]; Array.prototype.forEach.call(box.querySelectorAll('input:checked'),function(x){sel.push(x.value);}); try{localStorage.setItem('gg-reference-search-sites-v1',JSON.stringify(sel));}catch(e){} }
    box.textContent='';
    defs.forEach(function(d){
      var label=element('label','ref-site-option'),check=doc.createElement('input');
      check.type='checkbox';check.value=d.key;check.checked=stored.indexOf(d.key)>=0;check.onchange=persist;
      label.appendChild(check);label.appendChild(doc.createTextNode(d.name));box.appendChild(label);
    });
    var actions=element('div','ref-site-actions');
    var allBtn=element('button','subbutton','全选');allBtn.type='button';allBtn.onclick=function(){ try{localStorage.setItem('gg-reference-search-sites-v1',JSON.stringify(keys));}catch(e){} renderRefSiteSettings(); };
    var noneBtn=element('button','subbutton','清空');noneBtn.type='button';noneBtn.onclick=function(){ try{localStorage.setItem('gg-reference-search-sites-v1',JSON.stringify([]));}catch(e){} renderRefSiteSettings(); };
    actions.appendChild(allBtn);actions.appendChild(noneBtn);actions.appendChild(element('small','','更改立即保存；下次打开影片详情时生效'));
    box.appendChild(actions);
  }
  var settingsSourceOrder='pan,tg',settingsPageSize=24;
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
    $('deviceKey').value=credential;$('rememberKey').checked=!!read('device-key.v1','');$('diskOrder').value=prefs.diskOrder.map(function(d){return C.disks[d]||d;}).join(',');settingsSourceOrder=prefs.sourceOrder.join(',');settingsPageSize=prefs.pageSize;renderSettingsOptions();$('startGrouped').checked=prefs.grouped;$('settingsError').textContent='';renderRefSiteSettings();renderDisplayDisks();openModal('settingsModal');
  }
  function updateKeyBadge(){$('keyBadge').textContent=credential?'设备密钥已设置 · 本机':'设备密钥未设置';}
  function saveSettings(event){
    event.preventDefault();var key=$('deviceKey').value.replace(/^\s+|\s+$/g,'');if(key&&!C.validKey(key)){$('settingsError').textContent='密钥格式不正确，应为 43 位字母、数字、下划线或短横线。';return;}
    var order=[],words=$('diskOrder').value.split(/[,，、\s]+/),names=Object.keys(C.disks);
    words.forEach(function(word){var d=C.disk(word);if(!C.disks[d])names.forEach(function(k){if(C.disks[k]===word)d=k;});if(C.disks[d]&&order.indexOf(d)<0)order.push(d);});
    if(!order.length){$('settingsError').textContent='请至少填写一个有效网盘名称。';return;}
    var changed=key!==credential;credential=key;prefs={diskOrder:order,sourceOrder:settingsSourceOrder.split(','),pageSize:settingsPageSize,grouped:$('startGrouped').checked,displayDisks:prefs.displayDisks};
    var stored=write('preferences.v1',prefs);if($('rememberKey').checked&&key)stored=write('device-key.v1',key)&&stored;else remove('device-key.v1');
    if(changed){generation++;cache={};cacheKeys=[];state.rows=[];state.active={pan:'idle',tg:'idle'};state.errors={};}
    applySourceOrder();updateKeyBadge();closeModal('settingsModal');toast(stored?'设置已保存':'本次设置可用，但当前环境无法持久保存');
    if(changed&&state.query&&key)search(state.query,true);else if(state.query||state.favorites)renderResults(true);
  }
  function openDetail(row){selected=row;$('detailTitle').textContent=row.title;$('detailDisk').textContent=(C.disks[row.type]||row.type)+' / '+row.sources.map(function(s){return providerNames[s]||'参考站点';}).join(' + ');$('detailMeta').textContent=formatDate(row.date)+' · '+formatSize(row.size)+(row.tags.length?' · '+row.tags.join(' · ')+'（来源标注）':'');$('detailPoster').textContent=titleLetters(row.title);if(row.image){var cover=element('img');cover.src=imageSource(row.image);cover.alt='';$('detailPoster').appendChild(cover);}$('detailLink').textContent=new URL(row.url).hostname+(row.password?' · 已携带提取码':'');
    var previous=$('extractionCodes');if(previous)previous.parentNode.removeChild(previous);
    if(row.passwords&&row.passwords.length>1){var label=element('label','field','不同来源提供了多个提取码'),select=element('select');label.id='extractionCodes';select.setAttribute('aria-label','选择提取码');row.passwords.forEach(function(code){var option=element('option','',code);option.value=code;select.appendChild(option);});select.value=row.password;select.onchange=function(){selected.password=this.value;};label.appendChild(select);$('detailLink').parentNode.insertBefore(label,$('playError'));}
    $('playError').textContent='';updateFavoriteButton();openModal('detailModal');}
  function updateFavoriteButton(){$('favoriteButton').textContent=selected&&favorites.some(function(r){return r.id===selected.id;})?'取消收藏':'加入收藏';}
  function play(){
    if(!selected)return;var row=selected;$('playButton').disabled=true;$('playError').textContent='';
    waitSdk().then(function(fm){
      if(fm.pan&&typeof fm.pan.play==='function'){var parsed=new URL(row.url);if(row.password&&parsed.searchParams.has('pwd'))parsed.searchParams.set('pwd',row.password);if(row.password&&parsed.searchParams.has('password'))parsed.searchParams.set('password',row.password);return fm.pan.play({type:row.type,url:parsed.href,password:row.password,title:row.title});}
      if(typeof fm.play==='function'){var url=row.url;if(row.password&&!/[?&](?:pwd|password)=/.test(url))url+=(url.indexOf('?')>=0?'&':'?')+'pwd='+encodeURIComponent(row.password);return fm.play('push://'+url,row.title);}
      throw new Error('此客户端没有可用的原生播放入口，请使用保留的原生自建站点。');
    }).then(function(){toast('已交给播放器；后续解析由原插件处理');$('playButton').disabled=false;},function(){$('playError').textContent='原生播放调用未完成。请检查客户端支持与原配置中心授权，再重试。';$('playButton').disabled=false;});
  }
  function playDirect(row){
    if(!row || !row.url){toast('此资源没有可用的播放地址');return;}
    if(row.passwords&&row.passwords.length>1){openDetail(row);return;}
    waitSdk().then(function(fm){
      if(fm.pan&&typeof fm.pan.play==='function')return fm.pan.play({type:row.type,url:row.url,password:row.password||'',title:row.title});
      if(typeof fm.play==='function'){var url=row.url;if(row.password&&!/[?&](?:pwd|password)=/.test(url))url+=(url.indexOf('?')>=0?'&':'?')+'pwd='+encodeURIComponent(row.password);return fm.play('push://'+url,row.title);}
      throw new Error('当前客户端不支持此播放入口');
    }).then(function(){toast('已交给播放器解析');},function(){toast('播放调用失败，请检查客户端和网盘授权');});
  }
  function playShareDirect(row,source){var data={data:{merged_by_type:{}}};data.data.merged_by_type[row.type||'other']=[row];var normalized=C.normalize(data,'catalog');if(normalized.length)playDirect(normalized[0]);else toast('此资源类型暂不支持直接播放');}
  function showFavorites(){generation++;state.favorites=true;state.rows=favorites.slice();state.query='';state.disk='';state.page=1;state.grouped=false;state.errors={};setMode('favorites');renderResults(true);}
  function changeFilters(){pageOrder=null;['quality','sort','since','minSize','exclude'].forEach(function(k){state.filter[k]=$(k).value;});state.filter.keepUnknown=$('keepUnknown').checked;write('filters.v1',state.filter);state.page=1;renderResults(true);}
  function closestButton(target){while(target&&target!==doc.body){if(target.tagName==='BUTTON')return target;target=target.parentElement;}return null;}
  function visibleFocusable(root){return all('button,input,select,textarea,[tabindex="0"]',root).filter(function(e){return !e.disabled&&e.offsetWidth>0&&e.offsetHeight>0;});}
  function keyNavigation(event){
    var modal=!$('settingsModal').hidden?$('settingsModal'):!$('detailModal').hidden?$('detailModal'):doc.querySelector('.ref-dialog:not([hidden]),.discovery-modal:not([hidden])'),key=event.key||({19:'ArrowUp',20:'ArrowDown',21:'ArrowLeft',22:'ArrowRight',23:'Enter',4:'Escape'}[event.keyCode]),current=doc.activeElement;
    if(key==='Escape'||key==='BrowserBack'||key==='GoBack'){
      if(modal){if(modal.id)closeModal(modal.id);event.preventDefault();return;}
      if(state.disk){state.disk='';state.grouped=true;state.page=1;renderResults(true);var group=$('groupGrid').firstElementChild;if(group)group.focus();event.preventDefault();return;}
      if(state.query||state.favorites){state.favorites=false;setMode('home');$('query').focus();event.preventDefault();return;}return;
    }
    if(key==='Tab'&&modal){var fs=visibleFocusable(modal),at=fs.indexOf(current);if(event.shiftKey&&at<=0){fs[fs.length-1].focus();event.preventDefault();}else if(!event.shiftKey&&at===fs.length-1){fs[0].focus();event.preventDefault();}return;}
    if(!/^Arrow/.test(key))return;
    if(current&&/^(INPUT|SELECT|TEXTAREA)$/.test(current.tagName))return;
    var nodes=visibleFocusable(modal||doc),best=null,bestScore=Infinity,rect=current&&current.getBoundingClientRect();if(!rect)return;
    var x=rect.left+rect.width/2,y=rect.top+rect.height/2;
    nodes.forEach(function(node){if(node===current)return;var r=node.getBoundingClientRect(),dx=r.left+r.width/2-x,dy=r.top+r.height/2-y,along,cross;
      if(key==='ArrowLeft'){along=-dx;cross=Math.abs(dy);}else if(key==='ArrowRight'){along=dx;cross=Math.abs(dy);}else if(key==='ArrowUp'){along=-dy;cross=Math.abs(dx);}else{along=dy;cross=Math.abs(dx);}
      if(along<=3)return;var s=along+cross*2.8;if(s<bestScore){best=node;bestScore=s;}
    });if(best){best.focus();try{best.scrollIntoView({block:'nearest',inline:'nearest'});}catch(e){best.scrollIntoView(false);}event.preventDefault();}
  }
  $('searchForm').onsubmit=function(e){e.preventDefault();search($('query').value);};$('settingsForm').onsubmit=saveSettings;
  $('settingsOpen').onclick=$('welcomeSettings').onclick=openSettings;$('brand').onclick=$('homeNav').onclick=function(){state.favorites=false;setMode('home');if(discovery)discovery.home();};$('favoritesNav').onclick=$('mobileFavorites').onclick=showFavorites;
  $('searchNav').onclick=function(){state.favorites=false;setMode('search');$('query').focus();};
  $('sitesNav').onclick=function(){state.favorites=false;setMode('sites');};
  $('nativeSearchButton').onclick=function(){nativeSearch($('query').value);};
  $('bridgeStatus').onclick=function(){probeBridge().then(function(){toast(bridgeReady?'播放器接口已连接':'尚未连接，请在支持 WebHome 的 App 中打开');});};
  all('[data-close]').forEach(function(b){b.onclick=function(){closeModal(b.dataset.close);};});
  all('.modal').forEach(function(m){m.onclick=function(e){if(e.target===m)closeModal(m.id);};});
  all('[data-suggest]').forEach(function(b){b.onclick=function(){search(b.dataset.suggest);};});
  all('.source').forEach(function(b){b.onclick=function(){pageOrder=null;state.source=b.dataset.source;state.page=1;state.disk='';if(state.query||state.favorites)renderResults(true);else renderProvider();};});
  $('providerFilter').onchange=function(){pageOrder=null;state.source=this.value;state.page=1;state.disk='';renderResults(true);};
  function applySourceOrder(){var side=doc.querySelector('.sidebar'),before=side.querySelector('.side-note');prefs.sourceOrder.forEach(function(s){side.insertBefore(side.querySelector('[data-source="'+s+'"]'),before);});}
  ['quality','sort','since','minSize','keepUnknown'].forEach(function(k){$(k).onchange=changeFilters;$(k)[k==='keepUnknown'?'checked':'value']=state.filter[k];});
  $('exclude').value=state.filter.exclude;var filterTimer=null;$('exclude').oninput=function(){clearTimeout(filterTimer);filterTimer=setTimeout(changeFilters,200);};
  $('resetFilters').onclick=function(){state.filter={quality:'',sort:'relevance',since:'0',minSize:'0',exclude:'',keepUnknown:true};['quality','sort','since','minSize','exclude'].forEach(function(k){$(k).value=state.filter[k];});$('keepUnknown').checked=true;state.disk='';changeFilters();};
  $('groupView').onclick=function(){pageOrder=null;state.grouped=true;state.disk='';state.page=1;renderResults(true);};
  function movePage(step){if(!pageOrder)pageOrder=filtered(true).map(function(row){return row.id;});state.page+=step;renderResults(true);var first=$('resourceGrid').firstElementChild;if(first){first.focus();first.scrollIntoView({block:'start'});}}
  $('previousPage').onclick=function(){movePage(-1);};$('nextPage').onclick=function(){movePage(1);};
  $('retryButton').onclick=function(){if(!state.query||!credential)return;Object.keys(state.errors).forEach(function(s){runProvider(s,state.query,credential,generation,0);});};
  $('playButton').onclick=play;$('favoriteButton').onclick=function(){if(!selected)return;var found=favorites.some(function(r){return r.id===selected.id;});if(found)favorites=favorites.filter(function(r){return r.id!==selected.id;});else favorites.unshift(selected);favorites=favorites.slice(0,300);write('favorites.v1',favorites);$('favoriteCount').textContent=String(favorites.length);updateFavoriteButton();if(state.favorites){state.rows=favorites.slice();renderResults(false);}toast(found?'已取消收藏':'已加入本机收藏');};
  $('copyButton').onclick=function(){if(!selected)return;var text=selected.url+(selected.password?' 提取码：'+selected.password:'');if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(function(){toast('分享链接已复制');},function(){toast('当前客户端不支持复制，请从原生详情分享');});else toast('当前客户端不支持复制，请从原生详情分享');};
  $('clearKey').onclick=function(){credential='';remove('device-key.v1');$('deviceKey').value='';generation++;cache={};cacheKeys=[];state.rows=[];state.errors={};state.active={pan:'idle',tg:'idle'};updateKeyBadge();if(state.query)renderResults(true);toast('本机密钥和搜索缓存已清除，网盘授权未改');};
  $('exportSettings').onclick=function(){var clean={schema:1,preferences:prefs,filters:state.filter};$('exportText').value=JSON.stringify(clean,null,2);$('exportText').hidden=false;toast('仅导出偏好，不含密钥、收藏或分享链接');};
  if(window.GGNavigation)navigation=window.GGNavigation.mount({document:doc,isTV:false,onBack:function(){if(state.disk){state.disk='';state.grouped=true;state.page=1;renderResults(true);}else if(viewMode!=='home'){state.favorites=false;setMode('home');$('homeNav').focus();}}});else doc.addEventListener('keydown',keyNavigation);
  if(window.GGOverlayHistory)overlayHistory=window.GGOverlayHistory.mount({document:doc});
  window.addEventListener('fmsdk',function(){showBridge(!!(window.fm&&window.fm.req));});window.addEventListener('fmresume',function(){probeBridge();});
  window.addEventListener('pageshow',function(){probeBridge();});
  window.GGApp={version:'RC35',inspect:function(){return {query:state.query,count:state.rows.length,source:state.source,disk:state.disk,page:state.page,providers:state.active,keyPresent:!!credential,mode:viewMode,chromeRequest:chromeRequest,navigation:navigation&&navigation.inspect()};}};
  function publicRequest(url,options){
    return schedule(function(){return waitSdk().then(function(fm){var opts=options||{},headers={};Object.keys(opts.headers||{}).forEach(function(k){headers[k]=opts.headers[k];});headers['User-Agent']='Mozilla/5.0';return fm.req(url,{method:'GET',headers:headers,responseType:'text',timeout:Math.max(1,Math.min(12,opts.timeout||12))});}).then(function(response){if(!response||!response.ok)throw new Error('站点请求失败（'+(response&&response.status||'未知')+'）');return response;});},/^https:\/\/(?:movie|m)\.douban\.com\//.test(url));
  }
  function imageSource(url){
    if(!/^https?:\/\//i.test(url||''))return '';var fm=window.fm,headers={};if(/\.doubanio\.com\//i.test(url))headers.Referer='https://movie.douban.com/';
    if(fm&&typeof fm.res==='function'){try{var local=fm.res(url,{headers:headers});if(typeof local==='string'&&local)return local;}catch(e){}}
    return url;
  }
  function nativeSearch(title,row){title=String(title||'').trim();if(!title){toast('请先输入片名');$('query').focus();return;}waitSdk().then(function(fm){if(typeof fm.search!=='function')throw new Error('当前客户端不支持网页跳转原生搜索；请回到原生搜索输入片名');return fm.search(title,{direct:true,pic:row&&row.image||'',wallPic:row&&row.backdrop||''});}).catch(function(e){toast(e.message||'原生搜索调用失败');});}
  function shareRow(row,source){var data={data:{merged_by_type:{}}};data.data.merged_by_type[row.type||'other']=[row];var normalized=C.normalize(data,'catalog');var origin=window.GGProviders.definitions.filter(function(d){return d.key===(source&&source.siteKey);})[0];providerNames.catalog=origin?origin.name:'参考站点';if(normalized.length){normalized[0].image=row.image||source&&source.image||'';openDetail(normalized[0]);}else toast('此资源类型暂不支持直接交给播放器');}
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
      return C.parseCheckResults(body,payload);
    }).catch(function(){ return items.map(function(){return 'unknown';}); });
  }
  function selfLookup(title,onPartial){
    if(!C.validKey(credential))return Promise.resolve({rows:[],message:'尚未设置设备密钥；参考站点仍可找源。在右上角设置中填写即可使用盘搜／TG。'});
    var g=generation,rows=[],states={pan:'搜索中',tg:'搜索中'},errors={};
    function snapshot(){var messages=[];prefs.sourceOrder.forEach(function(s){if(errors[s])messages.push(providerNames[s]+'：'+errors[s]);else if(states[s]!=='完成')messages.push(providerNames[s]+'：'+states[s]);});return {rows:C.filter(rows,{query:title,sort:'relevance'}),message:messages.join('；')};}
    function emit(){if(typeof onPartial==='function'&&g===generation)onPartial(snapshot());}
    function fetchSource(s,attempt){return request(s,title,credential,g).then(function(r){if(!r.pending){rows=C.merge(rows,r.rows||[]);states[s]='完成';emit();return;}if(attempt>=3){states[s]='结束';errors[s]='后台仍在搜索，可在搜索页重试';emit();return;}states[s]='后台搜索中';emit();return new Promise(function(resolve){setTimeout(resolve,Math.min(8000,2000*Math.pow(2,attempt)));}).then(function(){return fetchSource(s,attempt+1);});},function(e){states[s]='结束';errors[s]=e.message||'请求失败';emit();});}
    return Promise.all(prefs.sourceOrder.map(function(s){return fetchSource(s,0);})).then(snapshot);
  }
  if(window.GGReferenceSearch)referenceSearch=window.GGReferenceSearch.mount({container:$('referenceResults'),providers:window.GGProviders,request:publicRequest,imageSource:imageSource,hideForm:true,onShare:shareRow,onNativeSearch:nativeSearch});
  function loadHistory(){return waitSdk().then(function(fm){if(typeof fm.history!=='function')return [];return fm.history();}).then(function(value){var history=decodeSdkBody(value);if(!Array.isArray(history))return [];var hidden=read('hidden-history-v1',[]);if(!Array.isArray(hidden))hidden=[];return history.filter(function(h){return hidden.indexOf(h.key)<0;}).slice(0,20).map(function(h){return {id:'history:'+h.key,title:h.vodName||'最近观看',image:/^https?:\/\//i.test(h.vodPic||'')?h.vodPic:'',history:h};});},function(){return [];});}
  function openHistory(row){var h=row.history||{},parts=String(h.key||'').split('@@@');if(parts.length<2){nativeSearch(row.title,row);return;}waitSdk().then(function(fm){if(typeof fm.vod!=='function')throw new Error('当前客户端请从原生历史入口继续观看');return fm.vod(parts[0],parts[1],row.title,row.image||'');}).catch(function(e){toast(e.message||'历史入口调用失败');});}
  function quickAction(action){if(action==='search'){$('searchNav').click();return;}if(action==='settings'){openSettings();return;}if(action==='push'){openModal('pushModal');return;}var name=action==='live'?'openLive':action==='native'?'openVod':'openKeep';waitSdk().then(function(fm){if(typeof fm[name]!=='function')throw new Error('当前客户端请从原生菜单打开此功能');return fm[name]();}).catch(function(e){toast(e.message);});}
  $('pushForm').onsubmit=function(e){e.preventDefault();var url=$('pushURL').value.trim();if(!/^(https?:\/\/|magnet:\?xt=urn:btih:|ed2k:\/\/|thunder:\/\/)/i.test(url)){$('pushError').textContent='请输入网盘分享、视频网址或支持的磁力链接';return;}$('pushError').textContent='';waitSdk().then(function(fm){if(!fm.pan||typeof fm.pan.play!=='function')throw new Error('此客户端请使用原生推送入口');return fm.pan.play({url:url,title:'网页推送'});}).then(function(){closeModal('pushModal');toast('已交给播放器解析');},function(error){$('pushError').textContent=error.message;});};
  if(window.GGDiscovery)discovery=window.GGDiscovery.mount({container:$('discoverySection'),request:publicRequest,referenceRequest:publicRequest,imageSource:imageSource,onNativeSearch:nativeSearch,onShare:playShareDirect,onSelfRow:playDirect,searchSelf:selfLookup,checkLinks:checkLinks,loadHistory:loadHistory,onHistory:openHistory,onQuickAction:quickAction,getDiskOrder:function(){return prefs.diskOrder.slice();},getDisplayDisks:function(){return prefs.displayDisks.slice();}});
  if(window.GGCatalog&&window.GGProviders){
    catalog=window.GGCatalog.mount({container:$('catalogSection'),defaultSite:'wanou',request:publicRequest,onSearch:function(title){state.source='all';search(title);},onShare:shareRow,checkLinks:checkLinks,onShareDirect:playShareDirect});
  }
  applySourceOrder();renderRecent();updateKeyBadge();$('favoriteCount').textContent=String(favorites.length);renderProvider();setMode('home');probeBridge();
}());
