# RC92 搜索背景焦点与来源海报交接（Muse）

基线 RC91（preview `webhome-rc91-a7064ce22678`，commit `3fa26620`，tag `mirror-20261031-rc91-webhome`）。
回退 = RC91 preview 目录（保留，未动）。稳定版仍为 RC19；`tv_tested` false。
本 RC 未推送 GitHub：已在 `/opt/services/tvbox-next/work-muse-rc92/` 备好待提交内容，
待父代理核验、提交、打标签、推送后交付。未动 Codex 计划文件、`work-codex-*`、
稳定版与任何既往发布；未动后端、Docker、服务与凭据。

## 用户范围更新（2026-10-31 ~15:31，覆盖计划的一部分）
- 搜索页不再显示海报墙图片：搜索结果卡片去掉海报图；保留标题、来源、画质徽章、
  健康圆点与其他卡片信息与行为不变；不为搜索卡片跑海报富化。
- 实查结论（代码 + 浏览器验证）：搜索卡片本来就没有海报图。卡片由
  `GGResourceView.create`（经 `makeGroupCard`）渲染，仅含健康圆点、标题、画质徽章、
  来源、日期与检测说明，无 `<img>`、无 `.poster`（`search-ui.css` 首行注释亦写明
  “Search is a text-resource view, separate from the shared poster grid”）。
  搜索卡片的海报富化代码（`enrichSearchCard`/`applyPoster`）零调用者，
  本 RC 已删除（见下）。因此该条指令在搜索卡片上已满足，本 RC 以浏览器断言
  （全部组、两标题、三视口：卡片内 `img=0`、`.poster=0`）与单元守卫将其锁定，
  未为此改动卡片渲染。
- 搜索视图的背景元素（`.gg-art-shell` + 背景 `<img>`，位于 `#resultsSection` 内，
  与卡片海报完全不同）**未按此指令删除**：用户原话同时要求“背景焦点部分继续按计划修”，
  故背景焦点与背景配图匹配工作全部保留，见下。
- 收藏夹海报卡（`makeResource` → `resourceGrid`）属于另一视图，不在搜索页指令范围内，未动。

## 计划中因上述更新而不再成立的项（moot）
- 搜索卡片海报的错位/不匹配调查与修复：卡片无图，无错位可修。
- 搜索卡片的逐卡海报富化：从未运行（死代码已删），无需再跑。
- Home 与搜索在“卡片配图来源”上的对比：结论即“搜索卡片按设计无图”；
  有意义的对比在背景层（Home 行自带豆瓣海报/背景；搜索背景只能来自标题匹配），见证据。
- 保留的计划项：搜索背景焦点（聚焦行配图、首行回退、输入返回、后台/播放回调）、
  背景配图的标题/年份/类型匹配与迟到隔离；Home/详情配图路径未发现破损，未改代码。

## 证据（真实来源数据，先复现后修复）
- 抓取（服务器端，2026-10-31，仅免密钥源；盘搜公共池两标题均失败 error 1003/502，
  与其已知不稳定一致）：觅盘 token+搜索、趣盘搜索、豆瓣 `subject_suggest`，
  标题：现在就出发、神雕侠侣。本地分析脚本 `analyze-real.cjs`（工作目录）。
- 零真实盘族行自带图片：觅盘 219+357 行、趣盘 5+15 行，图片字段全为空。
  搜索背景因此不可能来自行配图，只能来自标题匹配；Home 无此问题（Home 行自带豆瓣海报/背景）。
- 查询路径背景对两标题均失败：现在就出发 suggest 仅回 4 条季度项（第一季 2023、
  第二季 2024、第三季 2025、第四季 2026，全标 `movie`，豆瓣将综艺标为 movie），
  裸查询 0 匹配；神雕侠侣 suggest 回 4 条同名项（1983、1995、2006、2014）+ 新神雕侠侣，
  无年份裸查询 4 匹配 → 唯一规则返回空。
