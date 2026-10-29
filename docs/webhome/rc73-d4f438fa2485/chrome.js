(function(root){
  'use strict';
  function mount(options){
    var doc=options.document,win=doc.defaultView,bar=doc.querySelector('.topbar'),body=doc.body;
    var hidden=false,hideTimer=null,applyTimer=null,inflight=false,pending=false,nativeAway=false,destroyed=false,modality='keyboard',pointerTop=false,viewport={},lastApply=0,appliedMode='',lastScroll=win.pageYOffset||0;
    var reveal=doc.createElement('button');reveal.type='button';reveal.id='ggTopbarReveal';reveal.className='gg-topbar-reveal';reveal.setAttribute('aria-label','显示首页导航');reveal.setAttribute('aria-controls',bar.id||(bar.id='ggTopbar'));reveal.textContent='⌄';body.appendChild(reveal);
    function editing(node){return !!(node&&(node.tagName==='TEXTAREA'||node.isContentEditable||(node.tagName==='INPUT'&&!/^(checkbox|radio|button|submit|range)$/i.test(node.type))||node.tagName==='SELECT'));}
    function modalOpen(){return !!doc.querySelector('.modal:not([hidden]),.discovery-modal:not([hidden]),.ref-dialog:not([hidden]),.catalog-detail:not([hidden])');}
    function setHidden(value){if(!bar)return;hidden=value;body.classList.remove('gg-topbar-collapsed');body.classList.toggle('gg-topbar-hidden',value);reveal.hidden=!value;reveal.setAttribute('aria-expanded',String(!value));}
    function show(focus){clearTimeout(hideTimer);setHidden(false);if(focus){var target=bar.querySelector('.navlink.active,button,a[href]');if(target)target.focus();}scheduleHide(2200);}
    function canHide(){return !pointerTop&&!(modality==='keyboard'&&bar.contains(doc.activeElement));}
    function scheduleHide(delay){clearTimeout(hideTimer);hideTimer=setTimeout(function(){if(canHide()){if(modality==='pointer'&&bar.contains(doc.activeElement))try{doc.activeElement.blur();}catch(e){}setHidden(true);}},delay===undefined?500:delay);}
    function hide(){if(canHide())setHidden(true);}
    function safe(){var kb=Number(viewport.keyboardBottom||0);try{kb=Math.max(kb,parseFloat(win.getComputedStyle(doc.documentElement).getPropertyValue('--fm-keyboard-bottom'))||0);}catch(e){}
      if(win.visualViewport&&win.innerHeight-win.visualViewport.height>160)kb=Math.max(kb,161);
      return !destroyed&&!doc.hidden&&!nativeAway&&!editing(doc.activeElement)&&kb<40;
    }
    function readViewport(value){var v=value;try{if(typeof v==='string')v=JSON.parse(v);if(v&&v.body!==undefined){v=v.body;if(typeof v==='string')v=JSON.parse(v);}}catch(e){return;}if(!v||typeof v!=='object')return;viewport=v;
      ['Top','Right','Bottom','Left'].forEach(function(k){var n=Number(v['safe'+k]);if(isFinite(n)&&n>=0){doc.documentElement.style.setProperty('--gg-safe-'+k.toLowerCase(),n+'px');doc.documentElement.style.setProperty('--gg-tv-safe-'+k.toLowerCase(),Math.max(k==='Top'?24:k==='Bottom'?20:30,n)+'px');}});
      if(pending&&safe())request(false);
    }
    function apply(){applyTimer=null;if(!pending||!safe()||inflight)return;var fm=win.fm,ui=fm&&fm.ui;if(!ui)return;pending=false;if(typeof ui.setChrome!=='function'&&!(options.isTV()&&typeof ui.setToolbar==='function')){appliedMode='unsupported';return;}inflight=true;var mode=options.isTV()?'tv-full':'immersive';
      function invoke(){if(typeof ui.setChrome==='function')return ui.setChrome({mode:mode,restoreAffordance:'none',statusBarStyle:'light',navigationBarStyle:'light'});if(options.isTV()&&typeof ui.setToolbar==='function')return ui.setToolbar(false);return null;}
      Promise.resolve().then(invoke).then(function(){appliedMode=typeof ui.setChrome==='function'?mode:'legacy-toolbar';lastApply=Date.now();},function(){
        // An older host may support edge but not immersive. Never call Android fullscreen APIs ourselves.
        if(!options.isTV()&&typeof ui.setChrome==='function')return Promise.resolve(ui.setChrome({mode:'edge',restoreAffordance:'none'})).then(function(){appliedMode='edge';lastApply=Date.now();},function(){appliedMode='unsupported';});
      }).then(function(){inflight=false;if(pending&&safe())request(false);},function(){inflight=false;});
    }
    function request(force){pending=true;if(force)lastApply=0;if(applyTimer)clearTimeout(applyTimer);applyTimer=setTimeout(apply,Math.max(70,350-(Date.now()-lastApply)));}
    function nativeLaunch(){nativeAway=true;pending=true;if(applyTimer)clearTimeout(applyTimer);applyTimer=null;}
    function resume(){nativeAway=false;request(true);}
    function onFocus(e){if(bar.contains(e.target))show(false);else scheduleHide(200);if(pending&&!editing(e.target))request(false);}
    function topRow(node){
      if((win.pageYOffset||doc.documentElement.scrollTop||0)>4)return false;
      if(!node||node===body)return true;
      if(node.closest&&node.closest('.discovery-types,.topbar'))return true;
      var area=node.closest&&node.closest('#letterPicker,.discovery-grid,.discovery-rail-track,.catalog-grid,.resource-grid,.ref-site-results');
      if(!area)return false;
      var collection=area.closest&&area.closest('#discoverySection,#resultsSection,#referenceResults,#catalogSection');
      if(collection){var areas=collection.querySelectorAll('.discovery-grid,.discovery-rail-track,.catalog-grid,.resource-grid,.ref-site-results'),firstArea=null;for(var ai=0;ai<areas.length;ai++)if(areas[ai].getClientRects().length&&areas[ai].querySelector('button')){firstArea=areas[ai];break;}if(firstArea&&area!==firstArea)return false;}
      var first=area.querySelector('button'),r=node.getBoundingClientRect(),fr=first&&first.getBoundingClientRect();
      return !!(fr&&r.top>=0&&r.top<win.innerHeight&&Math.abs(r.top-fr.top)<4);
    }
    function onKey(e){modality='keyboard';var k=e.key||({19:'ArrowUp',38:'ArrowUp'}[e.keyCode]),node=doc.activeElement;if(k==='ArrowUp'&&!modalOpen()&&!editing(node)&&topRow(node)){
      var home=doc.getElementById('discoverySection'),local=home&&!home.hidden?home.querySelector('.discovery-types'):null;
      if(local&&local.getClientRects().length&&!local.contains(node)&&!bar.contains(node)){
        var tab=local.querySelector('.discovery-type.active')||local.querySelector('button');if(tab){setHidden(true);try{win.scrollTo(0,0);tab.focus();}catch(error){}e.preventDefault();e.stopImmediatePropagation();return;}
      }
      show(true);e.preventDefault();e.stopImmediatePropagation();
    }}
    function onMove(e){modality='pointer';var safeTop=Number(viewport.safeTop||0),y=e.clientY;pointerTop=y<=safeTop+14||(!hidden&&bar.contains(e.target));if(pointerTop)show(false);else scheduleHide(280);}
    function onLeave(){pointerTop=false;scheduleHide(280);}
    function closestAction(node){while(node&&node!==body){if(node.tagName==='BUTTON'||node.getAttribute&&node.getAttribute('role')==='button')return node;node=node.parentElement;}return null;}
    function onClick(e){var action=closestAction(e.target);if(!action||action.disabled)return;request(false);if(!bar.contains(action))scheduleHide(450);}
    function onViewport(e){readViewport(e.detail);}
    function onScroll(){var y=win.pageYOffset||0;if(y>lastScroll+8)scheduleHide(80);lastScroll=y;}
    function onSdk(){var ui=win.fm&&win.fm.ui;if(ui&&typeof ui.getViewport==='function')Promise.resolve().then(function(){return ui.getViewport();}).then(readViewport,function(){});request(true);}
    reveal.onclick=function(){pointerTop=false;show(true);};
    doc.addEventListener('focusin',onFocus,false);doc.addEventListener('focusout',function(){scheduleHide(400);},false);doc.addEventListener('keydown',onKey,true);doc.addEventListener('mousemove',onMove,false);doc.addEventListener('mousedown',function(){modality='pointer';},true);doc.addEventListener('touchstart',function(){modality='pointer';},true);doc.addEventListener('click',onClick,true);
    doc.documentElement.addEventListener('mouseleave',onLeave,false);win.addEventListener('scroll',onScroll,false);win.addEventListener('fmviewport',onViewport,false);win.addEventListener('fmsdk',onSdk,false);win.addEventListener('fmresume',resume,false);win.addEventListener('pageshow',resume,false);win.addEventListener('focus',function(){if(nativeAway&&!doc.hidden)resume();},false);
    doc.addEventListener('visibilitychange',function(){if(!doc.hidden)resume();},false);
    setHidden(false);scheduleHide(1300);onSdk();
    return {show:show,hide:hide,request:request,nativeLaunch:nativeLaunch,resume:resume,inspect:function(){return {hidden:hidden,pending:pending,nativeAway:nativeAway,mode:appliedMode,keyboardBottom:Number(viewport.keyboardBottom||0)};}};
  }
  root.GGChrome={mount:mount};
}(this));
