(function(root){'use strict';
  function mount(options){var saved=null,cancelled=false,serial=0;
    function capture(){var active=document.activeElement;if(!active||/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))return;var id=active.dataset.id||active.dataset.ggReturnId;if(!id){id='return-'+(++serial);active.dataset.ggReturnId=id;}saved={node:active,id:id,x:root.pageXOffset,y:root.pageYOffset,context:options.context()};cancelled=false;}
    function restore(){if(!saved||cancelled)return;var snap=saved,tries=0;function attempt(){if(saved!==snap||cancelled)return;var c=options.context();if(c!==snap.context)return;var node=document.documentElement.contains(snap.node)?snap.node:null;if(!node){var nodes=document.querySelectorAll('[data-id],[data-gg-return-id]');for(var i=0;i<nodes.length;i++)if((nodes[i].dataset.id||nodes[i].dataset.ggReturnId)===snap.id){node=nodes[i];break;}}if(node&&!node.disabled&&node.getClientRects().length){try{node.focus({preventScroll:true});}catch(e){node.focus();}root.scrollTo(snap.x,snap.y);}if(++tries<8)setTimeout(attempt,120);}attempt();}
    function user(){cancelled=true;}
    document.addEventListener('keydown',user,true);document.addEventListener('pointerdown',user,true);document.addEventListener('touchstart',user,true);document.addEventListener('wheel',user,true);
    return {capture:capture,restore:restore,inspect:function(){return {saved:!!saved,cancelled:cancelled};}};
  }root.GGPlaybackReturn={mount:mount};
}(window));
