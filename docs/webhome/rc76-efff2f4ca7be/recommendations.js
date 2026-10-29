(function(root){'use strict';
  function normalize(t){return String(t||'').toLowerCase().replace(/[\s\[\]【】（）()·:：，,。.!！?？_-]/g,'');}
  function aggregate(rows,options){var map=Object.create(null),out=[];rows.forEach(function(row){if(!row||(!row.__reference&&!root.GGCore.safeShare(row.url)))return;var k=row.__reference?'ref:'+row.siteKey+':'+row.url:root.GGCore.dedupKey(row.url),old=map[k];if(old){(row.sources||[]).forEach(function(s){if(old.sources.indexOf(s)<0)old.sources.push(s);});if(!old.image&&row.image)old.image=row.image;return;}var copy={};Object.keys(row).forEach(function(p){copy[p]=row[p];});copy.sources=(row.sources||[]).slice();copy.__mixKey=k;map[k]=copy;out.push(copy);});
    function rank(row){var clean=root.GGCore.cleanSearchTitle(row.title||'').title,q=normalize(options.query),t=normalize(clean),exact=t===q?0:t.indexOf(q)>=0?1:2,order=options.disks.indexOf(row.type),status=root.GGCheckLedger.get(row).state;return [exact,order<0?999:order,root.GGCore.healthRank(status)];}
    if(options.refresh)out.sort(function(a,b){var aa=rank(a),bb=rank(b);for(var i=0;i<aa.length;i++)if(aa[i]!==bb[i])return aa[i]-bb[i];return String(a.__mixKey).localeCompare(String(b.__mixKey));});
    else if(options.previous){var pos={};options.previous.forEach(function(k,i){pos[k]=i;});out.sort(function(a,b){var aa=pos[a.__mixKey],bb=pos[b.__mixKey];return (aa===undefined?1e9:aa)-(bb===undefined?1e9:bb);});}return out;
  }root.GGRecommendations={aggregate:aggregate};
}(window));
