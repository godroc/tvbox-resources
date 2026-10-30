(function(root){
  'use strict';
  function mount(o){
    var doc=o.document,win=doc.defaultView,input=doc.getElementById('query'),active=false,sawKeyboard=false,lastKeyboard=0,blurTimer=null,baseHeight=0,baseWidth=0,openingKey=false,pointerUntil=0;
    function changed(){doc.dispatchEvent(new Event('gg-back-layer-change'));}
    function dialog(){return !!doc.querySelector('.modal:not([hidden]),.discovery-modal:not([hidden]),.ref-dialog:not([hidden]),.catalog-detail:not([hidden])');}
    function gate(){input.readOnly=true;input.setAttribute('aria-readonly','true');}
    gate();
    function close(focus,silent){openingKey=false;gate();if(!active)return false;clearTimeout(blurTimer);active=false;sawKeyboard=false;lastKeyboard=0;input.removeAttribute('data-gg-back-layer');try{input.blur();}catch(e){}if(focus&&!doc.hidden&&o.isSearch()&&!dialog())o.focusKeyboard();if(!silent)changed();return true;}
    function begin(){if(!o.isSearch()||input.readOnly)return;clearTimeout(blurTimer);if(active)return;if(o.onBegin)o.onBegin();active=true;sawKeyboard=false;lastKeyboard=0;baseWidth=win.innerWidth;baseHeight=Math.max(win.innerHeight,win.visualViewport?win.visualViewport.height:0);input.setAttribute('data-gg-back-layer','search-input');changed();}
    function keyboard(value){if(!active||!o.isSearch())return;var n=Number(value);if(!isFinite(n)||n<0)return;if(n>80){sawKeyboard=true;lastKeyboard=n;}else if(sawKeyboard&&lastKeyboard>80&&n<40){var focused=doc.activeElement;close(!focused||focused===input||focused===doc.body);}}
    function viewport(e){var v=e&&e.detail;if(typeof v==='string')try{v=JSON.parse(v);}catch(error){return;}if(v&&v.keyboardBottom!==undefined)keyboard(v.keyboardBottom);}
    function visual(){if(!active||!win.visualViewport)return;if(Math.abs(win.innerWidth-baseWidth)>80){baseWidth=win.innerWidth;baseHeight=Math.max(win.innerHeight,win.visualViewport.height);sawKeyboard=false;lastKeyboard=0;return;}var gap=baseHeight-win.visualViewport.height;keyboard(Math.max(0,gap));}

    function confirm(e){var key=e.key||'',code=Number(e.keyCode||e.which||0);return key==='Enter'||key==='NumpadEnter'||key==='Select'||code===23||code===66;}
    function consume(e){e.preventDefault();if(e.stopImmediatePropagation)e.stopImmediatePropagation();else e.stopPropagation();}
    function activate(){if(!o.isSearch()||dialog())return;clearTimeout(blurTimer);input.readOnly=false;input.setAttribute('aria-readonly','false');if(doc.activeElement===input)input.blur();input.focus();begin();}
    // Focus navigation never opens editing. Only an explicit confirm or direct
    // pointer/touch gesture unlocks the field; opening Enter cannot submit.
    doc.addEventListener('keydown',function(e){if(doc.activeElement!==input||!o.isSearch()||!confirm(e))return;if(input.readOnly||openingKey){consume(e);if(!openingKey){openingKey=true;activate();}}},true);
    doc.addEventListener('keypress',function(e){if(openingKey&&confirm(e))consume(e);},true);
    doc.addEventListener('keyup',function(e){if(openingKey&&confirm(e)){consume(e);openingKey=false;}},true);
    function pointer(){if(!o.isSearch()||dialog())return;pointerUntil=Date.now()+700;openingKey=false;if(input.readOnly)activate();}
    input.addEventListener('pointerdown',pointer,true);
    // Older Android WebViews without PointerEvent still get touch/mouse intent.
    input.addEventListener('touchstart',pointer,true);input.addEventListener('mousedown',pointer,true);
    input.addEventListener('click',function(){if(input.readOnly&&Date.now()<=pointerUntil)activate();},true);

    input.addEventListener('input',function(){openingKey=false;},false);
    input.addEventListener('focus',begin,false);
    input.addEventListener('blur',function(){if(!active)return;clearTimeout(blurTimer);blurTimer=setTimeout(function(){if(active&&doc.activeElement!==input)close(!doc.activeElement||doc.activeElement===doc.body);},160);},false);
    win.addEventListener('fmviewport',viewport,false);if(win.visualViewport)win.visualViewport.addEventListener('resize',visual,false);
    return {close:close,inspect:function(){return {active:active,keyboardSeen:sawKeyboard,readonly:input.readOnly,openingKey:openingKey};}};
  }
  root.GGSearchInput={mount:mount};
}(this));