- 行路径对几乎全部真实行失败：`cleanSearchTitle` 会保留的杂质包括觅盘元数据块
  （`评分： 7.5 类型： 真人秀…主演：…`）、`名称:` 前缀、emoji、演员表、简介，
  以及趣盘括号内容（`（附前3季）`、`1995版`、`豆瓣9.2`）。抽查 11 行仅 2 行匹配
  （均为干净的趣盘现在就出发 第四季行）。`cleanSearchTitle` 不可全局改动（它 feeding
  搜索排序），故新增仅供配图用的 `artworkTitle`。
- 背景 token 隔离本身健全（每次 `showSearchArtwork` 递增 token、清 timer、`current()` 守卫）；
  但另发现一个真实焦点覆盖 bug（见“改动 3”）：`renderSearchGroups` 结尾无条件调用
  `searchBackdrop()`，任何重渲染（快照发布、筛选、检测更新）都会把背景重置为首行配图，
  即使焦点停在另一卡片上。100ms 步进追踪证实：快照发布后焦点仍在趣盘第四季卡，
  背景却被改写为觅盘首行（裸标题）配图且不再恢复。

## 改动（仅 3 个应用文件 + 预览 main.json 的 GG 两项）
- `core.js`：新增并导出 `artworkTitle(raw, fallbackYear)` → `{title, year}`。
  规则：最早元数据标记处截断（评分/类型/地区/语言/主演/豆瓣/TMDB/画质/视频/字幕/大小/分享）；
  `《作品》`规则（前缀单一年份 → 该作品+该年；前缀空 → 作品+回退年；否则在《处截断）；
  前导清理（emoji/符号、`名称:`/`电视剧：`/`电影：`/`综艺：`等、仅当内容为已知标签或含
  网盘/影视/高清/夸克/资源/分享/转载时才去的前导括号标签）；年份拆分需分隔符语境
  （前段优先、否则后段、否则全标题+回退年；多于 1 个不同年份 → 年份为空、诚实含糊；
  年份在首且前段为空时以后段为准，但 `1917 1080P` 式后段清后为空时回全标题+回退年）；
  `cleanWorkText` 尾部清理（括号段、更…/第X集/第X期/附…/全集/完结/合集、网盘与画质词、
  前导画质词）及单个尾部 `S0?N` → `第N季`（1–10 中文数字）。
  已知局限（见“局限”）：以年份开头的作品名可能误拆；双语标题与无分隔符的演员/版本后缀
  诚实不匹配；suggest 候选数有限（1982 神雕侠侣不在 suggest 前列 → 即使清理正确也为空）。
- `app.js`：
  1. 删除死代码 `enrichCache`/`enrichQueue`/`enrichWaiters`/`enrichActive`/`pumpEnrich`/
     `applyPoster`/`enrichSearchCard`（零调用者）；tmdbKey 变更与清除 TMDB Key 处理中
     删 `enrichCache={}`；保留背景 Douban 回退仍在用的 `runEnrichLookup`。
  2. `showSearchArtwork` 改用 `artworkTitle(row.title||state.query, row.year||'')` 取标题+年份
     （key 形状不变：`title|year|discoveryType|mediaType`）。
  3. 新增 `searchBackdropCandidate` 与候选门控的 `searchBackdrop`：取首个非空可见组
     （跳过 `reference`，经 `groupRowsFor`）的首行，否则仅查询；仅当同一代际+同一候选
     且背景态为 `ready` 或 `loading` 时跳过（`missing`/`idle` 会重试）；凡
     `snapshotBackdropGeneration=-1` 处均同步清 `searchBackdropCandidate=''`
     （search、setMode 两分支、tmdbKey 变更、进入/退出编辑、清除 TMDB Key），
     唯 resume-else 不清（门控自决，避免闪烁重载）。
  4. `setSearchEditor` 退出时优先聚焦卡（`showSearchArtwork(focused.__ggPanShare)`），
     否则 `searchBackdrop()`；resume-else 由 `snapshotBackdropGeneration=-1;searchBackdrop();`
     改为仅 `searchBackdrop();`（门控自决）。
  5. `searchBackdrop` 本身改为聚焦优先：焦点在搜索卡上时直接 `showSearchArtwork(聚焦行)`，
     否则走原首行逻辑。修复上述重渲染覆盖焦点配图的 bug；与 687 行退出逻辑、
     747 行恢复逻辑的聚焦优先模式一致；focusin/pointerdown（312 行）本就对所有卡
     （含 reference 卡）走聚焦配图，故不另作 reference 排除。
  6. `GGApp.version` `RC74` → `RC92`（注：RC91 的 app.js 仍写 RC74，属遗留未随版递增）。
