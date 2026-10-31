# RC93 搜索背景删除 + 主页海报墙 / 卡顿诊断（Muse）

- 基线：RC92（预览 `webhome-rc92-8fda76000153`，commit `e570686`，tag `mirror-20261031-rc92-webhome`）。
- 回滚：RC92 预览 + `rc92.json`（均保留，未动）。
- Stable 仍为 RC19；`tv_tested` false；未动任何后端、Docker、服务、凭据、Codex 文件、stable 或既往 release。
- 本版状态：STAGED（未 push），待 parent 核验、提交、打 tag、推送、交付。

## 1. 用户报告（2026-10-31 16:26，针对 RC92）

原意：“不是想要的。主页进去的海报墙怎么也没有了？页面操作很卡。把搜索页的海报墙背景图删掉。”
用户词汇已确认：他的“海报墙背景图” = 搜索视图的背景图。本版删除搜索视图背景，
主页 / 详情背景不动。

## 2. 诊断结论（先说结论，证据在后）

1. **主页海报墙消失：harness 中无法复现，RC92 代码没有破坏主页渲染。**
   RC91→RC92 的改动全部是搜索作用域；主页渲染代码（discovery.js / discovery-data.js）
   未被触及；用真实豆瓣数据跑 RC92 基线与 RC93，主页表现完全一致（4 条 rail、
   60 张卡片、海报懒加载正常、0 破损、返回主页完好）。因此不编造代码修复；
   剩余嫌疑在电视侧（见 §5）。
2. **卡顿：主页侧 harness 中无法复现；搜索侧 RC92 确实存在每焦点背景管线，
   RC93 已将其整体删除。** 主页：8 个数据请求、焦点移动 0 重渲染、最长长任务
   ≤130ms（RC93：62ms）。搜索 RC92：每 10 次卡片焦点产生 +1 个海报请求、
   +2 次 fm.res 调用（harness 实测）；在电视慢网络下，每次焦点停留的
   suggest/TMDB 往返 + 全屏图片解码重绘 plausibly 感觉卡顿（此句为机制推断，
   已标注，非 harness 实测）。RC93 搜索实测：焦点移动海报请求增量 0，
   整轮搜索 res 调用 0。

## 3. 改动（仅 3 个应用文件 + 预览 main.json 的 GG 两项）

### app.js（搜索背景栈删除；行号为 RC92 基线）
- 删除搜索背景壳创建（旧 line 302：
  `GGResourceView.createBackdropShell(doc, $('resultsSection'), 'search-result-backdrop')`）。
- 删除背景状态变量块（旧 line 303：`searchArtKey/searchArtHint/searchArtToken/
  searchArtTimer/searchArtImage/searchArtCache/searchBackdropCandidate`）。
- 删除 `showSearchArtwork`（旧 304–310，含 180ms 定时器与 TMDB/suggest 查询）、
  `searchBackdrop`（旧 311，focus-first 逻辑）、`searchArtworkFromEvent` 及其
  focusin/pointerdown 监听（旧 312）、`runEnrichLookup`（旧 169–199）。
- 删除调用点：search() 旧 line 111 的 candidate 重置、setMode 旧 line 388 的
  art 清理分支、tmdbKey 变化旧 line 519 的整个 if、setSearchEditor 旧 line 687
  的进出 art 块（仅保留 `$('resultsSection').hidden=searchEditing||!state.query;`）、
  clearTmdbKey 旧 line 737 的 art 语句、stopSearchTasks 旧 line 746 的
  timer/token 语句、resumeSearchTasks 旧 line 747 的 art if 块、renderSearchGroups
  尾部的 `searchBackdrop()` 调用（旧 313）、声明 `,snapshotBackdropGeneration=-1`
  （旧 line 6）。
- 品牌与版本：`GGApp.version` RC92 → RC93；index.html 品牌 RC92 → RC93。

### core.js
- 删除 `artworkTitle`（旧 455–501）、`tmdbPickPoster`（旧 502–509）、
  `doubanSuggestPoster`（旧 510–515）及导出项。调用分析（grep 全 workdir JS，
  除 fixture/tests/preview 外）：`runEnrichLookup` 仅被 `showSearchArtwork` 调用；
  `doubanSuggestPoster` 仅被 `runEnrichLookup` 内 + core 导出调用；
  `tmdbPickPoster` 仅被 `runEnrichLookup` 内 + core 导出调用；
  `artworkTitle` 仅被 `showSearchArtwork` + `searchBackdrop` + core 导出调用。
  删除后四者彻底无引用（grep 零命中）。

### 刻意未动
- CSS 未动：resource-view.css 里的搜索背景死规则保留（详情共用 `.gg-art-shell`
  规则；死规则无害）。`GGResourceView.createBackdropShell` / `attachBackdrop`
  保留（详情用）。
- 详情背景未动：discovery.js:154 的 `discovery-art-shell`（详情 modal 内）原样。
- 数据字段未动：`row.backdrop` / `row.wallPic` 的 8 处用途（fm.pan.play
  pic/wallPic、fm.play 回退、nativeSearch、cachePushArtwork）原样。
