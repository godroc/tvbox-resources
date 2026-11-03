(function(root){'use strict';
  var BASE='http://192.168.50.252:8098/api/v1/search/tasks';
  function create(o){
    function search(query,current,onRows){
      var id='',cursor=0,rows=[],seen=Object.create(null),ended=false,timer=null,polling=false,started=Date.now(),resolveDone,rejectDone,limited=false;
      var result=new Promise(function(resolve,reject){resolveDone=resolve;rejectDone=reject;});
      function active(){return !ended&&(!current||current());}
      function call(url,opts){return Promise.resolve().then(function(){return o.call(url,opts);}).then(function(r){if(!r||!r.ok||Number(r.status)>=400){var e=new Error('本地搜索任务不可用');e.status=Number(r&&r.status)||0;throw e;}var body=r.body;if(typeof body==='string')body=JSON.parse(body);return body;});}
      function cancelRemote(){if(id)Promise.resolve(o.call(BASE+'/'+encodeURIComponent(id),{method:'DELETE',timeout:3,responseType:'json'})).catch(function(){});}
      function finish(error){if(ended)return;ended=true;clearTimeout(timer);clearInterval(watch);if(error){cancelRemote();if(rows.length)resolveDone({rows:rows,complete:false,error:'partial'});else rejectDone(error);}else resolveDone({rows:rows,complete:!limited,error:limited?'partial':null});}
      function cancel(){var e=new Error('搜索已取消');e.kind='cancelled';if(!ended){ended=true;clearTimeout(timer);clearInterval(watch);cancelRemote();rejectDone(e);}}
      function poll(){if(!active()){cancel();return;}if(polling)return;if(Date.now()-started>65000){finish(new Error('搜索任务超时'));return;}polling=true;
        call(BASE+'/'+encodeURIComponent(id)+'?cursor='+cursor+'&limit=20',{method:'GET',timeout:8,responseType:'json'}).then(function(body){polling=false;if(!active()){cancel();return;}limited=limited||!!body.timed_out||!!body.truncated||!!(body.progress&&body.progress.failed);var batch=[];(body.rows||[]).forEach(function(row){var key=String(row.id||row.url||'')+'|'+String(row.password||'');if(!key||seen[key]||rows.length>=3000)return;seen[key]=true;rows.push(row);batch.push(row);});var next=Number(body.cursor);if(!isFinite(next)||next<cursor)throw new Error('搜索游标无效');cursor=next;if(batch.length&&onRows)onRows(batch,{done:!!body.done&&!body.has_more,progress:body.progress,total:body.total});if(body.cancelled){cancel();return;}if(body.done&&!body.has_more){finish();return;}timer=setTimeout(poll,1000);}).catch(function(e){polling=false;finish(e);});
      }
      var watch=setInterval(function(){if(!active())cancel();},200);
      call(BASE,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kw:query}),timeout:8,responseType:'json'}).then(function(body){if(!body||!body.task_id)throw new Error('搜索任务缺少标识');id=String(body.task_id);if(!active()){cancelRemote();return;}poll();}).catch(finish);
      result.cancel=cancel;return result;
    }
    return {search:search};
  }
  root.GGTaskSearch={create:create};
})(typeof window!=='undefined'?window:globalThis);
