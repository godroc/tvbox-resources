(function(root){'use strict';
  var LOCAL='http://192.168.50.252:8098/api/search';
  function create(options){
    function cancelled(current){if(current&&!current()){var e=new Error('搜索已取消');e.kind='cancelled';throw e;}}
    function request(source,query,token,current){
      function remote(){cancelled(current);if(!options.validKey(token)){var e=new Error('本地盘搜暂不可用；服务器备用需要设备密钥');e.kind='unauthorized';return Promise.reject(e);}var url=options.endpoint(source);return options.call(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'User-Agent':'Mozilla/5.0'},body:JSON.stringify({kw:query}),responseType:'json',timeout:16},current).then(function(response){cancelled(current);return {response:response,url:url,route:'oracle'};});}
      if(source!=='pan')return remote();
      cancelled(current);
      return new Promise(function(resolve,reject){var done=false,timer=setTimeout(function(){if(!done){done=true;reject(new Error('local timeout'));}},16500);Promise.resolve().then(function(){return options.call(LOCAL,{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'Mozilla/5.0'},body:JSON.stringify({kw:query}),responseType:'json',timeout:16},current);}).then(function(v){if(!done){done=true;clearTimeout(timer);resolve(v);}},function(e){if(!done){done=true;clearTimeout(timer);reject(e);}});}).then(function(response){
        cancelled(current);var status=Number(response&&response.status)||0;
        if(!response||!status||status>=500||status===408)return remote();
        return {response:response,url:LOCAL,route:'local'};
      },function(error){cancelled(current);if(error&&error.kind==='cancelled')throw error;return remote();});
    }
    return {request:request};
  }
  root.GGSearchRouter={create:create,localEndpoint:LOCAL};
})(typeof window!=='undefined'?window:globalThis);