- 详情 / 建议路径保留：`tmdbPickTitle`（discovery.js:250 详情 TMDB）、
  `tmdbPickBackdrop`、`tmdbSearchUrl`、`tmdbBackdropUrl`、`tmdbImagesUrl`、
  `tmdbRelay*` 均保留；建议本身仍走直接 subject_suggest（RC64 用户决定）。
- 搜索其余行为未动：分组、健康点、质量徽章、焦点、输入返回、快照、播放入口。

## 4. 诊断证据（全部实测，非推断处已标注）

### 4.1 RC91→RC92 diff（代码证据）
- app.js diff 59 行，全是搜索作用域：`searchBackdropCandidate` 新增；删除
  enrichCache/enrichQueue/enrichWaiters/enrichActive/pumpEnrich/applyPoster/
  enrichSearchCard；`showSearchArtwork` 改用 `artworkTitle`；`searchBackdrop`
  focus-first 改写；setMode/resume/编辑器退出/tmdbKey 变化/clearTmdbKey 的
  candidate 清理；版本串 RC74→RC92。无 mount 改动，无 discovery 改动。
- core.js diff 91 行，纯新增（`artworkYearSpans` + `cleanWorkText` +
  `artworkTitle` + 导出项），无既有函数改动。
- index.html diff 4 行，仅品牌。预览 main.json diff 恰好 2 行（GG 名、homePage）。
- RC92 app.js 中被删 enrich 标识零残留；RC91 中 `enrichSearchCard` /
  `applyPoster` 只在自身内部调用（自包含），RC92 删除干净，无 ReferenceError 路径。
- 搜索背景壳只在 `#resultsSection` 内创建（`position:fixed; inset:0`）；
  详情背景是另一个独立元素（detail modal 内）。主页 rail 是 discovery.js 的
  rail + 海报，与 app.js 背景无关。

### 4.2 主页复现（真实数据；RC92 基线 vs RC93 同 harness 对照）
- 旧 mock 缺口：RC92 fixture mock 对主页路由全返回空（recommend `{"items":[]}`、
  collection `{"subject_collection_items":[]}`），故 RC92 harness 从未覆盖主页。
  本版 mock 改为 serving 服务器实测的真实豆瓣数据（2026-10-31 服务器 curl，
  全部 HTTP 200）：movie recommend 61525 字节、tv recommend 55174 字节、
  movie_hot_gaia 26560 字节、tv_hot 44275 字节（见 workdir fixture-home-data.js）。
- RC92 基线主页（1280×800）：rail 4 条（最近观看/豆瓣推荐/热播剧集/热门电影）、
  卡片 60 张、状态无“暂时不可用”、无未捕获 JS 错误、返回主页后 rail + 海报完好。
- RC93 主页（同条件）：rail、卡片、状态、错误、返回主页表现与 RC92 完全一致。
- 海报懒加载证明（CDP 只读探查，RC92 页）：静止时 60 图中 18 张已载入、
  42 张懒待定（data-gg-src）、0 破损；滚到底部后待定 42→34、已载入 18→26、
  仍 0 破损。18/60 不是墙消失，是 IntersectionObserver 懒加载的设计行为。
- 主页“背景”说明：主页本来就没有 `.gg-art-shell` 元素（壳只存在于搜索
  resultsSection 与详情 modal）；详情壳在主页视图下不存在是符合设计的
  （modal 未打开）。

### 4.3 卡顿测量
- 主页（RC92 与 RC93 同 harness）：数据请求总数 8；焦点移动 10 张卡片产生
  0 个新数据请求、0 次 rail 重建；长任务 RC92 共 3 个（59/67/130ms），
  RC93 共 1 个（62ms）。无重渲染循环、无请求风暴。
- 搜索 RC92 探查（CDP 实测，同 mock）：搜索后 5 张卡片、壳存在、壳图 1 张、
  海报请求 2、请求总数 14、res 调用 1；10 次卡片焦点后海报请求 2→3（+1）、
  请求总数 14→15（+1）、res 调用 1→3（+2）。风暴存在但 harness 中被 180ms
  定时器合并（连续焦点只触发最后一次查询），故量级小；电视慢网络下每次
  焦点停留的往返 + 全屏重绘是 plausibly 的卡顿来源（推断，已标注）。
- 搜索 RC93 实测：焦点移动海报请求增量 0、新增图片 0、整轮 res 调用 0。

## 5. 未解决项与电视侧待确认（不猜测、不编造修复）

- 主页墙若在用户电视上仍缺失，harness 证据表明不是 RC92 代码所致；剩余嫌疑
  （需用户侧配合排查）：电视经 fm.req 访问豆瓣 rexxar 的可达性、电视经
  fm.res/Douban 图片的可达性、App 缓存陈旧、当前入口是否为最新 RC93。
- 卡顿若在 RC93 后仍存，harness 未复现主页卡顿；需用户反馈具体场景
  （主页滚动 / 搜索焦点 / 详情打开）与电视网络情况再定因。
