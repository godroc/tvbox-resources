(function(root){'use strict';
 function mount(o){var doc=o.document||root.document,active=null,opening=false,observer=null,baseline=0,width=0,saw=false,lastBottom=0,blurTimer=null;
  function eligible(n){return !!(n&&n.nodeType===1&&n.id!=='query'&&!n.disabled&&(n.tagName==='TEXTAREA'||n.tagName==='INPUT'&&/^(text|password|number|search|email|url|tel)$/i.test(n.type||'text')));}
  function visible(n){if(!n||!doc.documentElement.contains(n)||!n.getClientRects().length)return false;var p=n;while(p&&p.nodeType===1){if(p.hidden||p.getAttribute('aria-hidden')==='true')return false;p=p.parentElement;}return true;}
  function notify(){doc.dispatchEvent(new Event('gg-back-layer-change'));}
  function gate(n){if(!eligible(n))return;if(n.getAttribute('data-gg-gated')===null){n.setAttribute('data-gg-gated','');n.__ggOriginallyReadonly=n.readOnly;}if(n!==active){n.readOnly=true;n.setAttribute('aria-readonly','true');}}
  function scan(node){if(!node||node.nodeType!==1)return;gate(node);var list=node.querySelectorAll('input,textarea');for(var i=0;i<list.length;i++)gate(list[i]);}
  function close(focus,silent){var n=active;if(!n)return false;active=null;opening=false;saw=false;lastBottom=0;clearTimeout(blurTimer);n.readOnly=true;n.setAttribute('aria-readonly','true');n.removeAttribute('data-gg-back-layer');var current=doc.activeElement;if(current===n){try{n.blur();}catch(e){}}if(focus&&visible(n)&&(!current||current===n||current===doc.body)){try{n.focus();}catch(e2){}}if(!silent)notify();return true;}
  function activate(n){if(!eligible(n)||n.__ggOriginallyReadonly)return;if(active&&active!==n)close(false,true);gate(n);active=n;opening=true;baseline=Math.max(root.innerHeight,root.visualViewport?root.visualViewport.height:0);width=root.innerWidth;saw=false;lastBottom=0;n.readOnly=false;n.setAttribute('aria-readonly','false');n.setAttribute('data-gg-back-layer','text-input');if(doc.activeElement===n)try{n.blur();}catch(e){}n.focus();notify();}
  function consume(e){e.preventDefault();if(e.stopImmediatePropagation)e.stopImmediatePropagation();else e.stopPropagation();}
  function confirm(e){return /^(Enter|NumpadEnter|Select)$/.test(e.key||'')||[23,66].indexOf(Number(e.keyCode||e.which))>=0;}
  function back(e){return /^(Escape|BrowserBack|GoBack|Back)$/.test(e.key||'')||[4,27].indexOf(Number(e.keyCode||e.which))>=0;}
  doc.addEventListener('keydown',function(e){var n=doc.activeElement;if(active&&back(e)){consume(e);close(true);return;}if(eligible(n)&&confirm(e)&&(n.readOnly||opening)){consume(e);if(n.readOnly)activate(n);}},true);
  doc.addEventListener('keyup',function(e){if(opening&&confirm(e)){consume(e);opening=false;}},true);
  doc.addEventListener('keypress',function(e){if(opening&&confirm(e))consume(e);},true);
  function pointer(e){var n=e.target;if(eligible(n)&&n.readOnly)activate(n);}
  doc.addEventListener('pointerdown',pointer,true);doc.addEventListener('mousedown',pointer,true);doc.addEventListener('touchstart',pointer,true);
  doc.addEventListener('click',function(e){if(eligible(e.target)&&e.target.readOnly)activate(e.target);},true);
  doc.addEventListener('focus',function(e){if(eligible(e.target)&&e.target!==active)gate(e.target);},true);
  doc.addEventListener('blur',function(e){if(e.target!==active)return;clearTimeout(blurTimer);blurTimer=setTimeout(function(){if(active&&doc.activeElement!==active)close(false);},160);},true);
  doc.addEventListener('input',function(e){if(e.target===active)opening=false;},true);
  function keyboard(bottom){bottom=Number(bottom);if(!active||!isFinite(bottom)||bottom<0)return;if(bottom>80){saw=true;lastBottom=bottom;}else if(saw&&lastBottom>80&&bottom<40)close(true);}
  root.addEventListener('fmviewport',function(e){var d=e.detail;if(typeof d==='string')try{d=JSON.parse(d);}catch(err){}if(d&&d.keyboardBottom!==undefined)keyboard(d.keyboardBottom);});
  if(root.visualViewport)root.visualViewport.addEventListener('resize',function(){if(!active)return;if(Math.abs(root.innerWidth-width)>80){width=root.innerWidth;baseline=Math.max(root.innerHeight,root.visualViewport.height);saw=false;return;}keyboard(Math.max(0,baseline-root.visualViewport.height));});
  scan(doc.documentElement);if(root.MutationObserver){observer=new root.MutationObserver(function(records){records.forEach(function(r){for(var i=0;i<r.addedNodes.length;i++)scan(r.addedNodes[i]);});if(active&&!visible(active))close(false,true);});observer.observe(doc.body,{childList:true,subtree:true});}
  return {close:close,inspect:function(){return {active:!!active,id:active&&active.id||'',readonly:active?active.readOnly:true,keyboardSeen:saw};}};
 }
 root.GGInputGate={mount:mount};
})(this);
