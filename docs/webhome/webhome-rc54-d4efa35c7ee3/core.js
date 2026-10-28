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
      var st=String(r.status||r.state||r.result||'').toLowerCase();
      if(r.valid===true||r.ok===true||/^(ok|valid|available|success|passed)$/.test(st))out[idx]='ok';
      else if(/^(bad|invalid|dead|expired|removed)$/.test(st))out[idx]='bad';
      else if(/^(locked|forbidden|private)$/.test(st))out[idx]='locked';
      else if(/rate.?limit|too.?many/.test(st))out[idx]='rate_limited';
      else if(/unsupported|not.?supported/.test(st))out[idx]='unsupported';
      else if(st)out[idx]='unknown';
    });
    return out;
  }
  function rankPreselect(candidates) {
    // Preselect order (RC47): the user's disk priority FIRST, then detection
    // health as a tiebreaker inside the same disk, then verified clarity, then
    // stable order. Green-first must never override disk order, and title
    // labels (4K/1080P/HDR tags) are NOT inputs: an unverified claim must
    // never win preselection. Confirmed-bad rows never win while any non-bad
    // candidate exists. Health rank: ok 0, locked 1, pending/unchecked 2,
    // uncertain/limited/unsupported/unknown 3, bad 4.
    var best=-1,i,c,b;
    function rankOf(x){ return (typeof x.rank==='number')?x.rank:999; }
    function healthOf(x){
      if(x.ok)return 0;
      var st=String(x.check||'');
      if(st==='locked')return 1;
      if(st==='bad')return 4;
      if(st==='uncertain'||st==='limited'||st==='unsupported'||st==='rate_limited'||st==='unknown')return 3;
      return 2;
    }
    function clarityOf(x){ return (typeof x.verifiedClarity==='number')?x.verifiedClarity:-1; }
    function better(a,b2){
      if(rankOf(a)!==rankOf(b2))return rankOf(a)<rankOf(b2);
      if(healthOf(a)!==healthOf(b2))return healthOf(a)<healthOf(b2);
      if(clarityOf(a)!==clarityOf(b2))return clarityOf(a)>clarityOf(b2);
      return a.order<b2.order;
    }
    for(i=0;i<candidates.length;i++){
      c=candidates[i];
      if(best<0){best=i;continue;}
      b=candidates[best];
      if(better(c,b))best=i;
    }
    if(best>=0&&candidates[best]&&String(candidates[best].check||'')==='bad'){
      var alt=-1,j;
      for(j=0;j<candidates.length;j++){
        if(String(candidates[j].check||'')==='bad')continue;
        if(alt<0||better(candidates[j],candidates[alt]))alt=j;
      }
      if(alt>=0)best=alt;
    }
    return best;
  }
  function validKey(value) { return /^[A-Za-z0-9_-]{43}$/.test(value||''); }
  function dedupKey(url){ try{ return identity(url); }catch(e){ return String(url||''); } }
  function heroClass(hasBackdrop,hasImage){ return hasBackdrop?'has-art':(hasImage?'poster-only':''); }
  var PINYIN_INITIALS='ydkqsxhwzssxjbymgcczqpssqbycdscdqldylybsgjgyqzjjfgcclzzbwdwzjljpfyynwjjtmyyzwzhflyppqhgccyyymjqyxxgjxhsdsjnjjsmhmlzrxyfsngsyczqzggllyjlmyzssecykyyhqwjssggyxyqyjtwkdjhychmyxjtlxjyqbyxdldwrrjjwysrldzjpcbzjjbrcfslbczstzfxxthtrqggbdlyccscymmrfcyqzpwwjjyfcrwfdfzqpyddwyxkyjawjffxjpdftzyhhycyswccyqsclcxxwzzxnbgnnxbxlzsqcbsgpysyzdhmdzbqbzcwdzzyytzhbtsyyfzgntnxqywqskbphhlxgybfmjebjhhgqtjcysxstkzglyckglysmzxyalmeldccxgzyrcxsdltjzcqkcnnjwhjczzcqljststbnxbtyxceqxgkwjyflzqlyhjqspsfxlfpbyqxxxydcczylllsjxfhjxpjbcffyabyxbhczbjyclwlczggbtssmdtjcxpthyqtgjjscjfzkjzjqnlzwlslhdzbwjncjzyzsqnycqyrzcjjwybrtwpyftwexcskdzctbxhyzcyyjxzcfbzzmjyxxcdczottbzljwfcgszsxfyrlnyjmbdthjxsqjccsbxyytsyfbjdztgbcnclcyzzbsacyzzscjcshzqydxlbpjllmqxtydzxsqjtzpxlcglqccwjbhctdjjsfxjejjtlbgxsxjmyjjqpfzasyjncydjxkjcdjszcbartcclnjqmwnqnclllkbybzzsyhqcltwlccrshllzntylnewyzyxczxxgdkdmtcedejtsyys?dqdfmsd?jlhrwnqlybglxhlgtgxbqjdzfyjsjyjcjmrnymgrcjczgjmzmgxmmryxkjnymsgmzjymklfxmbdtgfbhcjhkylpfmdxlqjjsmtqgzsjlqdldgjycalcmzcsdjllnxdjffffjczfmzffpfkhkgdpqxktacjdhhzdddrrcfqyjkqccwjdxhwjlyllzgcfcqdsmlzpbjjplsbcjggdckkdezsqsckjgcgkdjtjllzycxklqscgjcltfpcqczgwbjdqsdjjbyjhsjddwgfsjgdkccctllpspkjgqjhzzljplgjgjjthjjyjzcjmlzlyqbgjwmljkxzdznjqsyzmljlljkywxmkjlhskjgbmclyymkxjqlbmclkmdxxkwyxwslmlpsjqjcqxyjfjtjdxmxxllcrqbsyjbgwywxggbcyxpjtgpepfgdjgbhbnsfjyzjkjkhxqfgqzkfhygkhdgllsdjjxpqykybnqsxqnszswhbsxwhxwbzzxdmndjbsbkbbzklylxgwxjjwaqzmywsjqlcjxxjqwjeqxscwetlzhlyyysdzpyqyzcptlshtzcfycyxyljsdcjjagyslcllyyysglrqqeldxzsccccadycjysfsgbfrsszqsbxjpsjwsdrckgjlgdkzjzbdktcsyqpyhstcldjlhmxmcgxyzhjdctmhltxzxylymohyjcltyfbqqjbfbdfehtksqhzywwcnxxcdwhhwgyjlegmdqcwgfjhcsntwydolbygwqwesjpwnmlrydzsztxyqpzgcwxhngpyxshmdqjgztdppbfyhzhhjyfdzwkgkzbldntsxhqeegzxylzmmzyjzgszxkhkhtxexxgylyapsthxdwhzydpxagkydxbhnhxkdfjnmyhylpmgocslnzhkxxlbzzlbmlsfbhhgsgyyggbhscyajtxwlxtzqcwzydqdqmmgdqllszhlsjzwfjhqswscelqazynytlsxthaznkzzsdhlacxtwwcsgqqtddyzbcchyqzflxpslzygpzsznglydqcbdlxjtctajdkywnsyzljhhdzcwnyyzyomhychhhxhjkzwsxhdnxlyscqydpclyzwmypbkxyjlkzhtyhaxqsyshxasmchkdscrswjpwqsgzjlwwschs?hsqnhzsngndaqtbaalzzmsstdqjcjktscjaxplggxhhgoxzcxpdmmhldgtybysjmxhmrcplxjzckzxshflqxccdhxezfchzccdytcjyxqhlxdhypjqxnlsyydzozjnyxqezysjyayjkypdghddxsppyzndlthrhxydpcjjhtcxmctlhbynyhmhzllhnxmylllmdcppxhmxdkycyrdltxjchhznxclcclylnzsxzjzzlnnllwhyqsnjhxynttdkyjpychhyegkcttwlgqrlggtgtygyhpyhylqyqgcwyqkpyyyttttlhyhlltyttsplkyzwgywgpydqqzzdqxskcqnmjjzzbxyqmjrtfbbtkhzkbjdjjkdjjtlbwfzpbtkqtztgpdgntpjyfalqmkgxbcclzfhzclllladpmxdjhlcclgyhdzfgyddgcyyfgydxkssebdhykdkdkhnaxxybfbyyhxcqgabfqyjjdmljcsjzllpchbsxgjyndybyqspqwjlzkcddtaccbkzdyzypjzqsjnkktknjdjgyepgtlfyqkasdntcyhblgdzhbbydmjrygkzyheyybcmcdtyfzjjhgcjplxhldwxjjkytcyksssmtwcttqzlzbszdtwzxgzagyktywxlhlcpbclloqmmzsslcmbjcszzkydczxgqjdsmcytzqqlwzqzxssbpkdfqmddzdsddtdmfhtdyzjaqjqkypbdjyyxtljhdrqxxxhaydhrjlklytwhllrllrcxylbwsrszzsymkzzhhkyhxksmzsyzgcjfbzbsqlfcxxxnxkxwymsddyqwggqmmyhcdzttfgyyhgstttybykjdhkyjbelhdypjqnfxfdqkzhqkzbyjtzbxhfdxbdaswhawajldyjsfhbldnndnqjtjnchxfjsrfwhzfmdrfjyhwzpdjkzyjymfcyznynxfbytfwfwygdbnzzzdnytxzemmqbsqehxfzmbmflzzsrsymjgsxwzjsprydjsjgxhjjgljjynzjjxhgjkymlpeyycsysgqzswhwlyrjlpxslcxmfsmwkcctnxnynpnjszhdzeptxmwywayysywlxjqzqxzdclaeelmcpjpclwbxsqhfwrtffjtnqjhjqdxhwlbyccfjlalkyyjldxhhycstdywncjtxywdrmdrqhwqcmfjdyzmhmayxjwmyzqsxtlmrspwwchajbxtgcypxyyrrclmpamgkqjszyjrmyjsnxtplnbappypylxmyzkynldgyjzczhnlmzhhanqmpgwqtzmxxmllhgdzxyhxkrxycjmffxyhjfsbssqlhxndycannmtcjcyprrnytyqnyymbmsxndlylysljnlqyshqmllyzlzjjjkymzcsfbzxxmstbjgnxyzhlsnmcqscyznfzlxbrnnnylmnrtgzqysatswryhyjzmzdhzgzdwybsscskxsyhytsxgcqgxzzbhyxjscrhmkkbsczjyjymkqhzjfnbhmqhysnjnzybknqmcjgqhwlsnzswxkhljhyybqcbfcdsxdldspfzfskjjzwzxsddxjseeegjscssmgclxxkywyllymwwwgydkzjgggtggsycknjwnjpcxbjjtqtjwdsspjxzxnzxwmelptfsxtllxcljxjjljsxctnswxlehhlyqrwhsycsqrybyaywjejqfwqcqqcjqgxaldbzzyjgkgxpltqyfxjltpadkyqhpmatlcpdhkxmtxybhblefxdleegqdymsawhzmljtwyqxlyjzljeeyxbqqffnlyxrdsctgjgxyylkllxqkcctlhjlqmkkzgcyygllljdzgydhzwxpysjbzkdzgyzzhywyfqytyzszyezklymhjjhtsmqwyzlkyywzcsrkqyqltdxwcdrjklwsqzwbdcqyncjsrszjlkcdcdtlzzzacqqczddxyplxcbqjylzllljddzjgyjyjzyxnyyynxjxkxdazwyrdljyyyrjlglldrxjcykywnqcclddnyyykyckczhjxcclgzqjgjwppcqqjysbzzxyjxjbxjfzbsbdsfnsfpzxhdwztdmpptblzzbzdmyypqjrsdzsqzsqxbdgcpzswdwcsqzgmdhzxmwwfybpdgphtmjthzsmmbgzmbzjcfzhfcbbzmqcfmbcmcjxlgpnjbbxgyhyyjgptzgzmqbqdcgybjxlwzkydpdymgcftpfxyztzxdzxtgkmtybbclbjaskytssqyymscxfjeglsllszbqjjjaklyldlycctsxmcwfgkkbqxlllljyxtyltyxytdpjhnhgnkbyqnfjyyzbyyessessgdyhfhwtcjbsdzjtfdmxhcnjzymqwsrxjdzjqpdqbbsdjggfbkjbxdgjhmgwjjjgdllthzhhyyyyyysxwtyyyccbdbpypzyccztjpzywcbdlfwzcwjdxxhyhlhwczxjtczlcdpxdjczczlyxjjsjbhfxwpywxzptdzzbdccjhjhmlxbqxxbylrddgjrrctttgqsczwmxfytmwzcwjwxjywcskybzqccttqnhxnkxxkhkfhtswoccjybcmpzzyjbnnzpbthhjdlscddytyfjpxyngfxbyqxcbhxcbsxtyzdmzysnxsxlhkmzxlthdhkghxjsshqyhhcjyxglhzxcsnhekdtgqxqypkdhextykcnymyyypkqyytjxzlthhqtbyqhxbmyhsqckwwyllhcyylnneqxqwmcfbdccmljggxdqktlxkgnqcdgzjwyjjlyhhqtttnwchhxcxwheszjydjccdbqcdgdnyxzdhcqrxcbmztqcbxwgqwyybxhmbymykdyecmqkyaqyngyzslfykkqgyssqyshjgjcnxkzycxsbkyxhyylstycxqthysmgscpmmgcccccmtztasmgqzjhklosqylswtmqsyqkdzljqqyplcycztcqqpbbqjzclpkhqcyyxxdtdddsjcxffllchqxmjlwcjcxtspycxndtjshjwxdqqjckxyamylsjhmlalykxcyydmamdqmlmcznnyybzkkyflmchcmlhxrcjjhsylnmtjggzgywjxsrxcwjgjqhqzdqjdzjjzkjkgdzqgjjyjylhzxxcdqhhhestmhlfsbdjsyyshfyssczqlpbdrfrztzdkykgsctgkwdqzrkmsynbcrxqbjyfaxpzzedzcjykbcjwhyjbqdzywnyszptdkzpfpbaztklqyhbbzpnbptyzzybhnydcpjmmcycqmcjfzzdcmnlfpbplngqjtbttajzpzbbdnjkljqylnbzqhksjznggqsczkyxchpzsnbcgzkddzqanzgjkdntlzldwjljzlywtxndjzjhxyatncbgtzcsskmnjpjytsrwxcfjwjjtkhtzplbhsnjzsyjbwbzyzlstlsbjhdwwqpslmmfbjdwajyzccjtbnnrzwqxcdslqgdsdpdzhjtqqpsqlyyjzlgyhszlctcbjtktyczjtqkbpjlgmjzdmcsgpynjzjjyyknhrpwszxmtncszzyxybyhyzaxywkcjtllckjjtjhgcxdxyqyczbywblwqcglzgjgqrqcczssbcrbcskydznljsqgxssjmecnstztpbdlthzwhqwqtzexnqczgweskssbybstscsjccgbfsdqszlccglllzghzcthcnmjgyzaznmckcstjmmzckbjygqljyjppldxrgzyxccsnhshgdznlzhzjjcddcbcjflbfqbczzwpqdnhxljcthqwjgylnlszzpcjdscqqhjqkdxkpbajyemsmjtzdxlcjyryynwjbngzzkmjxltbsllrtpylcsznxjhllhyllqqzqlxymrcwcxsljmczltzldwdjjllnzggqxppskygyggbfzpdkmwghcxmcgdxjmcjsdycabxjdlnbcddygskydjtxdjjyxmsaqazdzfslqxyjsjzylblxxwxqqzbjzlfbblylwdsljhxjyzjwtdjcyfqzqzzdcsxzzqlzcdzfchyspympqzmlpplffxjjnzzylsjyyqzfpfzksywjjjhrdjzzxtxxglghtdxcskyswmmtcwybazbjkshfhgcxmhfqhyxxyzftsjyzbxyxpzlchmzmbxhzzssyfdmncwdabazlxktcshhxkxjjzjsthygxsxyyhhhjwxkzxcsbzzwwhhcwtzzzpjxsnxqqjgzyzawllcwxzfxgyxyhxmkyyswsqmnjnaycyspmjkgwcqhylajjmzxhmmcnzhbhxclxtjpltxyjhdyylttxfszhyxxsjbjyayrsmxyplckdlyhlxrlnllstyzyyqygyhhsccsmcctzcxhyqfpyyrpfflfqtntszllzmhwtcjqyzwtllmlmdwmbzssmzrbpdddlgjjbxccsrzqqygwcsxfwzlxccrbtdzmcyggdlqsgtjmwljmymmsyhfbjdgyxccpshxczcsbsjwjgjmpbwaffyfnxhydxzylremzgzcyhsszdlljcsqfzxxkptxzgxjjgbmyyysnbdylbnlhbfzdcyfbmgqrrmsszxysgtznnydzzcdgbjafjbdknzblcsscpsgzycjszlmlrzzbzzldlsllysxsqzqlyxzlsgkbrxbrbzcycxzjzeeyfgklzlyyhgysgzlfjhgtgwkraajyzkzqtsshjjxdzyz?yjlzyrzdqqhgjzxsszbtkjpbfrtjxllfqwjgslqtymblpzdxtzagbdhzzrbgjhwnjtjxlhscfsmwlldqysjtxkzscfwjlbxftzlljzllqblcqmqqcgcdfpbbhzczjlpyygjdtgwdcfczqyyyqysrclqzfklzzzgffsqnwglhjycjjczlqzcyjbjzzbpdccmhjgxdqdgdlzqmfgpsytsdyfwwdjzjysxyycjcyhzwpbyhxrylybhkjksfxtzjmmchhlltnyymsxxyzpyjjycdyzwmtjjkqyrhllqxpsgtlwycljscbxjyzfnmlrgjjtyzbsyzmsjyjhgfzqmsyxrszcwtlrtqzsstkxgqggsptgcdnjsgcqcqhmxggztqydjkzdlbzsxjlhyqgggthqscpyhjhhgnygkggcmjdzllcclxqsftgzslllmlcskctbljzzszmmnytpzsxqhjcjyqxyexzqzcpshkzzysxcdfgmwqrllqxrfztlysdctmjcsjjdhjnxtnrztzfqrhqgllgcxszsjdjljcytsjtlnyxhszxcgjzyqpylfhdjsbpcczgjjjqzjqdybssllcmyttmqtbhjqnnygkynqyqmzgcjkpdcgmyzhqllsllclmholzgdylfzsljcqzlylzcjeshnylljxgjxlyjyyyxnbcljsswcqqcjyllcldjyllzllbnylgqchxyyqoxccqkyjxxhyklksxayqccqkkkkcsgyxxyqxygwtjohthxpxxcsshcyeychzzcbwqbbwjqcscszsslzylgdesjzmmymcytsdsxxscjpqqsqylyfzychdjdzywcbtjsydjhcyddjlbdjjsodzyqysqkxxdhhgqjyohdyxwgmmmajdybbbppbcmhcpljzsmtxerxjmhqdstpjdcbssmsssthjtslmmtrcplzszmlqdsdmjmqpnqdxcfynbfsdqqyxhyaykqyddlqyyysszbydslntfgtzqbzmchdhczcwfdxtmqqsphqwwxsrgjcwtjtzzqmgwjjrjhtqjbbgwzfxjhnqfxxqywyyhyscdydhhqmnmdmmcpbszppzzglmzfollcfwhmmsjzttthlmyffytzzgzyskjjxqyjzqphmbzzlyghgfmshpcfzsnclpbqsnjszslxjfpmtyjygbxlldlxpzjypjyhhzcywhjylsjexfsszywxkzjlladtmlymqjpwxxhxsktqjezrpxxzghmhwqpwqlyjjqjjzszcfhjlchhnxjlqwzjhbmzyxbdhhypylhlhlgfwlcfyytlhjjcjmscpxstkpnhjxsntyxxtestjctlsslstdlllwwyhdhrjzsfgxssyczykwhtdhwjslhtzdqdjzxxqggyltzphcsqfzlnjtclzpfstpdynylgmjllycqhynsbchylhqyqtmzybbywrfqykjsyslzdyjmpxyyssrhzjnyqtqdfzbwwdwwrxcwhgyhxmkmyyyhmsmzhngcepmlqqmtcwctmhmxjpjjhfxyyzsjzhtybmstsyjdtjjqytlhynbyqzlcxcnzwsmylkfjxlwgbypjytysylymzckttwlgsmzsylmpwlzwxwqzssaqsyxyrhssntsrapccpwcmgdhhxzdzxfjhgzttsbjhgyglzysmyclllybtyxhbbzjkssdmalhhycfygmqypjycqxjllljgclzgqlycjcctotyxmtmshllwcgfxymzmklpszzzxhhjyslctyjcyhxsgyxzkxlzwpyjpdhjwpjpwsqqxlxxdhmrslzcyzwstcxkystzshbsccstplwsscjchjlcgchssphylhfhhxjsxyllnylmzdhzxylsxlwzyhcldyahzcmddyspjtqjzlngjfsjshctsdszlblmssmnyymjqbjhrcwtyydchqljapzwbgqybkfcmjwlzllyylszydwhxpsbcmljpscgbhxlqhyrljxyswxhxzlldfhlslymjljyflyjycdrjlfsyzfsllcqyqfgjyhyszlylmstdjcyhbzllnwlxxygyyhbmgdhxxhhlzzjzxczzzcyqzfnjwpylcpkpykpmclgkdgxzggwqbdxzzkzfbxxlzxjtpjpttbytszzdwslchzhsltjxhqlhyxxxywzyswtmzkhlxzxzpyhgchkjfsyh?tjrlxfjxptztwhplyxfcrhxshxkjxxyhzjdxjwylhyhmjdbflkhtxcwhcfwjcfpqrxqxcyyyjygrpxgscsxngwchkzdxhflxxhjjbyzwtsxnncyjjymswzjqrmhxzwfqsylzjzgbhynslbgttcsebhxxwxyhhxyxnsqyxmlywrgyqlxbbcljsylpsytjzyhyzawlhorjmksczjxxxyxchcytryxqjddsjfslyltsffyxlmtyjmjjyyyxltzcsxqzlhzxlwyxzhdnlrxhxjcdyhlbrlmbrllaxksllljlyxxlycrylcjcgjcmtlzllcyzzpzpcyawhjjfybdyyzsepckzdqyqpbpcjpdcyzbdbbcyydycnnpjmtmlrmfmmgwygbsjgygsmdqqqztxmkqwgxllpjgzbqcdjjjfpkjkcxbljmswmdtqjxldlppbxcwkcqqbfqjczagzgmykbhyyhzykndkzmbpjyspxthlfpnyygxjdbkxnhhjhzjxstrstldxskzysybmxjlxyslbzyslhxjpfxbqnbylljqkygzmcyzzymccsldlhzgwfwyxzmwcxtynxjhbyymcysbmhysmydyshqyzchmjjmzcaahcbjbbhplxtylsxsdjgjdhkxxtxxnbhnmlngsltxmrhnlxqjxmzllyswqgdlbjhdcgjyqycmhwfwjybbbyjmjwjmdpwhxqldyapdfxxbcgjspckrssyzjmslbzzjfljjjlgxzgyxyxlszqyxbexyxhgcxbpldyhwecdwwcjmbtxchxyqxllxflyxlljlssfwdpzsmyjclmswtczbchqekcqbwlcgydblqppqzqfjqdjhymmcxtxdrmjwrhxcjzclqxdyynhyyhrslsrsywwzjymtltllgzqcjzyabsckzcjyccqljsqxalmzyyywlwdxzxqdllqshgpjfjljhjabcqzdjgthhsstcyjlbswzlxzxrwgldlzrlzqtgsllllzlymxqgdzhgbdbhzpbrlw?xqbpfdwo??whlypcbjcc?dmbzpbzz?cyqxldomzblzwpdwyygdstthcsqsccrsssyslfybfntyjszdfndpthtzzmbblxlcmyffgtjjqwftmdpjwdnlbzcmmctgbdzlqlpyfhsymjylsdchdzjwjcctljcldtljjcpddpjdsszynndbjlggjzxsxnlycybjjqxcbylzcfzppgkcxzdzfztjjfjsjxzbnzyjqttyjwhtyczhymdjxttmpxsflzcdwslshxybzgtfmlcjtacbbmgdewycyzcdszcyhflyctygwhkjyylsjcxgywjcbhlcsnddbtzbsclyzczzssqdllmqyyhfllqllxfdyhabxggnywyypllsdldllbjcyxjzmlhljdxyyqytdlllbbgbfdfbbqjzzmdpjhgclgmjjpgaehhbwcqxaxhhhzchxyphjaxhlphjpgpzjqcqzgjjzzgzdmqyybzzphyhybwhazyjhykfgdpfqsdlzmljxjpgalxzdaglmdgxmwzqytxdxxpfdmmssympfmdmmkxksyzyshdzkjsysmmzzzmsydnzzczxbmlstmddnmxckjmztyymzmzzmsshhdccjemxxkljstgwlsqlyjzllsjssdbpmhnlyjczyhmxxhgzcjmdhxtkgrmxfwmckmwkdcksxqmmmfzzydkmsclcmpcgmwrpxqpzdsslcxkyxtmlgjyahzjgzqmcsnxyhmmpmlkjxmhlmlgmxctkzmjjyszjsyszhsyjzjcdajzybsdqjzgwzkgxfkdmsdjlfmehkzqkjbeypzyszcdwyjffmzjykttdzzefmzlbnpplplpbpszalltylkckqzkgenqlwagxxydpxlhsxqqwqykxqclhyxxmlyccwlymqyskychlcjnszkpyzkcqzqljbdmdjhlasqlbydwqlwdnbqcrydddtjybkbwszdxdtnpjdtctqdfxqqmgnseclstbhpwslctxxlpwydzklzygzcqapllkccylbqmqczqcljslqzdjxldthpzqdljjxzqdjyzhkzljcyqdyjppypeakjyrmpcbymcxkllzllfqpylllmbsglcysslrsysqtmxyxqqzbdzrysyztffmzzsmzqhzssccmlyxwtpzgxzjgzgsjsgkddhtqggzllbjdzlcbzhyxyzhzfywxyzymsdbzzyjgtsmtfxqyxjscdgslnmdlrytzlryylxqhtxsrtzcgyxbnqqzfhykmzjbzymkbpnlyzpblmcnqyzzzsjzhjctzhhyzzjrdyzhnfxglfxslkgjtctssyllgzrzbbjzzklpkbczyslxyxbjfpnjzzxcdwxzyjxzzdjjgggrsrjkmcmzjlsjywqshyhqjsxpjzzzlsnshrnypjtwchklbsrzlcxwjqxqkysjycztlqzybbybwzjqdwgyzcytjcjxckcwdkkzxsgkdzxwwyyjqyytcytdjlxwkczkklcclzcqqdzlqlcsfqchqhsfsmqzzllbjjzbsjhtsjdysjqjpdlzcdcwjkjzzlpycgmzwdjjbsjqzsyzyhhxcbbjydssddzncglqmbtsfcbfdzdlznfgfjgfsmptjqlmblgqcyyxbqkdxjqsrfkztjdhczklbsdzcfytplljgjhtxzcsszzxstcygkgckgyoqxjplzbbbgtgyjdgczqszlbjlsjfzgkqqjcgyczbzqtldxrjxbsxxpzxhyzyclwdsjjhxmfczpfzhqhqmqgkslyhtycgfrzgnqxclpdlbzcsczqlljblhbdcypczppdymtzsgyhckcpzjgslclnscdsldzxbmsdlddfjmkdjdhslzxlszqpqpgjllybdszgqlbzlslkyyhzttncjyqtzzfszqztlljtyyllqllqyzqlbdzlslyyzymdfszsnhlxznczqzbbwskrfbcyzmthblgjpmczzcstlxshtzcyzlzblfeqhlxflcjlyljqcbzlzjghsstbrmhxzhjzclxfnbgxgtqjcztmsfzkjmssnxljkbhszxntnlzdntlmsjxgzjyjczxyhyhwrwwqnztnfjscpzshzjfyrdjsfscjzbjfzqzchzlxfxsbzqlzsgyftzdcszxzjbqmszkjrhxjzcgbjkhchgtjkjqglxbxfgdrtylxjxgdtsjxhjzjjcmzlcqsbtxhqgxttxhxftsdkfjhzyjfjxrzcdlllcqsqqzqwqxswqtwgwbzcgcllqzbclmqqtzgzxzxljfrmyzflxysqxxjkxrmjdcdmmyxbsqbhgcmwfwtgmxlzbyytgzyccdxyzxswgxyjyznbgpzjcqsyxcxrtfycgrhztxszzthcbfclsyxzljqmzlmplmxzjssflbysmyqhxjsxrxsqzzzsslyflczjrcrxhhzxqydshxsjjhzcxjbdynsysxjbqlpxzqpymlxzkyxlxcjlcycrxzzlldlllsjyhzxgyjwkjrwyhcpsgnrzlfzwfzznsxgxflzsxzzzbfcsyjdbrjkrdhhgxjljjtgxjxxstjtjxlyxqfcsgswmsbctlqzzwlzzkxjmltmjyhsddbxgzhdlbmyjfrzfcgclyjbpmlysmsxlszjqqhjzfxgfqfqbpxzgyyqxgztcqwyltlgwwgwhllfsfgzjmgmgbgtjfsyzzgzyzaflsspmlbflcwbjzcljjmzlpjjlymqdmyyyfbgygqzglyzdxqyxrqqqhsxyyqqygjtyxfsfsllgnqcygycwfhcccfxbylypllzqxxxxxkqhhxshjdcfdsczjxcpzwhhhhhapylhalpqafyhxdyllkmzqgggddesrnndltzgchybpysqjjhclljtolnjpzljlhymheydydsqycddhgzpndzclzywllznteytgxlhslpjjbdgwxpcdntjcklkclwkllcasstknzdnqnttlyyzssysszzryljqkcgbhhcrxrzydgrgcwcgzhfffppjfzynakrgywyqpqxxfkjtszzxswzddfbbqtbgtzfznpzfpzxzpjszbmqhkcyxyldkljnypkyghgdcjxxeahpnzgctzcmxcxmmjxnkszqnmnlwbwwxjjyhclstmcsqdjcxxtpcnpdtnnpglllzcjlspblplkcdtnjnlyyrscffjfqwdpgzdwmnzcclodaxnssnyzrestyjwjyjdbcfxnmwttbqlwstszgybljpxglboclgpcbjftmxzljylzxcltpnclcgxtfzjshcrxsfyszdkntlbyjcyjllstgqcbxnwzxbxklylhzlqzlnzcqwgzlgzjncjgcmnzzgjdzxtzjxycyycxxjyyxjjxsssjstssttppghtcsxwzdcsyfptfbchfbblzjclzzdbxgcxlqpxkfzflsyltywbmnjhskbmddbcysccldxycddqlyjjhmqllcsgljjsyfpyyccyltjantjjpwycmmgqyysqdhqmzhszxpftwwzqswqrfkjlxjqqyfbrxjhhfwjgzyqacmyfrhcyybyqwlpexcczstyrltsdmqlykmbbgmyyjprknnbbsxyxbhyzdjdnghpmfsgbwfzmfjmmbcmzzcjjlcnyxyqgmlrygqccyhzlwjgcjcggmcjjfyzzjhycfrrcmtzqzxhfqgdjxccjeaqcrjthpljlszdjrbcqhjdzrhxlyxjsymhzydwldfryhbbydtssccwbxglpzmlzztqsscpjmmxjcsjytycghycjwsnsxlfemwjnmkllswtxhyyygcmmcwjdqdjzglljwjnkhpzggflccsczmcbltbhbqjxqdjpdjqtghglfqawbzyjjltstdhqhctcbchflqmpwdshyytqwcnztjtlbypbpdyyyxsqkxwyyflxxncwcxybmaelykkjmzzzbrxyaqjfljpfhhhytzzxrgqqmhspgdzjwbwpjhzjdyscqwzkthxsqlzyymysdzgrxckkhjlwpysyscsyzlrmlqsyljxbcxtlhdqzpcycykpppnsxfyzjjrcemhszmsxlxglrwgcstlrsxbygbzgztcpldjlslylymdtmtcpalcxpqjcjwtcyyzlblxbzlqmyljbghdslssdmxmbdczsxwhamlczcpjmcnhjyjnsygchskqmzzqdllkablwjqsfmocdxjrrlyqchjmybyqlrhetfjzfrfksryxfjdwdsxxlwsqjyslyxwjhsnlxyyxhbhawhhjcxwmyljcsqlkydttxbzsxfdxgxsjhhsxxybssxdpwncmrptjzczenygcxqfjxkjbdmljcmqqxloxslyxxlylljdzbtymhbfsttqqwlhogyblscalzxqlhtwrrqhlstmypyxjjxmqsjpnbryxyjllyqylthylqyfmhkljdmllhfzwkzhljmlhljkljstlqxylmbhhlnlsxqchxcfxxlhyhjjgbyzzkbxscqdjqdsxjzsyhzhhmgsxcsymxfebcqwwrbpyyjqtyqcyjhqqzyhmwffhgzfrjfcdbxndqyzpcyhhjlfrzgppxzdbbgzqstlgdgylcqmgchhmfywlzyxkjlypqhsywmqqgqzmlzjnsqxjqsyjtcbehsxfssfxzwfllbcyyjdytdthwzsfjmqqyjlmqsxlldttkhhybfpwdyysqqrnqwlgwdebdwcyygcdlkjxtmxmyjsxhybrwfymwfrxyqmxysctzztfykmldhqdlwyqnlcryjblpsxcxywlsbrrjwxhqybhtydnhhgmmywytzcsqmtssccdalwztcpqpyjllqzyjswxwzzmmglmxclmxczmxmzsqtzppjqblpgxjzhfljjhycjsnxwcxsccdlxsyjdcqcxslqyclzxlzzxmxqrjmhrhzjphmfljlmlclqnldxzlllfypngjysxcqqdcmqjzzxhnpnxzmekmxxykyqlxsxtxjxyhwdcwdzhqyybgybcyscfgfsjnzdyzzjzxrzrqjjymcanhrjtldbpyzbstjhxxzypbdwfgzzrpymtngxzqbyxmbbfcckrjjjbjegrzgyclkxzdxkknsjkcljspgyyzlqqjybzssqlllkjfcbktylcccdblsppfylgydtzjyqggkqttfcxbdkdxxhybbfytyhbclpdytgdhryrnjsbtcsnyjqhklllzslydxxwbcjqsbxbfjzjcjdzfbxxbrmlazgcsnclbjdstblfrzdswsbxbcllxxlzdjzsjpylyxxyftfffbhjjjgbygjpmmmmsscljmtlyzjxswxtyledqpjmygqzjgdjlqjwjqllsdgjgygmscljjxdtygjqjqjcjzcjgdzdshqgsjggcjhqxsnjlzzbxhsgzxcxyljxyxyydfqqjhjfxdhctxjyrxysqtjxyefyyssyxjxncyzxfxcsyszxyyschshxzzzgzzzgfjdldylnpzgyjyzyyqzpbxqbdztzczyxxyhhscxshcggqhjhgxwsztmzmehyxgebtylzkkwytjzrclekestdbcykqqsayxcjxwwgsbhjszsdhcsjkqcxswxfctynydpzcczjqtzwjqdzzzqzljchlsbhpydxpsxshhezdxfptjqyzzxhyaxncfzyyhxgnqmywxtzsjpkhhgymxmxqcxtsbcqsjyxhtyylybcqlmmszmjzjllcogxzaajzyhjmchhcxzsxzdznleyjjzjbhzwzzsqtzpsxztdsxjjjznyazphhyysrnqdthzhayjyjhdzxzlswclybzyecwcycrylcxnhzydzydyjdfrjjhtrsqtxyxjrjhojynxelxsfsfjzghpzsxzszdzcqzbyyklsgsjhczshdgqgxyzgxchxzjwyqwgyhksseqzzndzfkwyssdclzstsymcdhjxxyweyxczaydmpxmdsxybsqmjmzjmtzqlpjyqzcgqhxjhhhxxhlhdldjqsldwbsxfzzyyschtytyjbhecxhjkgjfxbhyzjfxbwhbdzfyzbcapnpgnydmsxhkhhmamlnbyjtmpxyjmcthjbzyfcgtyhwphftgzzezsbzegpbmdskftycmhbllhgpzjxzjgzjyxzsbbqsczzlzccstpgxmjsftcczjzdjxcybzlfcjsyzfgszlybcwzzbyzdzypswyjgxzbdsysxlgzbzfygczxbzhzftpbgzgejbstgkdmfhyzzjhzllzzgjqzlsfdjsscbzgpdlfzfzszyzyzsygcxsntxchczxtzzljfzgqsqyxzjqccccdjcdxzjyqjccgxztdlgscxzsyjjqtcclqdqztqchqqjztezzzpbkkdjfcjfztybqyqttynlmbdktjcpqzjdzfpjsbnjlgyjdxjdzqkzgqkxclpzjtcjdqbxdjjjstcjnxbxcmslyjcqmtjqwwcjjnjnlllhjcwqtbzqyczczpzzdzyddcyzdzccjgtjfzdprntctjdcqtqndtjnplzbcllctdsxkjzqdpzlbznbtjdcxfczdbccjjltqjpldcgzdbbzjcqdcjwynllzlzccdwllxwzlxrsntqjccxkjlsgdfqtddglrlajjtklymkqlldzytdyycygjwyxdxfrskstcdenqmrkqzhhqkdldazfkypbggpzrebzzykyzspegjjglkqzzzslysywyzwfqznlzzlzhwcgkypqgnpgblplrrjyxcccgyhsfzfwbzywtgzxyljczwhxzjzblfflgskhyjzeyjhlpllllcygxdrzelrhgklzzyhzlyqszzjzqljzflnbhgwlczcfjwspyxnlzlxgccpzbllcxbbbbxbbcbbcrnncccyrbbsyldcgqyyqxygmqzwtzydyjhyfwdehzdjywlccntzyjjcdedpzdztstqjhdymbjnyjzlxtsstphndjxxbyxqtzqddtjtdyztgwscszqflshlglbcjbhdlyzjyckwtydylbnydsdsycctyszyyebgexhqddwnygyclxtdcystqmygzasccszzddlcclzrqxyyeljsbymxshztembbllyyllytdqyshymrqxkfkbfxnxsbychxbwjyhtqbpbsbwdzylkgzskyghqzjhhxjxgnljkzlyycdxlfwfghljgjybxblybxqpqgztzplncybxdjyqydymrbesjyyhkxxstmxrczzywxyhybmcflyzhqyzmqxdbxbzwzmslpdmyckfmzklzcyjycclhxfzlydqzpzygyjyzmzxdzfyfyttqtchgspczmlccytzxjcytjmkslpzhysnwllytpzctzzcktxdhxxtqcypksmqccyyazhtjpcylzlyjbjxtfnyljyynrxcylmmnxjsmybcsysslzylljjgyldzdpqbfzzblfndsqkczfhhhgqmrdsxycstxnqqjpyjbfcxdyqfbnxejdgyqbsrcnfyyqpghyjdyzxgrhtkyleqdzntsmgklbsgbpyszbytjzsszjcssxzbhbscsbzczptqfzmqflypybbjgszmxxdjmthyskkbjtxhjcegbsmjyjzcxtmljyxrzzqscxxqptzxmkyxxxjcljprmyygadyskqlsadhrskqxzxztcghztlmlwxybwsycdbhjhcfcwzsxhytkzlxqshlyczjxemplprcgltbzztlzjcyjgdtclglpllqpjmzpapxyzlaktkdnczzbnzctdqqzjyjgmctxltgcszlmlhbglkfwnwzhdxphlfmkydlgxdtwzfrjejctzhydxykshwfzcqshktmqqhtchymjdjskhxzjzbzzxympajqmsdbxlsklyynwrtsqlscbpdbsgzwyhtlkssswhzzlyytnxjgmjszsxfwnlsoztxgxlsammlbwldszylakqcqctmycfjbslxclzjclxxksbzqclhjphqplsxsckslnhpsfqqytxjjzlqldxzjjzdyydjnzptfcdskjfsljhylzqjzlbthydgdjfdbyazxdzhzjnhhqbyknxjjqczmlljzkspldsclbblxklelxjlbjycxjxgcnlcqplzlznjtzljgyzdzpltqcssfdmnycxgbtjdcznbgbqyqjwgkfhtnbyqzqgbkpbbyzmtjdytblsqmbsxtbnpdxklemyycjynzdtldykzzxddxhqshdgmzsjycctayrzlpwltlkxslzcggexclfxlkjrtlqjaqzncmbqdkkcxglczjzxjhptdjjmzqykqsecqzdshhadmlzfmmzbgntjnnlgbyjbrbtmlbyjdzxlcjlpldlpcqdhlhzlycblcxzcjadqlmzmmsshmybhbskkbhrsxxjmxsdznzpxlbbragggfchgmsklltsjyycqlcskywyehywhbhqywbawykqldqftntkhqcgdqktgpkxhcpdhtwtmssyhbwcrwxhjmkmzngwtmlkfghkjyldyycxwhyeclqhkqhtdqhhffldxqwgzyydesbpkyrzpjfyyzjceqdzzdlattbbfjllcxdlmjsdxegygsjqxcfbxsszpdyzcxdnyxpfzydlyjccpltxlsxyzyrxcyysdylwwndsahjsygyhgywkaxtjzdaxysrltdjssaxfnejdxyzhlxlllzhzsjnyqyqqxyjghzgjcyjchzlycdshwsgczyjxcllnxzjjyyxnfsmwfpylcyllabwddhwdxjmcxztzpmlqzhsfhzynztlldywlslxhymmylmbwwkyxyadtxylldjpybpwfxjmmmllhafdllaflbhhhbqqjtzjcqjjdjtffkmmmbythygdcqrddwrqjxnbysnmzdbyytbjhpybygtjxaahgqdqtmystqxkbtsbkjlxrbeqqhqmjjbdjwtgtbxpgbktlgqxjjjcdhxqdwjlwrfmqgwqhckryswgbtgygbwsdwdwrfhwytjjxxxjyzyslphyypayxhydqkxshxyxeskqhywbdddpplcjlhqeewxksyyhdyplfjthkjltcyyhhjttpltzzcdlthqkcxqysteeywkyzyxxyysddjkllpwmcyhqgxyhcrmbxpllnqydqhxsxxwgdqbshyllpjjjthyjkyphthyyktyezyenmdshlcrpqfbgfxzbsbtlgxsjbswyysksflxlpplbbblbsfxfyzbsjssylpbbffffsscjdstzsxtryjcyffsytyzbjtbctsbsdhrtjjbytcxyjeylxcbnebjdsysyhgsjzbxbytfzwgenyhhthjhatfwgcstbgxklstywmtmbyxjskzscdyjrcytwxzfhmymcxlznsdjtttxrycfyjsbsdyerxhljxbbdeynjghxgckgscymblxjmsznskgxfbnbbthfjaafxyxfpxmyfhdtzcxzzpxrsywzdlybbjtyqwqjpzypzjznjpzjlztfysbttslmptzrtdxqsjehbzylzdhljsqmlhtxtjecxalzzspktlzkqqyfsygywpcpqfhqhytqxzkrsgtgsqczlptxcdyyzssqzslxlzmacbcqbzyxhbsxlzdltcdjtylzjyytpzylltxjsjxhlbmytxcqrblzssfjzztnjydxmyjhlhpblcyxqjqqkzzscpzkswalqsblcczjsxgwwwygyatjbbctdkhqhkgtgpbkqyslbxbbckbmllxdzstbklggqkqlsbkkdfxrmdkbftpzfrtbbmferqgxkjpzsstlbzdpszqzsjthljqlzbpmsmmsxlqqnhknblrddnhxdhddjcyygyfqgzlgsygmjqgkhbpmxyxlytqwlwgcpbmjxcyzydrjbhtdjxeeshtmjsbyplwhlzffnypmhxqhpltbqpfbcwjdbygpnxtbfzjgsddtjshxeawzzyllttybwjkgxghlfkxdjtmszsqynzggswqsphtlsskmclzxyszqzxncjdqgzdlfnykljcjllzlmzznhydsshthxzlzzbbhqzwwycrdhlyqqjbeyfsgxthsrxwqhwfslmssgzttyeyqqwrslalhmjtqjsmxqbjjzjxzyzkxbyqxbjxshzssfglxmxzxfghkzszggylclsarjxhslllmzxelglxydjytlfbhbpnlyzfbbhptgjkwetzhkjjxzxxglljlstgshjjyqlqzfkcgnndjsszfdbctwwseqfhqjbsaqtgypjlbxbmmywxgslzhglzgnyfljbyfdjfrgsfmbyzhqfbwjsyfyjjphzbyyzffwodgrlmftmlbzgycqxcdjygzyyyytytydwegazyhxjlzythlrmgrjxzclhneljjthtbwjybjjbxjjtjteekhwsljplpsfazpqqbdlqjjtyyqlyzkdksqjyyjzldqcgjjyzjsycmraqthtejmfctyhypkmhycwjdcfhyyxwshctxrljgjshccyyyjltkttytmxgtcjtzayyoczlylbszywjytsjyhbyshfjlygjxxtmzyyltxxypclxyjzyzyypnhmymdyylblhlsyygqllnjjymsoycbzgdlyxylcqyxtszegxhzglhwbljgeyxtwqmakbpqcgyshhegqcmwyywljyjhyyzlljjylhzyhmgsljljxcjjyclycjpcpzjzjmmylcjlnqljjjlxxjmlszljqlycmmhcfmmfpqqmfxlqmcffqmmmmhmznfhhjgtthhkhslnchhyqdxtmmqdcydyxyqmyqylddcyyydazdcymzydlzfffmmycqcwzzmabtbyctdmndzggdftypcgqyttssffwbdtzqssystwjjhjytsxxylbyqhwwhxezxwznnqzjzjjqjccchyyxbzxccyjtllcqxknjycyycynzzqyyoewyczdcjycchyjlbtzkycqwlpgpyllgkdldlgkgqbgychjxy';
  function initialsOf(text){
    var out='',i,code,ch;
    text=String(text||'');
    for(i=0;i<text.length;i++){
      code=text.charCodeAt(i);
      if(code>=0x4E00&&code<=0x9FA5){ ch=PINYIN_INITIALS.charAt(code-0x4E00); if(ch&&ch!=='?')out+=ch; }
      else { ch=text.charAt(i).toLowerCase(); if(/[a-z0-9]/.test(ch))out+=ch; }
    }
    return out;
  }
  function rankSuggestions(query,candidates){
    var q=String(query||'').toLowerCase(),out=[],seen={},i,c,low,ini;
    if(!q)return out;
    function push(c){ var k=String(c).toLowerCase(); if(!seen[k]){seen[k]=true;out.push(c);} }
    for(i=0;i<(candidates||[]).length;i++){ c=candidates[i]; if(typeof c!=='string'||!c)continue; low=c.toLowerCase(); if(low.indexOf(q)===0)push(c); }
    for(i=0;i<(candidates||[]).length;i++){ c=candidates[i]; if(typeof c!=='string'||!c)continue; low=c.toLowerCase(); if(low.indexOf(q)>=0)push(c); }
    if(/^[a-z0-9]+$/.test(q)){
      for(i=0;i<(candidates||[]).length;i++){ c=candidates[i]; if(typeof c!=='string'||!c)continue; ini=initialsOf(c); if(ini&&ini.indexOf(q)===0)push(c); }
      for(i=0;i<(candidates||[]).length;i++){ c=candidates[i]; if(typeof c!=='string'||!c)continue; ini=initialsOf(c); if(ini&&ini.indexOf(q)>=0)push(c); }
    }
    return out.slice(0,8);
  }
  function defaultSearchScope(sourceOrder,providerKeys){
    var self=(Array.isArray(sourceOrder)?sourceOrder:[]).filter(function(s){return s==='pan';});
    if(!self.length)self=['pan'];
    return {self:self,ref:(Array.isArray(providerKeys)?providerKeys.slice():[])};
  }
  function priorityDiskOrder(displayDisks,diskOrder){
    var out=[],seen={},i,k;
    (Array.isArray(displayDisks)?displayDisks:[]).forEach(function(t){ if(t&&disks[t]&&!seen[t]){seen[t]=true;out.push(t);} });
    (Array.isArray(diskOrder)?diskOrder:[]).forEach(function(t){ if(t&&disks[t]&&!seen[t]){seen[t]=true;out.push(t);} });
    Object.keys(disks).forEach(function(t){ if(!seen[t]){seen[t]=true;out.push(t);} });
    return out;
  }
  function sortByDisk(rows,order){
    var list=Array.isArray(order)?order:[];
    function rank(t){ var i=list.indexOf(t); return i<0?999:i; }
    return (rows||[]).map(function(r,i){ return {r:r,i:i}; }).sort(function(a,b){ var d=rank(a.r.type)-rank(b.r.type); return d!==0?d:a.i-b.i; }).map(function(x){ return x.r; });
  }
  function tmdbSearchUrl(key,title,year){
    var u='https://api.tmdb.org/3/search/multi?api_key='+encodeURIComponent(String(key||''))+'&query='+encodeURIComponent(String(title||''))+'&language=zh-CN&include_adult=false';
    if(year)u+='&year='+encodeURIComponent(String(year));
    return u;
  }
  function tmdbBackdropUrl(path,size){ return path ? 'https://image.tmdb.org/t/p/'+(size||'original')+path : ''; }
  function qualityBadges(title){
    var t=String(title||''),out=[];
    if(/(杜比全景声|atmos)/i.test(t))out.push('杜比全景声');
    else if(/(杜比|dovi|dolby vision|\bDV\b|dolby)/i.test(t))out.push('杜比视界');
    if(/臻彩/i.test(t))out.push('臻彩');
    if(/HDR10/i.test(t))out.push('HDR10');
    else if(/HDR/i.test(t))out.push('HDR');
    else if(/SDR/i.test(t))out.push('SDR');
    else if(/EDR/i.test(t))out.push('EDR');
    if(/(蓝光|原盘|bluray|blu-ray|remux)/i.test(t))out.push('蓝光');
    if(/WEB-DL/i.test(t))out.push('WEB-DL');
    if(/WEBRip/i.test(t))out.push('WEBRip');
    if(/(60帧|60\s*hz)/i.test(t))out.push('60帧');
    if(/高码/i.test(t))out.push('高码');
    if(/(hevc|h\.?265|x265)/i.test(t))out.push('HEVC');
    if(/(4K|2160)/i.test(t))out.push('4K');
    else if(/1080/i.test(t))out.push('1080P');
    else if(/720/i.test(t))out.push('720P');
    return out;
  }
  function tmdbImagesUrl(key,mediaType,id){
    if(!key||!id||(mediaType!=='movie'&&mediaType!=='tv'))return '';
    return 'https://api.tmdb.org/3/'+mediaType+'/'+encodeURIComponent(id)+'/images?api_key='+encodeURIComponent(key);
  }
  function healthRank(state){
    if(state==='ok')return 0;
    if(state==='locked')return 1;
    if(state===''||state==='idle'||state==='pending')return 2;
    if(state==='bad')return 4;
    return 3;
  }
  function panPublicErrorKind(status,ms){
    if(ms>=29000)return 'timeout';
    if(status===400||status===403||status===429)return 'http-'+status;
    return 'failed';
  }
  function resRank(title){
    var b=qualityBadges(title||'');
    if(b.indexOf('4K')>=0)return 0;
    if(b.indexOf('1080P')>=0)return 1;
    if(b.indexOf('720P')>=0)return 2;
    return 3;
  }
  function rowOrder(a,b){
    var d=healthRank(a.check||'')-healthRank(b.check||'');
    if(d)return d;
    d=resRank(a.title||'')-resRank(b.title||'');
    if(d)return d;
    return (a.seq||0)-(b.seq||0);
  }
  function tmdbPickTitle(results,title,year){
    if(!Array.isArray(results))return null;
    var t=String(title||'').toLowerCase().replace(/\s+/g,''),y=String(year||'');
    var best=null,bestScore=-1,i,r,mt,rt,ry,score;
    for(i=0;i<results.length;i++){
      r=results[i];mt=r&&r.media_type;if(mt!=='movie'&&mt!=='tv')continue;
      rt=String((r.title||r.name||'')).toLowerCase().replace(/\s+/g,'');
      ry=String(r.release_date||r.first_air_date||'').slice(0,4);
      score=0;
      if(rt&&t&&(rt===t||(t.length>=2&&(rt.indexOf(t)>=0||t.indexOf(rt)>=0))))score+=2;
      if(y&&ry&&ry===y)score+=3;
      if(r.backdrop_path)score+=1;
      if(score>bestScore){bestScore=score;best=r;}
    }
    if(!best||!best.backdrop_path)return null;
    return {path:best.backdrop_path,id:best.id,mediaType:best.media_type};
  }
  function groupResultsByDisk(results){
    var groups={},i,row,safe;
    if(!Array.isArray(results))return groups;
    for(i=0;i<results.length;i++){
      row=results[i];if(!row||typeof row!=='object')continue;
      try{safe=safeShare(row.url||row.link||'');}catch(e){safe=null;}
      if(!safe)continue;
      (groups[safe.type]=groups[safe.type]||[]).push(row);
    }
    return groups;
  }
  function tmdbRelaySearchUrl(relayBase,directUrl){
    if(!relayBase||!directUrl)return '';
    return String(directUrl).replace('https://api.tmdb.org', String(relayBase).replace(/\/$/,'') + '/tmdb-api');
  }
  function tmdbRelayImageUrl(relayBase,path,size){
    if(!relayBase||!path)return '';
    return String(relayBase).replace(/\/$/,'') + '/tmdb-img/t/p/'+(size||'original') + path;
  }
  function tmdbPickBackdrop(results,title,year){ var p=tmdbPickTitle(results,title,year); return p?p.path:''; }
  function healthDotState(status){
    switch(String(status||'')){
      case 'ok':return 'ok';
      case 'bad':return 'bad';
      case 'locked':return 'locked';
      case 'unknown':case 'timeout':case 'uncertain':return 'uncertain';
      case 'rate_limited':return 'limited';
      case 'unsupported':return 'unsupported';
      default:return 'idle';
    }
  }
  function diskTabList(selfCounts,refCounts,order){
    var list=Array.isArray(order)?order:[],seen={},out=[],i,k;
    function rank(t){ var j=list.indexOf(t); return j<0?999:j; }
    Object.keys(selfCounts||{}).forEach(function(t){ if(!seen[t]){seen[t]=true;out.push({type:t,self:selfCounts[t]||0,ref:0});} });
    Object.keys(refCounts||{}).forEach(function(t){ if(!seen[t]){seen[t]=true;out.push({type:t,self:0,ref:refCounts[t]||0});} else { for(i=0;i<out.length;i++)if(out[i].type===t)out[i].ref=refCounts[t]||0; } });
    out.forEach(function(x,idx){ x.index=idx; x.total=x.self+x.ref; });
    out.sort(function(a,b){ var d=rank(a.type)-rank(b.type); return d!==0?d:a.index-b.index; });
    return out;
  }
  return {disks:disks,disk:disk,safeShare:safeShare,size:size,year:year,titleKey:titleKey,normalize:normalize,merge:merge,filter:filter,score:score,groups:groups,page:page,endpoint:endpoint,validKey:validKey,checkEndpoint:checkEndpoint,parseCheckResults:parseCheckResults,rankPreselect:rankPreselect,dedupKey:dedupKey,heroClass:heroClass,rankSuggestions:rankSuggestions,initialsOf:initialsOf,defaultSearchScope:defaultSearchScope,priorityDiskOrder:priorityDiskOrder,sortByDisk:sortByDisk,diskTabList:diskTabList,healthDotState:healthDotState,tmdbSearchUrl:tmdbSearchUrl,tmdbBackdropUrl:tmdbBackdropUrl,tmdbPickBackdrop:tmdbPickBackdrop,tmdbRelaySearchUrl:tmdbRelaySearchUrl,tmdbRelayImageUrl:tmdbRelayImageUrl,qualityBadges:qualityBadges,tmdbPickTitle:tmdbPickTitle,tmdbImagesUrl:tmdbImagesUrl,groupResultsByDisk:groupResultsByDisk,healthRank:healthRank,resRank:resRank,rowOrder:rowOrder,panPublicErrorKind:panPublicErrorKind};
}));
