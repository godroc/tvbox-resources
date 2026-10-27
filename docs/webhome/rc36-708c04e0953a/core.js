(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GGCore = factory();
}(this, function () {
  'use strict';
  var disks = {quark:'夸克',tianyi:'天翼',aliyun:'阿里',baidu:'百度',uc:'UC','123':'123',xunlei:'迅雷',mobile:'移动','115':'115',guangya:'光鸭',pikpak:'PikPak'};
  var hosts = {'pan.quark.cn':'quark','drive.uc.cn':'uc','alipan.com':'aliyun','aliyundrive.com':'aliyun','pan.baidu.com':'baidu','cloud.189.cn':'tianyi','yun.139.com':'mobile','caiyun.139.com':'mobile','123pan.com':'123','123684.com':'123','123865.com':'123','123912.com':'123','pan.xunlei.com':'xunlei','115.com':'115','115cdn.com':'115','guangyapan.com':'guangya','pan.guangya.com':'guangya','mypikpak.com':'pikpak'};
  var aliases = {ali:'aliyun',alipan:'aliyun','123pan':'123','139':'mobile',caiyun:'mobile','189':'tianyi',cloud189:'tianyi'};
  function trim(x) { return String(x === null || typeof x === 'undefined' ? '' : x).replace(/^\s+|\s+$/g,''); }
  function disk(x) { x=trim(x).toLowerCase();return aliases[x]||x; }
  function safeShare(value) {
    try {
      if (/[\x00-\x20]/.test(value)) return null;
      var u=new URL(value),host=u.hostname.toLowerCase(),keys=Object.keys(hosts),i;
      if ((u.protocol!=='https:'&&u.protocol!=='http:')||u.username||u.password||(u.port&&u.port!=='443'&&u.port!=='80')) return null;
      for(i=0;i<keys.length;i++) if(host===keys[i]||host.slice(-keys[i].length-1)==='.'+keys[i]) {
        if(!/^\/(s\/|t\/|web\/share|w\/i\/|share\/)/.test(u.pathname)) return null;
        u.hash='';return {url:u.href,type:hosts[keys[i]],password:u.searchParams.get('pwd')||u.searchParams.get('password')||''};
      }
    } catch(e) {} return null;
  }
  function size(value) {
    if(typeof value==='number')return isFinite(value)&&value>=0?value:null;
    var m=trim(value).match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB|KIB|MIB|GIB|TIB)$/i);
    if(!m)return null;var units={B:1,KB:1000,MB:1e6,GB:1e9,TB:1e12,KIB:1024,MIB:1048576,GIB:1073741824,TIB:1099511627776};return Number(m[1])*units[m[2].toUpperCase()];
  }
  function year(title) { var m=title.match(/(?:^|[\s(（\[【])((?:19|20)\d{2})(?=$|[\s)）\]】])/);return m?m[1]:''; }
  function identity(value) { var u=new URL(value),remove=[];u.searchParams.forEach(function(v,k){if(/^(pwd|password|utm_.*|from|source)$/i.test(k))remove.push(k);});remove.forEach(function(k){u.searchParams.delete(k);});return u.href; }
  function titleKey(title) { return trim(title).replace(/[（(【\[]?(?:19|20)\d{2}[）)】\]]?/g,'').replace(/(?:2160p|1080p|720p|4k|8k|hdr10\+?|hdr|高码率?|蓝光|原盘|国语|中字|全集|完结|更新至?\s*\d+集)/ig,'').replace(/[\s《》【】\[\]()（）·:：_\-.]/g,'').toLowerCase(); }
  function normalize(body,source) {
    var groups=body&&body.data&&body.data.merged_by_type||body&&body.merged_by_type||{},out=[];
    Object.keys(groups).forEach(function(kind) {
      if(!Array.isArray(groups[kind]))return;
      groups[kind].forEach(function(row) {
        if(!row||typeof row!=='object')return;
        var share=safeShare(row.url||row.link||'');if(!share)return;
        var title=trim(row.note||row.title||row.name||'未命名资源').slice(0,500),type=disk(kind);if(!disks[type]||type!==share.type)type=share.type;
        var password=trim(row.password||row.pwd||share.password).slice(0,64),stamp=trim(row.datetime||row.time||row.created_at||''),date=/^0001-01-01(?:T|$)/.test(stamp)?NaN:Date.parse(stamp),tags=[],image='';
        if(/4k|2160p/i.test(title))tags.push('4K');if(/1080p/i.test(title))tags.push('1080P');if(/hdr/i.test(title))tags.push('HDR');if(/高码|高比特/i.test(title))tags.push('高码');
        var images=row.images||[];if(images.length){var pic=typeof images[0]==='string'?images[0]:images[0]&&images[0].url;try{var iu=new URL(pic);if(iu.protocol==='https:'&&!iu.username&&!iu.password)image=iu.href;}catch(e){}}
        out.push({id:type+'|'+identity(share.url),url:share.url,password:password,passwords:password?[password]:[],type:type,title:title,year:year(title),date:isFinite(date)?date:null,size:size(row.size||row.file_size||row.filesize),tags:tags,image:image,sources:[source]});
      });
    });return merge([],out);
  }
  function copy(row) { var out={},k;for(k in row)if(Object.prototype.hasOwnProperty.call(row,k))out[k]=Array.isArray(row[k])?row[k].slice():row[k];return out; }
  function merge(oldRows,newRows) {
    var out=[],seen=Object.create(null);
    oldRows.concat(newRows).forEach(function(row) {
      var id=row.id;if(typeof seen[id]==='number') {
        var old=out[seen[id]];row.sources.forEach(function(s){if(old.sources.indexOf(s)<0)old.sources.push(s);});
        row.tags.forEach(function(t){if(old.tags.indexOf(t)<0)old.tags.push(t);});
        if(!old.passwords)old.passwords=old.password?[old.password]:[];
        (row.passwords||(row.password?[row.password]:[])).forEach(function(p){if(old.passwords.indexOf(p)<0)old.passwords.push(p);});
        if(!old.password&&row.password){old.password=row.password;old.url=row.url;}
        if(old.date===null&&row.date!==null)old.date=row.date;if(old.size===null&&row.size!==null)old.size=row.size;if(!old.image)old.image=row.image;
      } else { seen[id]=out.length;out.push(copy(row)); }
    });return out;
  }
  function score(title,query) {
    var t=titleKey(title),q=titleKey(query);if(!q)return 0;
    if(t===q)return 1000;if(t.indexOf(q)===0)return 700;if(t.indexOf(q)>=0)return 500;
    var n=0;for(var i=0;i<q.length;i++)if(t.indexOf(q.charAt(i))>=0)n++;return Math.floor(n/Math.max(1,q.length)*100);
  }
  function filter(rows,options) {
    var o=options||{},excluded=trim(o.exclude).split(/[,，、\s]+/).filter(Boolean),qy=year(o.query||''),tag=o.quality||'',out=[];
    rows.forEach(function(r,index) {
      if(o.source&&o.source!=='all'&&r.sources.indexOf(o.source)<0)return;
      if(o.disk&&r.type!==o.disk)return;if(tag&&r.tags.indexOf(tag)<0)return;
      for(var i=0;i<excluded.length;i++)if(r.title.toLowerCase().indexOf(excluded[i].toLowerCase())>=0)return;
      if(o.minSize>0&&(r.size===null?!o.keepUnknown:r.size<o.minSize))return;
      if(o.since&&(r.date===null?!o.keepUnknown:r.date<o.since))return;
      out.push({row:r,index:index,rank:score(r.title,o.query||'')+(qy&&r.year===qy?30:0)});
    });
    out.sort(function(a,b) {
      var order=o.sort||'relevance',diff=0;
      if(order==='newest')diff=(b.row.date===null?-Infinity:b.row.date)-(a.row.date===null?-Infinity:a.row.date);
      else if(order==='size')diff=(b.row.size===null?-Infinity:b.row.size)-(a.row.size===null?-Infinity:a.row.size);
      else diff=b.rank-a.rank;
      return (isNaN(diff)?0:diff)||a.index-b.index;
    });return out.map(function(x){return x.row;});
  }
  function groups(rows,order) {
    var counts={};rows.forEach(function(r){counts[r.type]=(counts[r.type]||0)+1;});
    var keys=Object.keys(counts),list=order||[];keys.sort(function(a,b){var ai=list.indexOf(a),bi=list.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b);});
    return keys.map(function(t){return {type:t,name:disks[t]||t,count:counts[t]};});
  }
  function page(rows,value,count) { count=Math.max(1,Math.min(80,Number(count)||24));var pages=Math.max(1,Math.ceil(rows.length/count)),p=Math.max(1,Math.min(pages,Number(value)||1));return {page:p,totalPages:pages,total:rows.length,items:rows.slice((p-1)*count,p*count)}; }
  function endpoint(source) { if(source!=='pan'&&source!=='tg')throw new Error('Unknown provider');return 'https://tv.godroc.dpdns.org/tg-api/device/'+source+'/api/search'; }
  function checkEndpoint() { return 'https://tv.godroc.dpdns.org/tg-api/device/pan/api/check/links'; }
  function parseCheckResults(body, items) {
    var out=[], i;
    for (i=0;i<items.length;i++) out.push('unknown');
    if (!body || typeof body !== 'object') return out;
    if (typeof body.code === 'number' && body.code !== 0 && body.code !== 200) return out;
    var list=null;
    if (Array.isArray(body)) list=body;
    else if (Array.isArray(body.results)) list=body.results;
    else if (body.data && Array.isArray(body.data.results)) list=body.data.results;
    else if (Array.isArray(body.data)) list=body.data;
    if (!list) return out;
    function norm(u){ try{ var x=new URL(u); x.searchParams.delete('pwd'); x.searchParams.delete('password'); return x.href; }catch(e){ return String(u||''); } }
    var map={};
    list.forEach(function(r){ if(r && typeof r.url==='string') map[norm(r.url)]=r; });
    items.forEach(function(item, idx){
      var r=map[norm(item.url)];
      if(!r)return;
      var st=r.status||r.state||r.result||'';
      if(r.valid===true||r.ok===true||/^(ok|valid|available|success|passed)$/i.test(String(st)))out[idx]='ok';
    });
    return out;
  }
  function rankPreselect(candidates) {
    // Ranking inputs only: detection OK + verified clarity (vertical pixels)
    // + caller's rank (lower is better, e.g. the user's disk priority).
    // Title labels (4K/1080P/HDR tags) are NOT inputs: an unverified claim must
    // never win preselection. Unknown clarity scores 0, below any verified value.
    // A missing rank scores 0, below any ranked candidate. The rank bonus stays
    // below 1 so that any real clarity difference still dominates it.
    var best=-1,i,c,b,cs,bs;
    function score(x){ var r=(typeof x.rank==='number')?(10000-Math.min(x.rank,9999))/10000:0; return (x.ok?1000000:0)+(typeof x.verifiedClarity==='number'?x.verifiedClarity:0)+r; }
    for(i=0;i<candidates.length;i++){
      c=candidates[i];
      if(best<0){best=i;continue;}
      b=candidates[best];cs=score(c);bs=score(b);
      if(cs>bs||(cs===bs&&c.order<b.order))best=i;
    }
    return best;
  }
  function validKey(value) { return /^[A-Za-z0-9_-]{43}$/.test(value||''); }
  return {disks:disks,disk:disk,safeShare:safeShare,size:size,year:year,titleKey:titleKey,normalize:normalize,merge:merge,filter:filter,score:score,groups:groups,page:page,endpoint:endpoint,validKey:validKey,checkEndpoint:checkEndpoint,parseCheckResults:parseCheckResults,rankPreselect:rankPreselect};
}));
