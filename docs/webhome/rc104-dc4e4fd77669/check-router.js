(function(root){'use strict';
  function endpoint(value){
    var u;try{u=new URL(String(value||'').trim());}catch(e){throw new Error('请填写 MiniPC 根地址');}
    if(u.username||u.password||u.search||u.hash||u.pathname!=='/')throw new Error('地址只允许协议、主机和端口');
    var h=u.hostname.toLowerCase(),p=h.split('.'),privateIp=p.length===4&&p.every(function(x){return /^\d+$/.test(x)&&Number(x)<=255;})&&(p[0]==='10'||p[0]==='192'&&p[1]==='168'||p[0]==='172'&&Number(p[1])>=16&&Number(p[1])<=31);
    if(u.protocol!=='https:'&&!(u.protocol==='http:'&&privateIp))throw new Error('HTTP 仅允许局域网 IPv4；其他地址必须 HTTPS');
    return u.origin;
  }
  function create(options){
    var settings=options.read('check-route.v1',{})||{},secret=options.read('check-local-key.v1','');
    function mode(){return /^(off|local)$/.test(settings.mode)?settings.mode:'backend';}
    function save(value,key){if(/[\r\n]/.test(String(key||'')))throw new Error('密钥不可包含换行');var next={mode:/^(off|backend|local)$/.test(value.mode)?value.mode:'backend',url:value.url?endpoint(value.url):''};if(next.mode==='local'&&!next.url)throw new Error('本地检测需要地址');next.revision=(Number(settings.revision)||0)+1;settings=next;secret=String(key||'').trim();options.write('check-route.v1',settings);options.write('check-local-key.v1',secret);}
    function request(items,fresh,current){
      var revision=settings.revision,selected=mode();if(selected==='off')return Promise.resolve(null);
      if(selected==='local'&&fresh){var unsupported=new Error('本地检测服务暂不支持强制刷新，缓存到期后重检');unsupported.code='refresh_unsupported';return Promise.reject(unsupported);}
      var base,key;if(selected==='local'){try{base=endpoint(settings.url);key=secret;}catch(e){return Promise.reject(e);}}else{base=options.backend();key=options.credential();if(!key)return Promise.reject(new Error('缺少设备密钥'));}
      var url=selected==='local'?base+'/api/check/'+(fresh?'refresh':'links'):base.replace(/\/links$/,fresh?'/refresh':'/links');
      var payload=items.map(function(it){return {url:it.url,password:it.password||'',disk_type:it.disk_type};});
      return options.sdk().then(function(fm){if(current&&!current())throw new Error('cancelled');if(!fm||typeof fm.req!=='function')throw new Error('请求桥接不可用');return new Promise(function(resolve,reject){var done=false,timer=setTimeout(function(){if(!done){done=true;reject(new Error('timeout'));}},fresh?25000:selected==='local'?11500:9000);var headers={'Content-Type':'application/json'};if(key)headers.Authorization='Bearer '+key;Promise.resolve(fm.req(url,{method:'POST',headers:headers,body:JSON.stringify({items:payload}),responseType:'json',timeout:fresh?25:selected==='local'?11:8})).then(function(response){if(done)return;done=true;clearTimeout(timer);if(revision!==settings.revision||current&&!current()){reject(new Error('cancelled'));return;}if(!response||!response.ok||Number(response.status)!==200){reject(new Error('检测服务不可用'));return;}resolve(response);},function(e){if(done)return;done=true;clearTimeout(timer);reject(e);});});});
    }
    return {cacheTag:function(){return mode()==='local'?'local:'+(settings.revision||0):mode();},mode:mode,save:save,request:request,settings:function(){return {mode:mode(),url:settings.url||''};},secret:function(){return secret;}};
  }
  root.GGCheckRouter={create:create,endpoint:endpoint};
})(typeof window!=='undefined'?window:globalThis);
