(function(root){
  'use strict';
  function mount(o){
    var doc=o.document,win=doc.defaultView,viewport={},pending=false,nativeAway=false,inflight=false,timer=null,lastApply=0,mode='';
    doc.body.classList.remove('gg-topbar-hidden','gg-topbar-collapsed');
    function editing(n){return !!(n&&(n.tagName==='TEXTAREA'||n.tagName==='SELECT'||n.isContentEditable||(n.tagName==='INPUT'&&!/^(checkbox|radio|button|submit|range)$/i.test(n.type))));}
    function safe(){var kb=Number(viewport.keyboardBottom||0);try{kb=Math.max(kb,parseFloat(win.getComputedStyle(doc.documentElement).getPropertyValue('--fm-keyboard-bottom'))||0);}catch(e){}if(win.visualViewport&&win.innerHeight-win.visualViewport.height>160)kb=Math.max(kb,161);return !doc.hidden&&!nativeAway&&!editing(doc.activeElement)&&kb<40;}
    function request(force){pending=true;if(force)lastApply=0;if(timer)clearTimeout(timer);timer=setTimeout(apply,Math.max(70,350-(Date.now()-lastApply)));}
    function read(v){try{if(typeof v==='string')v=JSON.parse(v);if(v&&v.body!==undefined){v=v.body;if(typeof v==='string')v=JSON.parse(v);}}catch(e){return;}if(!v||typeof v!=='object')return;viewport=v;['Top','Right','Bottom','Left'].forEach(function(k){var n=Number(v['safe'+k]);if(isFinite(n)&&n>=0){doc.documentElement.style.setProperty('--gg-safe-'+k.toLowerCase(),n+'px');doc.documentElement.style.setProperty('--gg-tv-safe-'+k.toLowerCase(),Math.max(k==='Top'?24:k==='Bottom'?20:30,n)+'px');}});if(pending&&safe())request(false);}
    function apply(){timer=null;if(!pending||!safe()||inflight)return;var ui=win.fm&&win.fm.ui;if(!ui)return;pending=false;if(typeof ui.setChrome!=='function'&&!(o.isTV()&&typeof ui.setToolbar==='function')){mode='unsupported';return;}inflight=true;
      Promise.resolve().then(function(){if(typeof ui.setChrome==='function')return ui.setChrome({mode:o.isTV()?'tv-full':'immersive',restoreAffordance:'none',statusBarStyle:'light',navigationBarStyle:'light'});return ui.setToolbar(false);}).then(function(){mode=typeof ui.setChrome==='function'?(o.isTV()?'tv-full':'immersive'):'legacy-toolbar';lastApply=Date.now();},function(){if(!o.isTV()&&typeof ui.setChrome==='function')return Promise.resolve(ui.setChrome({mode:'edge',restoreAffordance:'none'})).then(function(){mode='edge';lastApply=Date.now();},function(){mode='unsupported';});}).then(function(){inflight=false;if(pending&&safe())request(false);},function(){inflight=false;});
    }
    function resume(){nativeAway=false;request(true);}
    function sdk(){var ui=win.fm&&win.fm.ui;if(ui&&typeof ui.getViewport==='function')Promise.resolve().then(function(){return ui.getViewport();}).then(read,function(){});request(true);}
    doc.addEventListener('click',function(e){var n=e.target;while(n&&n!==doc.body){if(n.tagName==='BUTTON'||n.getAttribute&&n.getAttribute('role')==='button'){if(!n.disabled)request(false);return;}n=n.parentElement;}},true);
    doc.addEventListener('focusin',function(e){if(pending&&!editing(e.target))request(false);},false);
    win.addEventListener('fmviewport',function(e){read(e.detail);},false);win.addEventListener('fmsdk',sdk,false);win.addEventListener('fmresume',resume,false);win.addEventListener('pageshow',resume,false);win.addEventListener('focus',function(){if(nativeAway&&!doc.hidden)resume();},false);doc.addEventListener('visibilitychange',function(){if(!doc.hidden)resume();},false);
    sdk();return {show:function(){},hide:function(){},request:request,nativeLaunch:function(){nativeAway=true;pending=true;if(timer)clearTimeout(timer);timer=null;},resume:resume,inspect:function(){return {header:false,hidden:true,pending:pending,nativeAway:nativeAway,mode:mode,keyboardBottom:Number(viewport.keyboardBottom||0)};}};
  }
  root.GGChrome={mount:mount};
}(this));
