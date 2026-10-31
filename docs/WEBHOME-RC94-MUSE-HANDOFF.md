# WebHome RC94 — Muse handoff（candidate only，stable 仍为 RC19，tv_tested false）

- 基线：RC93（预览 `webhome-rc93-92fd07ef6658`，commit `11772a7`，tag `mirror-20261031-rc93-webhome`）。
- 本版：RC94，digest `b0158a64b308`，预览 `https://tv.godroc.dpdns.org/next/previews/webhome-rc94-b0158a64b308/`，
  预览 main SHA `3728ecea055b2cb986388d9f6786d97a6e5f959a9146d7401921f5b7234ea7d0`，
  archive SHA `0d88366808813c0aaa79c11396b66c4a9bc19933d94838ba1c03291968626199`，
  tag（未推送）`mirror-20261031-rc94-webhome`。
- 暂存（未推送、未提交）：`/opt/services/tvbox-next/work-muse-rc94/`（fresh clone，HEAD 为 RC93 commit；
  `git status` 仅 `??` 新增 5 项，见第 7 节）。本地 workdir `~/workspace/webhome-rc94/`。
- 回滚：RC93 预览目录（保留，未动）。
- 交付状态：STOP 在 git push 之前；由 parent 校验、推送、交付用户。真机验收仍待定，绝不以模拟结果声称真机通过。

## 1. 用户报告（2026-10-31 17:53，RC93 上，两条）

1. “点主页图标/资源进海报墙页后卡，返回主页仍然卡；随后搜索页搜出不少结果，突然变成 1 条。
   不要一直刷新，按先刷新出的顺序筛选显示；排序以后再加按钮。”
2. “主页进去的海报墙没有了。”并要求把缺墙与卡顿当作可能同一原因查（图片加载失败 + 重试残留），
   不许未经真实图片路径测试就以“电视侧”了结（RC93 的“未复现”结论所用的是 stub/本地图片，故作废）。

## 2. 复现证据（修复前，RC93 代码）

### 2.1 搜索塌缩：证实（3 个机制全部复现）

- 塌缩：检查陆续落地时可见数 220→106，趣盘卡片 5→2；伴随整组 section 节点被替换（221 次 mutation）。
  根因链：`checkFilter` 默认排除 `bad`（`F.states.filter(k => k!=='bad')`）→ 坏链落地即被滤掉；
  每次 `onCheckUpdate` 都可能走 `renderFilterViews()` → `renderSearchGroupsInternal()` 全量重建
  （`groupsBox.textContent=''`）→ 已显示列表被更小的过滤后列表整体替换。
- 快照门：晚到的趣盘组直到用户点快照按钮才出现（按钮 2918ms 出现 → 7504ms 才显示，15 卡）。
  根因：`shownSearchGroups()` 返回冻结快照，`offerSearchArrival()` 只有快照发布才渲染。
- 重排：显示的觅搜顺序不是源顺序的子序列。
  根因：`groupFilter` 对 relevance 也走 `C.filter` 的 rank 排序 + `sortByDisk`，`groupRowsFor` 再用
  `stableGroupOrders` 把晚到结果按首次 rank 固定。

### 2.2 主页 / 海报墙 / 卡顿：部分证实，部分未复现（须如实写）

- 6 个复现模式（local / real-418 / fail404 / hang / data-fail / TMDB-hang，RC93 代码）：
  主页 4 轨 60 卡、详情页 hero+海报均正常渲染；返回主页后 20 秒静默窗口在全部模式下都是
  全零（timersFired / timersCreated / mutations / req / res / longtasks / imgRes / tmdbRes 均为 0，
  timersActive=0），分离 img 的 src 变化为 none。
  **结论：RC93 harness 未能复现“返回主页后仍有持续工作”的泄漏。** 本版的图片生命周期修复
  是针对代码审查中确认的真实泄漏口（见第 3.1 节）的预防性加固，不是“已复现泄漏的修复”。
  用户真机卡顿的根因仍未证实，见第 8 节。
- 6 个模式中“browse grid FAIL”均为 harness 选择器 bug，不是应用 bug：
  应用在启动时把 `.discovery-types` tabs 移出 `#discoverySection`，挂到 `<main>` 顶部的
  `#pageNavigationHost`（app.js 约 993 行）。驱动原先用 `#discoverySection .discovery-type[data-type="movie"]`
  查询，故永远找不到；CDP 实测按钮本身存在（热门电影，data-type=movie）。本版驱动已改用文档级选择器。