- `index.html`：品牌 `WEBHOME · RC91` → `RC92`，页脚 `RC91 · …` → `RC92 · …`。
- 预览 `main.json`：相对 RC91 预览 main 仅改 GG 两项（名 `[RC91]` → `[RC92]`、
  homePage → 新 RC92 预览 index URL）；157 站不变；其余字节与 RC91 预览 main 一致
  （逐行 diff 恰为 2 行，已验证）。

## 验证（分开计数）
- 单元 `tests-rc92.cjs`：43/43（`artworkTitle` 21 向量、真实 suggest 匹配 7 项、
  artwork→suggest 端到端 5 项、`cleanSearchTitle`/normalize/tmdbPickPoster 回归钉 7 项、
  搜索卡片无海报守卫 3 项）。`node --check` 全过。
- 兼容扫描（显式文件表 `core.js app.js index.html`）：0 errors（仅既往 CSS min/max WARN）。
- 浏览器 + mock 桥（真实抓取数据经 `fm.req` 路由；无设备密钥、无 TMDB Key；
  每次运行全新临时目录，跑后删除；同一 harness 先跑 RC91 再跑 RC92）：
  - RC92：1280×720、1920×1080、390×844 各 22 PASS / 0 FAIL / 1 SKIP。
    覆盖：两组渲染（觅盘首屏 30、趣盘全部 5/15）、卡片无海报（35/45 卡 img=0）、
    画质徽章与健康圆点保留、初始背景跟踪聚焦卡、趣盘第四季聚焦→2026 海报
    （key `现在就出发 第四季|2026|`、state ready、正确海报 URL 被请求）、
    趣盘 1995版聚焦→1995 海报、版本切换（1995→2006 等键跟随焦点）、
    同作品同年跨分享不重载（同一 img 节点，pairPoster=yes）、迟到隔离
    （旧现在就出发海报零泄漏 + 新搜索配图跟踪）、输入编辑隐藏结果+背景 idle、
    提交恢复结果+背景跟踪、pageshow 不破坏背景、播放入口（`fm.pan.play` 被调）与
    fmresume（焦点在卡 + 背景跟随聚焦卡）、零未捕获 JS 错误。
  - RC91 同 harness（1280×720）：21 PASS / 2 FAIL / 1 SKIP；两 FAIL 恰为上述两聚焦证明
    （键为杂质标题、state missing、海报未请求），其余全过——harness 有效，修复前后对比成立。
  - SKIP（两版本一致）：觅盘“优酷修复版”行在首屏 30 行之外，页内无法触达；
    同一 1995 匹配由趣盘 1995版行覆盖。
- 截图：RC92 三视口各 1 张（搜索视图：文本行 + 背景图已载入 + 卡片无海报），
  另有 RC91 对照截图。截图为 mock stub 图（Douban 海报在 harness 中映射为同源 stub
  以便 onload 可验证），不代表真机海报。
- 服务器预览：`https://tv.godroc.dpdns.org/next/previews/webhome-rc92-8fda76000153/main.json`
  29 文件；main/index/app/discovery/discovery.css 均 200；main SHA
  `76632ec4d765681feee1c994b8e2eda458ff72229c88d0a43861c0924751ece2` 与本地构建一致；
  157 站；GG 项 `GG · 家庭资源库 [RC92]`。