- 真机验收仍待：真实电视、原生输入法、运营商网络、真实播放、播放返回聚焦卡片、
  带真实设备密钥的 TMDB 路径；搜索视图无背景图、主页墙恢复、卡顿消失三项。

## 6. 核验（分开计数）

- 单元：`tests-rc93.cjs` **16/16**（保留 cleanSearchTitle×4 + normalize×1 +
  搜索卡片无图守卫×3；新增 RC93 守卫×8：无搜索壳创建、无背景函数、无背景
  状态、core 不再导出三者、详情 helper 保留、详情壳未动、版本 RC93；
  已删 artworkTitle 21 向量、doubanSuggestPoster 7 项、e2e 5 项、tmdbPickPoster 2 项）。
- 兼容扫描：显式文件表（app.js、core.js、index.html）**0 errors**（仅既有 CSS
  min/max WARN）；全部改动 JS 文件 `node --check` 通过。
- 浏览器 + mock 桥（真实捕获数据；每轮全新临时目录，跑后删除）：
  - 搜索驱动 **21/21** @ 1280×800，**21/21** @ 390×844（两标题分组渲染、
    卡片无图、徽章 + 健康点保留、搜索视图无背景元素、焦点移动零海报请求
    零新增图、输入编辑隐藏结果、提交恢复结果、播放入口 fm.pan.play、
    fmresume 后分组完好、零未捕获 JS 错误）。
  - 主页驱动 **12/12** @ 1280×800（rail、卡片、海报懒加载零破损、状态、
    焦点零请求、搜索↔主页往返完好、零错误）。
  - RC92 基线对照：主页驱动同 profile（rail 4 / 卡片 60 / 海报 18 已载入
    0 破损 / 请求 8）；搜索探查见 §4.3。
- 预览：`webhome-rc93-92fd07ef6658`，main/index/app/discovery/discovery.css
  全部 200；服务器预览 main SHA 与本地构建一致
  `48441c07e88b6f0b2fc82b25feaeb0a18b414ecc3b32596ec8a3ca7ea9da85b2`；
  157 站；GG `GG · 家庭资源库 [RC93]`；RC92 预览保留为回滚。
- 核验中发现并修正的三个 harness 侧问题（均非应用回归）：
  1. 输入编辑断言初版用裸 focus()+input，未触发只读输入的激活手势
     （search-input.js：只读字段需 pointerdown/click/Enter 确认才 begin）→
     驱动改为先 pointerdown 再输入，通过。
  2. 播放入口断言初版假设详情 modal 内有播放按钮；实测搜索卡片点击本身
     即调用 fm.pan.play（无 modal）→ 驱动改为点击卡片断言 playCalls 递增，通过。
  3. 主页海报断言初版要求已载入 === 总数；懒加载设计下恒为 viewport 子集
     → 驱动改为“有载入、零破损”，RC92/RC93 同条件通过。

## 7. 构建 / 发布（RC92 管线，builder 已 bump 到 rc93）

- 本地 workdir `~/workspace/webhome-rc93/`；builder `build-publish.cjs`
  （rc92 引用已全部 bump；`node --check` 通过）。
- Digest `92fd07ef6658` = 27 个应用文件排序后 "文件名+sha256hex" 串联的
  sha256 前 12 位（与 RC92 同规则；RC91 自身 digest 不可复现，故只述规则）。
- Archive SHA `3ac9dea56b32a5b4f1e21fb46702025b1f943a227ebb3390ae815ab900d6f6ae`
  （确定性 tar.gz：排序名、uid/gid 0、mtime 0、gzip -n，27 文件）。
- 预览 main 相对 RC91 预览 main 恰好 2 行差异（GG 名、homePage）；
  fast↔raw 全量改写规则下 0 真差异；release main 与 fast 字节一致；
  webhome-only 为 fast 仅 GG 项；version.json：version rc93、
  tag `mirror-20261031-rc93-webhome`、`tv_tested` false、static_sha256 27 项。
- Release 布局：`rc93.json`、`raw-rc93.json`、`fast/releases/v0.1.0-rc93/
  {main,version,webhome-only}.json`、`docs/webhome/rc93-92fd07ef6658/`（27 文件）、
  `webhome-rc93-manifest.json`。与 RC92 同：不写 `raw/releases/v0.1.0-rc93/`，
  且无任何引用指向它。
- 暂存：`/opt/services/tvbox-next/work-muse-rc93/`（fresh clone，见 DEPLOYMENT
  build 条目）；handoff 已随暂存复制进 clone 的 docs/（RC92 时由 parent 手动补，
  本版已在暂存步骤内完成）。
- 预览 URL：https://tv.godroc.dpdns.org/next/previews/webhome-rc93-92fd07ef6658/
- 临时目录（harness）已按“全新名、跑后删除”处理：全部 tmp-home-*/tmp-search-*
  预览目录、/tmp rundir 与 tarball、Chrome 测试 profile 均已删除；RC92 预览保留。