- 真实图片路径（real 模式，fm.res 原样返回 doubanio URL → 浏览器直连无 Referer → 418）：
  18 张首屏图先 pending、最终全部 broken，走 img2→img1 重试链后隐藏并挂“海报暂不可用” fallback。
  卡片本身不消失，墙变“标题卡 + 暂不可用文字”，不是整墙消失。
- 数据失败模式（data-fail）：rexxar 路由失败 → 6 轨 0 卡（RC93 h-data；本版门控后复跑为 7 轨 0 卡，
  多 1 轨是失败 section 现在显示错误轨而非被跳过，见第 4 节）。
  这是 harness 里唯一“墙为空”的形态：数据不到，轨在、卡不在。
- 详情页 hero/poster 在全部模式下 complete=true；fm.res doubanio 调用的 Referer 均为
  `https://movie.douban.com/`（refererOk=true）。

## 3. 精确改动（只动卡顿 / 塌缩 / 渲染范围；RC93 的搜索背景删除与其它一切未动）

### 3.1 discovery.js：图片生命周期（防导航后残留）

- `clearImages(container)`：不再因无 IntersectionObserver 而提前返回；除取消 `data-gg-src` 观察外，
  对容器内全部 `img` 清除 `__ggImgTimer`、置 `__ggDead=true`、 null 掉 `onerror`/`onload`。
  旧版只 unobserve 未加载图，已设置 src 的加载中图与 priority 图（详情 hero/poster）完全不受控。
- `armImageTimeout` 回调与 `image()` 的 `onerror`、详情 hero-wrapper 的 `onerror` 均加 `__ggDead` 守卫：
  已标记死亡的图片的超时/错误回调直接返回，不再触发重试链。
- TMDB `preloadCandidates` 递归入口加 `g!==detailGen||modal.hidden` 守卫：关闭详情后探测链立即停止，
  不再跑完剩余候选（旧版仅 done 回调有守卫，递归本身无守卫，最多约 5×8 秒）。
- 未动：重试链本身仍有界（仅 attempt 0 一次：TMDB image→images、doubanio img2→img1，之后隐藏 + fallback）；
  `close()` 的其余清理、`home()` / `loadBrowse()` 的清理逻辑未改。

### 3.2 app.js + core.js：搜索渲染策略（用户指令：停止 constant 刷新，按到达顺序追加显示）

- `checkFilter` 默认改为全部状态（`F.states.slice()`，含 `bad`）：检查落地不再把已显示的坏链滤掉，
  坏链以红点表示而非消失。`resetFilters` 本来就是全部状态，与之一致。
- `groupFilter`：relevance 时传 `preserveOrder` 给 `C.filter`，且不再对 relevance 调用 `sortByDisk`；
  `core.js` 的 `C.filter` 在 `preserveOrder` 时跳过排序。非 relevance 排序（newest/size 等）行为不变。
- `groupRowsFor`：relevance/空排序时用新增的 `arrivalOrders`（按未过滤源行首次出现顺序建序，
  id 取 `src.id+'|group:'+key`，与 `cloneSearchRow` 的 id 规则一致），晚到行追加到队尾，永不重排；
  非 relevance 排序仍用 `rank()` + `stableGroupOrders`。`arrivalOrders` 在 `search()` 中与
  `stableGroupOrders` 一并重置。
- `shownSearchGroups()` 改为直接返回 live `searchGroups`（不再返回冻结快照）。
  `offerSearchArrival()`：组视图直接 `renderSearchGroups()`（晚到组立即出现，不再等快照按钮）；
  mixMode 保留快照门（`snapshot.offer` + 按钮）。快照对象本身保留，供 mixMode 使用；
  组视图下快照按钮不再出现（驱动证实 never-shown）。
- `onCheckUpdate()`：100ms 防抖后只做 `holdFocusedCheckChange()` + `applySearchCheckDots()` +
  `refreshSearchSummary()`，永不调用 `renderFilterViews()`。检查/徽标更新只改点与汇总，不动列表。