- GitHub 暂存（未推送）：`/opt/services/tvbox-next/work-muse-rc92/`（全新 clone，HEAD 3fa2662）。
  `git status` 仅 `??` 新增 5 路径 = 33 文件（docs 27 + rc92.json + raw-rc92.json +
  release 目录 3 + manifest 1），无修改、无删除。GG homePage = Pages URL 于
  rc92.json、raw-rc92.json、release main、webhome-only 四处；fast↔raw 0 真 diff
  （全部为 gh-proxy `/fast/` → 直接 `/raw/` 改写）；version.json static_sha256 0/27 不匹配；
  tv_tested false；新文件密钥扫描仅命中良性标识（`searchArtToken`/`searchArtKey` 等
  背景隔离变量名、`routeToken`、觅盘运行时匿名 token 代码、分享提取码字段名），
  无密码、无密钥、无 UUID、无节点链接、无设备密钥。
- 发布形状（复刻 RC91 已证实字节一致的变换，旧 builder 已过期未用，改用
  工作目录 `build-publish.cjs`）：digest `8fda76000153` = 27 应用文件
  “排序后 文件名+sha256hex 拼接”之 sha256 前 12 位（RC91 自身 digest 未能复现，
  故此处明言规则而非声称复现）；tag `mirror-20261031-rc92-webhome`；
  Pages `https://godroc.github.io/tvbox-resources/webhome/rc92-8fda76000153/index.html`；
  fast 链接 `https://gh-proxy.com/https://raw.githubusercontent.com/godroc/tvbox-resources/refs/heads/main/rc92.json`；
  archive_sha256 `cf0c9235ebc9086d79046e886e0029aabccc60e6274f21a943a62364769167dc` =
  27 个 docs 文件确定性 tar.gz（排序名、uid/gid 0、mtime 0、gzip -n）之 sha256
  （RC91 的 archive 构造无法从现有证据恢复：旧 builder 无 archive 步骤，
  Codex 工作目录无权限且按任务不得触碰；故此处记录可复现方法而非声称与 RC91 同法）。
  序列化：除预览 manifest（indent=2、无尾换行、27 排序文件 + main.json 最后）
  外均为 `json.dumps(ensure_ascii=False, indent=2)` + 尾换行；三项变换
  （预览→fast、fast→raw、release main = fast 字节、webhome-only = fast 滤 GG）
  均已用 RC91 文件验证字节一致。

## 局限（须真机验收，模拟不能代替）
- 真实电视、原生输入法、提供方网络、实际起播、原生播放器返回的恢复到指定卡均未验证。
- TMDB 路径未用真实设备密钥验证（harness 无 TMDB Key，与既往 RC 相同）。
- suggest 覆盖局限：1982 神雕侠侣不在 suggest 前列；双语标题、无分隔符演员/版本后缀诚实不匹配；
  以年份开头的作品名可能误拆；裸标题多版本（神雕侠侣无年份）诚实为空。
- 遥控器连续焦点、长按、真实滚动分页未用真遥控器验证（仅焦点/点击模拟）。
- pageshow 断言为合成事件；真实后台行为仍待用户验收。
- 渲染覆盖 bug 的显现依赖时序（重渲染落在焦点确立之后时才显现）；修复后该依赖消除，
  但真机时序仍待用户确认。
- Home/详情配图路径本 RC 未改代码；Home 行自带真实配图，详情用行/背景配图，
  未发现破损证据，仍待真机确认。

## 未动
- 后端、Docker、服务、凭据、授权、设备配置、稳定 RC19、既往发布、Codex 计划文件、
  `work-codex-*` 目录、订阅文件、代理栈。本地工作目录 `~/workspace/webhome-rc92/`（含构建脚本与 harness）。

## 父代理待办（本子代理止于推送前）
- 核验预览 URL、main SHA、暂存目录 `git status`、fast/raw、version.json、manifest；
- 提交（作者 `godroc <52899243+godroc@users.noreply.github.com>`）、打 tag
  `mirror-20261031-rc92-webhome`、推送；推送后验证 fast/raw 立即 200、Pages 约 75–85 秒后 200；
- 删除临时 clone；追加 DEPLOYMENT 已推送条目；更新 MEMORY；向用户交付 fast 链接、
  回退（RC91 preview 与 rc91.json）与上述真机待确认项。
