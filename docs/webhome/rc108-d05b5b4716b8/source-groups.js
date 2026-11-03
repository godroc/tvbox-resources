(function(root){'use strict';
  var ORDER=['tgSelf','panSelf','panPub','mipan','qupan','reference'];
  var NAMES={tgSelf:'TG · 自建',panSelf:'盘搜 · 自建',panPub:'盘搜 · 公共',mipan:'觅搜',qupan:'趣盘',reference:'资源 · 所选站点'};
  function mount(o){
    var doc=o.container.ownerDocument,states={},enabled=[],queue=[],running=0,generation=0,alive=true,firstOpened=false;
    var step=20,windowSize=60,visibleTimer=null,checkTimer=null,checkStarted=0,refreshTimer=null,refreshOptions=null,prepareTimers=[];
    function el(tag,cls,text){var n=doc.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;}
    function normalize(rows,key){var seen=Object.create(null),out=[];(rows||[]).forEach(function(row,index){if(!row)return;var copy={},id;Object.keys(row).forEach(function(k){copy[k]=row[k];});id=String(copy.id||copy.url||key+':'+index);if(seen[id])return;seen[id]=1;copy.id=id;copy.__groupKey=key;out.push(copy);});return out;}
    function staticFiltered(s,rows){try{return (o.filterMetadata||o.filter||function(a){return a;})(rows.slice(),s.key)||[];}catch(e){return [];}}
    function statusFiltered(s){try{return (o.filterStatus||o.filter||function(a){return a;})(s.metadata.slice(),s.key)||[];}catch(e){return [];}}
    function getStatusKey(row,key){try{return o.getStatusKey?String(o.getStatusKey(row,key)):String(row.status||row.validity||'');}catch(e){return '';}}
    function focusedRow(s){var a=doc.activeElement;return s.list.contains(a)&&a.dataset?a.dataset.id:null;}
    function nodeFor(s,id){var found=null;Array.prototype.some.call(s.list.children,function(n){if(n.dataset.id===id){found=n;return true;}return false;});return found;}
    function saveScroll(s){var out=[],n=s.section;while(n&&n!==doc){if(n.scrollTop||n.scrollHeight>n.clientHeight)out.push([n,n.scrollTop]);n=n.parentNode;}var rootScroll=doc.scrollingElement;if(rootScroll&&out.every(function(x){return x[0]!==rootScroll;}))out.push([rootScroll,rootScroll.scrollTop]);return out;}
    function restoreScroll(snapshot){snapshot.forEach(function(x){x[0].scrollTop=x[1];});}
    function keepNodeVisible(n){if(!n||!n.getBoundingClientRect)return;var r=n.getBoundingClientRect(),h=root.innerHeight||doc.documentElement.clientHeight||1000;if(r.top<0||r.bottom>h){try{n.scrollIntoView({block:'nearest',inline:'nearest'});}catch(e){try{n.scrollIntoView(false);}catch(ignore){}}}}
    function summary(s){
      var shown=Math.max(0,Math.min(s.limit,s.visible.length)-s.start);
      var summaryKey=[s.rows.length,s.filteredCount,shown,s.open,s.status,s.pending,s.buffered,s.preparing,s.preparationTimedOut,s.error].join('|');if(s.summaryKey===summaryKey)return;s.summaryKey=summaryKey;
      s.count.textContent='找到 '+s.rows.length+' · 筛后 '+s.filteredCount+' · 展开 '+shown+(s.buffered?' · 新结果 '+s.buffered:'');
      s.header.setAttribute('aria-expanded',String(s.open));s.header.dataset.state=s.status;
      s.hint.textContent=s.preparing?'首批状态准备中…':s.preparationTimedOut&&!s.filteredCount?'首批检测中，符合条件后自动显示':s.status==='partial'?(s.error||'继续搜索中，符合条件的结果自动显示'):s.status==='loading'?'搜索中…':s.status==='idle'?'按确定搜索':s.status==='error'?(s.error||'未完成，按确定重试'):s.filteredCount?'':'暂无符合条件的资源';
      s.apply.hidden=true;
      if(o.onState)o.onState(s.key,s.status,{pending:s.pending,found:s.rows.length,filtered:s.filteredCount});
    }
    function rowsVisible(){var out=[];enabled.forEach(function(k){var s=states[k];if(!s||!s.open)return;Array.prototype.forEach.call(s.list.querySelectorAll('[data-source-row]'),function(n){var r=n.getBoundingClientRect();if(r.bottom>0&&r.top<(root.innerHeight||1000)&&r.right>0&&r.left<(root.innerWidth||2000)&&n.__ggPanShare)out.push(n.__ggPanShare);});});return out;}
    function notifyVisible(){clearTimeout(visibleTimer);visibleTimer=setTimeout(function(){visibleTimer=null;if(alive&&o.onVisible)o.onVisible(rowsVisible());},100);}
    function updateStatusDom(s){if(!s)return;Array.prototype.forEach.call(s.list.querySelectorAll('[data-source-row]'),function(n){var row=n.__ggPanShare;if(!row)return;var key=getStatusKey(row,s.key);if(n.__ggStatusKey===key)return;n.__ggStatusKey=key;if(o.patchStatus)o.patchStatus(row,n,s.key);else if(root.GGResourceView)root.GGResourceView.update(n,root.GGCheckLedger);});}
    function render(s,preferFocus){
      var oldFocus=preferFocus||focusedRow(s),moreFocus=doc.activeElement===s.more,earlierFocus=doc.activeElement===s.earlier,updateFocus=doc.activeElement===s.apply;
      s.list.hidden=!s.open;s.more.hidden=!s.open||(s.limit>=s.visible.length&&!s.buffered);s.earlier.hidden=!s.open||s.start===0;
      if(!s.open){s.list.textContent='';summary(s);return;}
      var wanted=s.visible.slice(s.start,Math.min(s.limit,s.start+windowSize)),keep=Object.create(null),nodes={};
      Array.prototype.forEach.call(s.list.children,function(n){nodes[n.dataset.id]=n;});
      wanted.forEach(function(row,index){var n=nodes[row.id];if(!n){n=o.create(row,s.key);n.dataset.id=row.id;n.setAttribute('data-source-row','');n.__ggPanShare=row;}else n.__ggPanShare=row;keep[row.id]=1;var at=s.list.children[index];if(at!==n)s.list.insertBefore(n,at||null);});
      Array.prototype.slice.call(s.list.children).forEach(function(n){if(!keep[n.dataset.id])s.list.removeChild(n);});
      updateStatusDom(s);
      if(oldFocus){var target=nodeFor(s,oldFocus);if(target&&doc.activeElement!==target)target.focus();else if(!target&&s.focusHold===oldFocus){var holdNode=nodeFor(s,oldFocus);if(holdNode)holdNode.focus();}}
      else if(moreFocus||earlierFocus){var next=s.list.children[moreFocus?Math.max(0,wanted.length-step):0]||s.header;if(next)next.focus();}
      else if(updateFocus)s.apply.focus();
      summary(s);notifyVisible();
    }
    function applyStatus(s,opts){
      if(s.preparing){s.pending=true;summary(s);return;}
      opts=opts||{};var oldFocus=focusedRow(s),scroll=saveScroll(s);
      var next=statusFiltered(s),allCount=next.length,ids=Object.create(null);if(false){next=next.filter(function(r){return !!s.publishedIds[r.id];});}s.buffered=0;next.forEach(function(r){ids[r.id]=1;});
      s.filteredCount=allCount;if(s.incremental&&(!s.publishedIds||opts.publishNew)&&next.length){s.publishedIds=Object.create(null);next.forEach(function(r){s.publishedIds[r.id]=1;});s.buffered=0;}s.appliedStatusKeys=Object.create(null);next.forEach(function(r){s.appliedStatusKeys[r.id]=getStatusKey(r,s.key);});
      s.appliedSignature=next.map(function(r){return r.id+'\u0001'+getStatusKey(r,s.key);}).join('\u0000');
      if(oldFocus&&s.visible.some(function(r){return r.id===oldFocus;})&&!ids[oldFocus]){
        var heldIndex=-1,held=null;s.visible.forEach(function(r,i){if(r.id===oldFocus){heldIndex=i;held=r;}});
        if(held){next.splice(Math.min(heldIndex,next.length),0,held);ids[oldFocus]=1;s.focusHold=oldFocus;s.holdInvalid=true;}
      }else if(!oldFocus){s.focusHold=null;s.holdInvalid=false;}
      s.visible=next;if(s.incremental){s.limit=Math.max(s.limit,Math.min(s.visible.length,s.start+windowSize));}
      if(opts.resetWindow){s.start=0;s.limit=Math.min(step,s.visible.length);}
      else {
        var span=Math.max(step,Math.min(windowSize,s.limit-s.start||step));
        if(s.start>=s.visible.length){s.start=Math.max(0,s.visible.length-span);s.limit=s.visible.length;}
        else s.limit=Math.min(s.visible.length,Math.max(s.limit,s.start));if(s.visible.length&&s.limit<=s.start)s.limit=Math.min(s.visible.length,s.start+step);
        if(oldFocus){var focusIndex=-1;s.visible.forEach(function(r,i){if(r.id===oldFocus)focusIndex=i;});if(focusIndex>=0&&focusIndex<s.start){s.start=focusIndex;s.limit=Math.min(s.visible.length,s.start+span);}else if(focusIndex>=s.limit){s.start=Math.max(0,focusIndex-span+1);s.limit=Math.min(s.visible.length,s.start+span);}}
        if(s.limit-s.start>windowSize)s.limit=s.start+windowSize;
      }
      s.pending=false;if(opts.render!==false)render(s,oldFocus);else summary(s);
      if(oldFocus)keepNodeVisible(nodeFor(s,oldFocus));else restoreScroll(scroll);
    }
    function current(s,g){return alive&&g===generation&&states[s.key]===s;}
    function clearPrepareTimers(){prepareTimers.forEach(function(x){clearTimeout(x.timer);x.resolve('cancelled');});prepareTimers=[];}
    function prepare(s,g){
      if(!o.prepare)return Promise.resolve('ready');
      var deadline=Math.min(1200,Math.max(1,Number(o.prepareDeadlineMs)||1200)),entry,done=false;
      var timerPromise=new Promise(function(resolve){entry={timer:null,resolve:resolve};entry.timer=setTimeout(function(){if(done)return;done=true;prepareTimers=prepareTimers.filter(function(x){return x!==entry;});resolve('deadline');},deadline);prepareTimers.push(entry);});
      var first=s.metadata.slice(0,40),work;
      try{work=Promise.resolve(o.prepare(first,s.key,{deadlineMs:deadline})).then(function(){return 'ready';},function(){return 'ready';});}catch(e){work=Promise.resolve('ready');}
      return Promise.race([work,timerPromise]).then(function(result){if(done)return result;done=true;clearTimeout(entry.timer);prepareTimers=prepareTimers.filter(function(x){return x!==entry;});return current(s,g)?result:'cancelled';});
    }
    function finishRows(s,rows,g){
      if(!current(s,g))return Promise.resolve();
      s.rows=normalize(rows,s.key);if(o.onData)o.onData(s.key,s.rows,s.status,s.error);
      s.metadata=staticFiltered(s,s.rows);s.visible=[];s.filteredCount=0;s.pending=false;summary(s);
      s.preparing=s.resultStatus==='done'&&!!o.prepare;s.preparationTimedOut=false;summary(s);
      return (s.resultStatus==='done'?prepare(s,g):Promise.resolve('ready')).then(function(result){
        if(!current(s,g)||result==='cancelled')return;
        s.preparing=false;s.preparationTimedOut=result==='deadline';
        if(s.deferredRefresh){var deferred=s.deferredRefresh;s.deferredRefresh=null;if(deferred.metadata){s.metadata=staticFiltered(s,s.rows);if(o.onData)o.onData(s.key,s.rows,s.status,s.error);}}
        s.status=s.resultStatus||'done';summary(s);
        applyStatus(s,{resetWindow:true});
        if(!firstOpened&&s.visible.length){firstOpened=true;s.open=true;render(s);}
      });
    }
    function appendProgress(s,batch,g,info){
      if(info&&info.reset){s.rows=[];s.metadata=[];s.visible=[];s.publishedIds=null;s.initialPrepared=true;applyStatus(s,{resetWindow:true});return Promise.resolve();}
      if(!current(s,g)||!batch.length)return Promise.resolve();s.incremental=true;s.hadProgress=true;
      var existing=Object.create(null);s.rows.forEach(function(r){existing[r.id]=1;});var added=normalize(batch,s.key).filter(function(r){return !existing[r.id];});if(!added.length)return Promise.resolve();
      s.rows=s.rows.concat(added);s.metadata=s.metadata.concat(staticFiltered(s,added));if(o.onData)o.onData(s.key,s.rows,'partial',s.error);
      var first=!s.initialPrepared;if(first){s.preparing=true;summary(s);}
      var candidates=staticFiltered(s,added).slice(0,40),work=first?prepare(s,g):o.prepare?Promise.resolve(o.prepare(candidates,s.key,{deadlineMs:1200})).catch(function(){}):Promise.resolve();
      if(!first){s.status='partial';applyStatus(s);summary(s);return Promise.resolve();}
      return Promise.resolve(work).then(function(){if(!current(s,g))return;s.preparing=false;s.initialPrepared=true;s.status='partial';applyStatus(s,{resetWindow:true});if(!firstOpened&&s.visible.length){firstOpened=true;s.open=true;render(s);}summary(s);});
    }
    function pump(){if(!alive)return;while(running<4&&queue.length){(function(s,g){if(!current(s,g)||s.status!=='queued')return;running++;s.status='loading';s.error='';summary(s);
      var loadScope={active:true};s.loadScope=loadScope;s.progressChain=Promise.resolve();Promise.resolve().then(function(){return o.load(s.key,function(batch,info){if(s.loadScope!==loadScope||!loadScope.active)return;s.progressChain=s.progressChain.then(function(){if(s.loadScope===loadScope&&loadScope.active)return appendProgress(s,batch,g,info);});},loadScope);}).then(function(res){if(!current(s,g)||s.loadScope!==loadScope||!loadScope.active)return;var rows=Array.isArray(res)?res:(res&&res.rows)||[];if(s.hadProgress)return s.progressChain.then(function(){if(!current(s,g)||s.loadScope!==loadScope||!loadScope.active)return;s.status=res&&res.error?'partial':'done';s.resultStatus=s.status;s.error=res&&res.error?'部分来源未完成':'';summary(s);});s.resultStatus=res&&res.error?'error':'done';s.status='loading';s.error=res&&res.error||'';return finishRows(s,rows,g);},function(e){if(!current(s,g)||s.loadScope!==loadScope||!loadScope.active)return;s.resultStatus='error';s.status='loading';s.error=e&&e.kind==='unauthorized'?'设备密钥不可用，请检查设置':'暂不可用，按确定重试';return finishRows(s,[],g);}).then(function(){if(g!==generation)return;running=Math.max(0,running-1);pump();},function(){if(g!==generation)return;running=Math.max(0,running-1);pump();});})(queue.shift(),generation);}}
    function request(s){if(!alive||s.status==='loading'||s.status==='queued'||s.status==='done'||s.status==='partial')return;s.hadProgress=false;s.incremental=false;s.publishedIds=null;s.initialPrepared=false;s.rows=[];s.metadata=[];s.visible=[];s.buffered=0;s.start=s.limit=0;render(s);s.status='queued';s.error='';queue.push(s);summary(s);pump();}
    function build(key){var s={key:key,rows:[],metadata:[],visible:[],filteredCount:0,open:false,start:0,limit:0,status:'idle',error:'',pending:false,focusHold:null,holdInvalid:false};
      s.section=el('section','gg-source-group');s.section.dataset.sourceGroup=key;s.header=el('button','gg-source-header');s.header.type='button';s.label=el('strong','gg-source-label',NAMES[key]||key);s.count=el('span','gg-source-count');s.hint=el('small','gg-source-hint');s.header.appendChild(s.label);s.header.appendChild(s.count);s.header.appendChild(s.hint);s.header.onclick=function(){if(s.status==='idle'||s.status==='error'){s.open=true;render(s);request(s);return;}if(s.preparing){s.open=!s.open;render(s);return;}if(!s.open)applyStatus(s);s.open=!s.open;if(s.open&&s.visible.length)firstOpened=true;render(s);};
      s.apply=el('button','subbutton gg-source-apply','应用状态更新');s.apply.type='button';s.apply.setAttribute('data-apply-status','');s.apply.hidden=true;s.apply.onclick=function(){applyStatus(s);if(!firstOpened&&s.visible.length){firstOpened=true;s.open=true;render(s);}};
      s.earlier=el('button','subbutton gg-source-more','较早 20 条');s.more=el('button','subbutton gg-source-more','更多 20 条');s.more.type=s.earlier.type='button';s.earlier.type='button';s.earlier.hidden=s.more.hidden=true;s.earlier.onclick=function(){s.start=Math.max(0,s.start-step);s.limit=Math.min(s.visible.length,s.start+windowSize);render(s);};s.more.setAttribute('data-apply-more','');s.more.onclick=function(){applyStatus(s,{render:false,publishNew:true});s.limit=Math.min(s.visible.length,s.limit+step);if(s.limit-s.start>windowSize)s.start=s.limit-windowSize;render(s);};
      s.list=el('div','gg-source-list');s.list.hidden=true;s.list.addEventListener('keydown',function(e){if((e.key==='ArrowDown'||e.keyCode===40)&&doc.activeElement===s.list.lastElementChild&&s.start+s.list.children.length<s.visible.length){e.preventDefault();e.stopPropagation();var nextIndex=s.start+s.list.children.length;s.start=Math.max(0,nextIndex-windowSize+step);s.limit=Math.min(s.visible.length,s.start+windowSize);render(s);var next=s.visible[nextIndex];if(next){var n=nodeFor(s,next.id);if(n)n.focus();}}},true);var refresh=el('button','gg-source-refresh','');refresh.type='button';refresh.innerHTML='<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 7a9 9 0 0 0-15-2L2 8m0-5v5h5M4 17a9 9 0 0 0 15 2l3-3m0 5v-5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';refresh.setAttribute('aria-label','刷新'+(NAMES[key]||key));refresh.onclick=function(){if(s.status==='loading'||s.status==='queued')return;if(s.loadScope)s.loadScope.active=false;s.status='idle';s.open=true;request(s);};var heading=el('div','gg-source-heading');heading.appendChild(s.header);heading.appendChild(refresh);s.section.appendChild(heading);s.section.appendChild(s.apply);s.section.appendChild(s.earlier);s.section.appendChild(s.list);s.section.appendChild(s.more);o.container.appendChild(s.section);summary(s);return s;}
    function reset(keys){generation++;clearPrepareTimers();queue=[];running=0;clearTimeout(checkTimer);checkTimer=null;checkStarted=0;clearTimeout(refreshTimer);refreshTimer=null;refreshOptions=null;firstOpened=false;enabled=(keys||[]).filter(function(k,i,a){return ORDER.indexOf(k)>=0&&a.indexOf(k)===i;});o.container.textContent='';states={};enabled.forEach(function(k){states[k]=build(k);});enabled.slice(0,4).forEach(function(k){request(states[k]);});}
    function configure(keys){if(!alive)return;var next=(keys||[]).filter(function(k,i,a){return ORDER.indexOf(k)>=0&&a.indexOf(k)===i;});enabled.forEach(function(k){if(next.indexOf(k)<0){var old=states[k];if(old&&old.loadScope)old.loadScope.active=false;if(old&&old.section.parentNode)old.section.parentNode.removeChild(old.section);delete states[k];}});enabled=next;enabled.forEach(function(k){if(!states[k])states[k]=build(k);o.container.appendChild(states[k].section);});queue=queue.filter(function(s){return states[s.key]===s;});enabled.forEach(function(k){request(states[k]);});}
    function refresh(opts){if(!alive)return;opts=opts||{};refreshOptions=refreshOptions||{metadata:false};refreshOptions.metadata=refreshOptions.metadata||opts.metadata!==false;refreshOptions.reason=opts.reason||refreshOptions.reason||'explicit';if(refreshTimer)return;refreshTimer=setTimeout(function(){refreshTimer=null;var batch=refreshOptions;refreshOptions=null;enabled.forEach(function(k){var s=states[k];if(!s)return;if(s.preparing){s.deferredRefresh=batch;return;}var oldFocus=focusedRow(s);if(batch.metadata){s.metadata=staticFiltered(s,s.rows);if(o.onData)o.onData(s.key,s.rows,s.status,s.error);}s.pending=true;applyStatus(s,{publishNew:true,resetWindow:!!batch.resetWindow});var restored=nodeFor(s,oldFocus);if(restored&&doc.activeElement!==restored)restored.focus();});},0);}
    function scheduleChecks(){if(!alive)return;if(!checkStarted)checkStarted=Date.now();enabled.forEach(function(k){updateStatusDom(states[k]);});var elapsed=Date.now()-checkStarted;if(checkTimer&&elapsed>=500)return;var delay=Math.min(150,Math.max(0,500-elapsed));clearTimeout(checkTimer);checkTimer=setTimeout(function(){checkTimer=null;checkStarted=0;enabled.forEach(function(k){var s=states[k];if(!s)return;var next=statusFiltered(s),signature=next.map(function(r){return r.id+'\u0001'+getStatusKey(r,s.key);}).join('\u0000');s.filteredCount=next.length;applyStatus(s);if(!firstOpened&&s.visible.length){firstOpened=true;s.open=true;render(s);}summary(s);});if(o.onCounts)o.onCounts();},delay);}
    function onFocusChange(e){var id=e.target&&e.target.dataset&&e.target.dataset.id;enabled.forEach(function(k){var s=states[k];if(s&&s.focusHold&&s.focusHold!==id){s.focusHold=null;if(s.holdInvalid){s.holdInvalid=false;applyStatus(s);summary(s);}}});}
    function onScroll(){notifyVisible();}
    function onFilter(event){if(alive)refresh({metadata:!(event&&(event.ggMetadata===false||event.detail&&event.detail.metadata===false)),reason:event&&(event.ggReason||event.detail&&event.detail.reason)||'filter'});}
    root.addEventListener('scroll',onScroll,true);root.addEventListener('gg-check-updated',scheduleChecks);root.addEventListener('gg-search-check-update',scheduleChecks);root.addEventListener('gg-shared-filters-changed',onFilter);doc.addEventListener('focusin',onFocusChange,true);
    return {reset:reset,configure:configure,refresh:refresh,pause:function(){generation++;clearPrepareTimers();queue=[];running=0;clearTimeout(checkTimer);checkTimer=null;checkStarted=0;clearTimeout(refreshTimer);refreshTimer=null;enabled.forEach(function(k){var s=states[k];if(s&&s.loadScope)s.loadScope.active=false;if(s&&(s.status==='loading'||s.status==='queued'||s.status==='partial')){s.status='idle';s.preparing=false;s.resultStatus='';summary(s);}});},resume:function(){if(alive)notifyVisible();},updateStatus:function(){enabled.forEach(function(k){updateStatusDom(states[k]);});},recheck:function(){if(alive){var rows=rowsVisible();if(o.onRecheck)o.onRecheck(rows);else if(o.onVisible)o.onVisible(rows);}},request:function(k){if(states[k])request(states[k]);},offer:function(k,rows){var s=states[k];if(!s)return;s.resultStatus='done';s.status='loading';finishRows(s,rows,generation);},inspect:function(){return {generation:generation,running:running,queued:queue.length,groups:enabled.filter(function(k){return !!states[k];}).map(function(k){var s=states[k];return {key:k,status:s.status,open:s.open,found:s.rows.length,buffered:s.buffered||0,metadata:s.metadata.length,filtered:s.filteredCount,start:s.start,end:s.limit,dom:s.list.children.length,pending:s.pending,focusHold:s.focusHold};})};},destroy:function(){alive=false;generation++;clearPrepareTimers();queue=[];running=0;clearTimeout(visibleTimer);clearTimeout(checkTimer);clearTimeout(refreshTimer);root.removeEventListener('scroll',onScroll,true);root.removeEventListener('gg-check-updated',scheduleChecks);root.removeEventListener('gg-search-check-update',scheduleChecks);root.removeEventListener('gg-shared-filters-changed',onFilter);doc.removeEventListener('focusin',onFocusChange,true);enabled.forEach(function(k){var s=states[k];if(s.loadScope)s.loadScope.active=false;s.rows=[];s.metadata=[];s.visible=[];s.status='cancelled';s.preparing=false;s.filteredCount=0;s.start=s.limit=0;s.focusHold=null;s.appliedSignature='';s.appliedStatusKeys=Object.create(null);s.list.textContent='';});o.container.textContent='';}};
  }
  root.GGSourceGroups={mount:mount,order:ORDER,names:NAMES};
})(this);