- `renderSearchGroupsInternal()` 全量重建改为 keyed reconciler：
  每组缓存 section 引用（sec/head/title/meta/list/retryBtn/statusSpan/positionEl/emptyEl/spacerEl）+
  签名备忘（`key|status|error|elapsed|rows.length|过滤后 ids|offset|count`）；
  按 key 顺序插入 section、按 slice 顺序复用/移动/新建卡片、只删消失的卡片；
  meta/spacer/position/empty/error 节点原地更新；focus 恢复保留作安全网。
  仅在无来源 / 无可见组两个早返回里清 box 并清缓存（视图切换时不留旧 section）。
  窗口仍为 30 行/窗、spacer 高度公式与滚动 pager 逻辑未动。
- 版本：`GGApp.version` 与 index.html 品牌 RC93→RC94。

### 3.3 未改、未建

- 排序按钮：用户明确推迟，本版不建；记为未来项（第 6 节）。
- 搜索快照按钮、rerank 按钮（重新排序）、mixMode 综合推荐、筛选器、检查协调器/账本、网盘映射、
  Douban/TMDB 取数、后端/Docker/服务/凭证：全部未动。

## 4. Harness 修正（非应用代码，仅为测准）

- 家居驱动 tab 选择器：`#discoverySection .discovery-type[data-type="movie"]` →
  `.discovery-type[data-type="movie"]`（原因见 2.2）。
- Mock 的 `j/search_subjects` 路由：原先固定返回空；现返回 `__HOMEDATA.movie_hot`（movie）/
  `tv_hot`（tv）的 subject 列表，使浏览页（movie tab）可测；并对 `__DATA_FAIL` 门控
  （500），使数据失败模式忠实（否则 classics 轨会错误地拿到数据）。
  该改动只影响 fixture，不进入发布文件。

## 5. 修复后验证（数字分开报；临时目录全新名、跑后删除）

- 单元：`tests-rc93.cjs`（断言已 bump 到 RC94）16/16；`node --check` app/core/discovery 均通过。
- 兼容扫描：0 errors（既有 CSS min/max WARN 依旧，与 RC93 相同，非新增）。
- 搜索驱动（fix1，RC94 代码）：全部 PASS。
  塌缩消失：12 页检查落地 + 10 秒尾巴全程 cards=35（mipan 30 + qupan 5）不变，
  summary total/visible=223 全程稳定（RC93 为 220→106、qupan 5→2）；
  section 节点替换 = false（无全量重建）；首屏 mipan 顺序为源顺序子序列（subsequence=true）；
  错峰到达：qupan 2854ms 直接显示，快照按钮 never-shown，到达后 groups intact 45 卡；
  dots 45、badges 28、首卡可聚焦、无 JS 错误。
- 家居驱动本地模式（fixh3，RC94 代码）：10/10 行 PASS。
  主页 4 轨 60 卡（18 已载、0 破损、42 懒加载、0 fallback）；
  浏览页 gridOk=true、20 卡（12 已载、0 破损、8 懒加载、0 fallback）；
  详情页 hero+poster complete；返回主页 4 轨 60 卡完好；
  20 秒静默窗口全零、timersActive=0、分离 img src 变化 none、无 JS 错误。
- 家居驱动失败模式（RC94 代码）：real / fail404 / hang / TMDB-hang 全部 PASS 行；
  浏览页均为 20 卡，图片失败时 12 破损 → 12 fallback（卡片在、文案在）；
  返回主页后静默窗口全零、timersActive=0、分离 img src 变化 none、无 JS 错误。
  hang 模式（30 秒延迟图）同样全零，证明超时/重试定时器在导航后已死。
- 数据失败门控复跑（fixdata2）：7 轨 0 卡（忠实复现 RC93 h-data 的空墙信号；轨数差 1 是因为
  失败 section 现显示错误轨而非被跳过，属 mock 保真度修正）；浏览页 0 卡；
  详情页 FAIL 属预期（无主页卡可点，与 RC93 h-data 相同）；静默窗口全零、无 JS 错误。
- 预览 smoke（真实预览 URL，非 fixture）：`GGApp.version=RC94`、标题正确、0 JS 错误。

## 6. 未来项（用户推迟，不在本版）

- 排序按钮：用户原话“排序按钮后期再加”。RC94 不做；后续 RC 在搜索页加排序按钮时，
  应以 `arrivalOrders` 为默认（到达顺序），按钮切换 rank/newest/size 等排序，且切换本身
  不得触发全量重建（复用 reconciler + 签名机制）。

