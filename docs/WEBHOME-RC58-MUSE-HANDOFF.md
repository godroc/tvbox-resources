# WEBHOME RC58 — Muse handoff

- Preview: https://tv.godroc.dpdns.org/next/previews/webhome-rc58-2a9d2e252df5/main.json
- Entry: GG · 家庭资源库 [RC58]
- Rollback: RC57 preview (webhome-rc57-ece0b5a1c7e3)
- GitHub: (filled after push)
- Stable unchanged: RC19, tv_tested false. RC58 is a candidate only.

## What changed (all from the user's 2026-10-28 evening messages)

1. **首页只留豆瓣推荐**：首页不再堆全部 7 条豆瓣轨。只留最近观看（个人）+ 猜你喜欢（豆瓣热门标签推荐，sort=recommend）。热门电影/热播剧集/热门动漫/热播综艺/高分经典/影院热映去页签里看，数据不变。discovery.js home() 的 gotRail 只放行 id==='for-you' 的轨；最近观看走 renderHistory，不受影响。
2. **分类页签焦点停留自动切内容**：移到分类页签上停留 500ms 自动切到该分类（不重载当前页签）。按 OK 仍走老逻辑：切到别的分类，或在当前分类开关筛选。防抖 + blur/点击清定时器，快速划过页签不切。RC52 的“焦点不切”与 RC57 的“同页签点按 toggle 筛选”中，点按部分原样保留。
3. **翻页修好**：(a) 从浏览网格最后一排按“下”，焦点直达翻页区的下一页/上一页按钮，不再依赖电视原生空间导航；(b) 点上一页/下一页后，焦点回到新一页的首张卡（此前整块内容重建会丢焦点）；(c) 已是最后一页时状态行明示“（已是最后一页）”。服务端实测四条豆瓣分页接口（电影/电视 search_subjects、动漫/综艺合集、筛选 rexxar）每页都满 20 条，数据层本身没问题；电视端问题在焦点路径。夹具曾报“翻页后焦点在 body”，已证实是测试在跟骨架屏赛跑（分页行同步重建时标签已是新页码，焦点要等异步请求回来），修测试不等产品。
4. **搜索屏加三榜**：搜索屏新增电视榜/电影榜/综艺榜三组 chips，数据就是豆瓣热门合集（hot-tv/hot-movie/hot-variety，与首页推荐同源、同缓存），点榜单片名即搜该片名。最近搜索本来就是按钮组，不动。榜单在首次进搜索屏时懒加载，失败静默（搜索本身不受影响）。
5. **首页海报与字体再放大**：轨卡片 132→144px、海报 198→216px；宽屏档（≥1550px）144→160px、海报 216→240px；轨标题与浏览网格标题 16→17px，年份 12→13px，评分 11→12px，轨标题 20→21px。小屏档不动。

## Verification

- Unit: 88/88. Compat scan: 0 errors.
- Fixture: 166/166 (RC57 was 157; new: 首页修剪 5、榜单 3、翻页 5，另有 4 项随 mock/断言调整）。
- Screenshots: 7/7 pass; 01-home（只剩两条轨、卡片更大）与 02-search（榜单在列）已目视。
- Server preview: main/index/app/discovery/discovery.css 200，主文件 SHA 与构建一致。
- Fixture lessons carried: (1) 分页行同步重建，断言必须等新页卡片渲染，不能只等页码标签；(2) mock 标题全用“测试”开头会把低分联想结果挤出 8 条上限，extra 标题改用“影片 NN”。

## Notes for next RC

- 仍待用户反馈：RC57 长按 500ms 是否出徽章；盘搜自建在快入口的密钥状态；RC53 顶栏紫条回推的真机确认；删除图标红 × vs 原生垃圾桶的取舍。
- 搜索结果分组视图下分页隐藏是既有设计（点分组卡片散开后才出现分页），未改。
- TV 端豆瓣请求若失败，浏览仍显示“片单加载失败 + 重试”，下一页保持禁用（无数据时无法翻页是正确的）。
