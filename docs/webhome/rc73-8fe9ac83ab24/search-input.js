(function(root){
  'use strict';
  function mount(o){
    var doc=o.document,win=doc.defaultView,input=doc.getElementById('query'),active=false,sawKeyboard=false,lastKeyboard=0,blurTimer=null,baseHeight=0,baseWidth=0;
    function changed(){doc.dispatchEvent(new Event('gg-back-layer-change'));}
    function dialog(){return !!doc.querySelector('.modal:not([hidden]),.discovery-modal:not([hidden]),.ref-dialog:not([hidden]),.catalog-detail:not([hidden])');}
    function close(focus,silent){if(!active)return false;clearTimeout(blurTimer);active=false;sawKeyboard=false;lastKeyboard=0;input.removeAttribute('data-gg-back-layer');try{input.blur();}catch(e){}if(focus&&!doc.hidden&&o.isSearch()&&!dialog())o.focusKeyboard();if(!silent)changed();return true;}
    function begin(){if(!o.isSearch())return;clearTimeout(blurTimer);active=true;sawKeyboard=false;lastKeyboard=0;baseWidth=win.innerWidth;baseHeight=Math.max(win.innerHeight,win.visualViewport?win.visualViewport.height:0);input.setAttribute('data-gg-back-layer','search-input');changed();}
    function keyboard(value){if(!active||!o.isSearch())return;var n=Number(value);if(!isFinite(n)||n<0)return;if(n>80){sawKeyboard=true;lastKeyboard=n;}else if(sawKeyboard&&lastKeyboard>80&&n<40){var focused=doc.activeElement;close(!focused||focused===input||focused===doc.body);}}
    function viewport(e){var v=e&&e.detail;if(typeof v==='string')try{v=JSON.parse(v);}catch(error){return;}if(v&&v.keyboardBottom!==undefined)keyboard(v.keyboardBottom);}
    function visual(){if(!active||!win.visualViewport)return;if(Math.abs(win.innerWidth-baseWidth)>80){baseWidth=win.innerWidth;baseHeight=Math.max(win.innerHeight,win.visualViewport.height);sawKeyboard=false;lastKeyboard=0;return;}var gap=baseHeight-win.visualViewport.height;keyboard(Math.max(0,gap));}
    input.addEventListener('focus',begin,false);
    input.addEventListener('blur',function(){if(!active)return;clearTimeout(blurTimer);blurTimer=setTimeout(function(){if(active&&doc.activeElement!==input)close(!doc.activeElement||doc.activeElement===doc.body);},160);},false);
    win.addEventListener('fmviewport',viewport,false);if(win.visualViewport)win.visualViewport.addEventListener('resize',visual,false);
    return {close:close,inspect:function(){return {active:active,keyboardSeen:sawKeyboard};}};
  }
  root.GGSearchInput={mount:mount};
}(this));