## 7. 构建 / 发布（RC92/RC93 管线，builder 已 bump 到 rc94）

- Digest `b0158a64b308` = 27 个应用文件排序后“文件名+sha256hex”串联的 sha256 前 12 位。
- Archive SHA `0d88366808813c0aaa79c11396b66c4a9bc19933d94838ba1c03291968626199`
  （确定性 tar.gz：排序名、uid/gid 0、mtime 0、gzip -n，27 文件）。
- 预览 main 相对 RC93 预览 main 恰好 2 行差异（GG 名、homePage）；fast↔raw 全量改写规则下 0 真差异；
  release main 与 fast main 字节一致；webhome-only 为 fast 仅 GG 项；
  version.json：version rc94、tag `mirror-20261031-rc94-webhome`、`tv_tested` false、static_sha256 27 项。
- Release 布局：`rc94.json`、`raw-rc94.json`、`fast/releases/v0.1.0-rc94/{main,version,webhome-only}.json`、
  `docs/webhome/rc94-b0158a64b308/`（27 文件）、`webhome-rc94-manifest.json`。
  与 RC92/RC93 同：不写 `raw/releases/v0.1.0-rc94/`，且无任何引用指向它。
- 预览校验：main/index/app/discovery/discovery.css 均为 200；预览 main SHA 与本地构建一致；
  157 站；GG 项为 `GG · 家庭资源库 [RC94]` 且 homePage 为预览 URL。
- 暂存校验（clone 内，`verify-staging94.py` 逻辑）：
  GG homePage = Pages URL（rc94.json、raw-rc94.json、fast main、webhome-only 四处）；
  157 站（三处 main）/ webhome-only 1 站；fast↔raw 0 真差异；release main = fast main 字节；
  version.json static_sha256 重算 27 项 0 不匹配；manifest asset/tag 与文件列表一致；
  `git status` 仅 `??` 新增 5 项（docs/webhome/rc94-b0158a64b308/、fast/releases/v0.1.0-rc94/、
  raw-rc94.json、rc94.json、webhome-rc94-manifest.json），无修改、无删除。
- 密钥扫描（仅新文件）：1 处命中为误报——`catalog.js` 的 `password: String(share.password …)`
  是读取分享链接自带提取码的应用逻辑，且该文件与 RC93 已发布文件字节一致（sha256 相同），
  非新增凭证；其余新文件无 vless/ss/trojan、fixture key、token、api-key 类命中。
- 临时目录：全部 tmp-rc94-* 预览目录、/tmp rundir 与 tarball、Chrome 测试 profile 均已删除；
  RC93 预览保留。

## 8. 局限与待真机确认（必须如实写，不以模拟代替）

- 真机卡顿根因未证实：harness 在 RC93 代码下未能复现返回主页后的持续工作（全模式静默窗口为零），
  故 RC94 的图片生命周期加固是“堵住了代码审查确认的泄漏口”，不是“复现并消灭了用户卡顿的根因”。
  若用户真机仍卡，剩余嫌疑在真机侧：TV WebView 的图片/定时器行为、App 对返回键与页面的拦截、
  真实豆瓣图片在他家网络下的延迟与重试、以及 App 缓存陈旧。不要把模拟通过说成真机通过。
- 缺墙的真机机制未证实：harness 里只有数据不到时墙为空（轨在、卡不在）；图片失败时卡片仍在
  （仅海报变“暂不可用”文字）。用户所说的“主页进去的海报墙没有了”若指浏览页，
  harness 浏览页在全部模式下均有卡（正常 20 卡；图片失败时 20 卡 + fallback 文案），
  故其真机形态（整页空白？还是无海报文字卡？）仍需他真机确认后才能定因。
- 截图：Codex 时代 workdir 无 shot.js，本版验证用驱动 + CDP 断言，未声称截图通过（与 RC93 同）。
- 待用户真机确认（沿用 RC93 未决项 + 本版新增）：
  搜索视图无背景图（RC93 项）；主页墙恢复与否；卡顿消失与否；
  搜索结果不再塌缩、晚到结果按到达顺序追加、无 constant 刷新感；
  若真机仍卡或仍缺墙，需他描述真机形态（整页空白 / 标题卡无图 / 转圈）再定因。
