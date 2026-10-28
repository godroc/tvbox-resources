# WebHome RC47 — Muse 交接

- 基线：RC46（预览 `webhome-rc46-0a151e42fa6f`，GitHub tag `mirror-20261028-rc46-webhome`）
- 本轮：RC47（预览 `webhome-rc47-1f006cc61a54`，main sha256 `981370ca858be7eeba687a4469b369e0c02e2327b9e32b9f26e6af5fada77633`，157 站）
- 入口：GG · 家庭资源库 [RC47]
- 回退：RC46 预览（见下方）
- 状态：候选，`tv_tested: false`；稳定版仍为 RC19，本轮不覆盖任何旧版本。
- 优先级（按用户本轮指令）：背景黑屏 → 盘搜接口与状态语义 → 受限并发预搜索 → 按钮 UI → 检测与排序完善。

## 一、根因

### 1. 背景黑屏（5 个并存原因，均在 RC46 discovery.js）
1. `applyBackdrop` 直接改在用 img 的 `src` 上，且换类（poster-only → has-art）先于图片到达：原图尺寸加载慢的窗口里，元素是空白，盖在深色遮罩上即黑屏。
2. 轮播 `showStill` 同 tick 内设 `src` 又清 opacity，无 onload 门禁；旧图按固定 700ms 移除，不管新图是否载入；新图 onerror 时移除新图并恢复旧图，但旧图的 700ms 移除定时器仍会触发 → 最后连一张背景图都不剩 → 黑屏。
3. 轮播剧照 URL 只用直接 `image.tmdb.org/t/p/original`，绕过了 RC45 的中继与 imageSource：电视端直连失败时，首张（经中继成功）出现一下、后续全失败 → “出现一下后变黑”。
4. 全部 TMDB URL 固定 `/t/p/original`，无按屏选图。
5. TMDB IIFE 在 `row.backdrop` 存在时直接返回，豆瓣自带背景图无失败恢复；初始背景图失败后被 image() 的 onerror 隐藏，poster-only 面板配深色底即黑屏。另：原 `applyBackdrop` 的 tryNext 无 detailGen/modal 守卫。

### 2. 盘搜连接失败（决定性证据）
- 服务器本地 `POST http://127.0.0.1:8892/api/search` → 200（原始 pansou-tv 匿名可用）。
- 公共 `POST https://pstv.godroc.dpdns.org/api/search` → `{"error": "device_unauthorized"}`：公共 pstv 路由走的是 pansou-tv 设备守卫（8890），不是原始 8892。
- 时间线：电视端 spider 在 2026-10-21 验证通过（设备密钥之前）；守卫随 2026-10-26 设备密钥工作上线；RC46 仍按旧开放路由假设。
- **决策：不动隧道路由（用户的安全边界）。修法 = 盘搜走设备鉴权网关（与自建 pan 同路由）。** 盘搜模式的检测（checkLinksOpen → 公共 pstv /api/check/links）同因守卫而静默全 unknown，本轮一并改走统一检测决策。

### 3. 黄色结果（觅搜结果呈黄但可播）
- RC46 圆点映射：后端 PanSou 检测返回 `unknown/timeout` → `uncertain` → 琥珀黄 `#f5b942`。觅搜链接后端无法确认 → unknown → 黄，但链接本身可播。**黄 ≠ 失效。**
- 另一处错位：`locked`（需提取码/登录）此前也被标红；按技能与参考实现，locked 仍可播，应为黄。

### 4. 检测调用链（本轮核查结论）
- RC46 自建/参考行只走**后端独立检测**（app.js checkLinks → 网关 /device/pan/api/check/links → pansou-tv 8892），从未调用宿主 `fm.pan.check`。两套结论可能冲突（不同引擎、不同缓存）。
- 参考实现（玩偶 53.0 + devkit）：先读 `fm.config()` 的 driveCheck，关则不检；分批 10 条；仅隐藏确认失效。

## 二、改动

### 背景引擎重写（discovery.js）
- `sizeForScreen()`：宽 ≤820 用 `w780`，否则 `w1280`；不再固定 original。
- `backdropCandidates(path)`：候选顺序 = imageSource(直连) → 直连 → imageSource(中继) → 中继，去重。
- `preloadCandidates`：离线 `img` 预加载，按序试候选；**成功才换图，全部失败不碰现有画面**（海报英雄与类名原样保留）。
- `setHeroImage(probe, fade)`：换图时复制旧图 `dataset.ggStills`，更新 `detailWallPic`，仅成功时翻 poster-only → has-art；淡出旧图先入 `retiredHeroes` 列表，下次换图时先清，防止泄漏。
- 轮播改存 TMDB `file_path`（不再存 URL），每张按候选级预加载；失败保留当前图并照常排下一轮；`g!==detailGen || modal.hidden` 时停播。
- 中继兜底统一：`relayBase` 在 GitHub Pages 入口下回退到绝对源 `https://tv.godroc.dpdns.org`（RC45 中继只覆盖服务器页面，本轮补齐加速入口；/tmdb-api/ 与 /tmdb-img/ 均为公开 nginx 位置，无鉴权）。
- 海报兜底：有 backdrop 又有不同 poster 时，首张失败先回 poster，二次失败才走原 image() 的 img2→img1 换源再隐藏+文字链。
- `detailWallPic`：打开时取 `row.backdrop || ''`，每次成功换图更新，关闭时清空；自建行、盘搜行、参考分享的播放调用均携带 `wallPic`；app.js 的 `play/playDirect` 把 pic+wallPic 传给 `fm.pan.play`，并在不阻塞点击的前提下调 `fm.preloadArtwork(pic, wall)`；`fm.play` 兜底同样传 `{pic, wallPic}`；`playShareDirect` 在 normalize 后恢复 wallPic。按技能：无 wallPic 时播放器用 App 默认背景，**不用 pic 兜底**。

### 盘搜改走设备鉴权网关（app.js + discovery.js）
- 新增 `searchPan(title)`：无有效密钥时以 `kind='need-key'` 拒绝；否则走与自建相同的 `request('pan', …)`（含 202-pending 重试，上限 3 次、退避 min(8000, 2000·2^attempt)）。
- 盘搜模式状态：need-key → “盘搜需要设备密钥（设置中填写后可用）”；其他失败 → “盘搜暂不可用”。匿名 pstv 尝试已删除。

### 受限并发预搜索（discovery.js）
- 详情打开时立即启动盘搜与觅搜预取（受设置 `prefetchPan/prefetchMipan` 控制，默认 true；设置页新增两项复选框）。
- 预取队列：同一详情内最多 2 个并发启动；任务带打开代号，取队时过期丢弃；关闭详情清空未启动任务；已发出响应以代号隔离，旧响应不覆盖新影片。
- 预取缓存：键 = 片名|年份|类型|来源|磁盘顺序签名，TTL 10 分钟，上限 30 条 FIFO；失败不缓存。
- 有效网络并发 ≤3：自建/参考/盘搜走 app.js schedule（上限 2），觅搜 postRequest 旁路（+1），符合指令初值 2～3。
- 切换标签直接渲染已缓存结果；在途时显示“正在搜索…”但**不清空已有内容**；未预取完成时显示进度。
- 不聚合全部订阅站点：仅默认资源（自建+参考）+ 盘搜 + 觅搜；原生搜索通道不动。

### 状态语义与排序
- 圆点颜色（CSS 已改，图例见详情页来源区下方，不在 sources-heading 内以免破坏夹具断言）：
  - 绿 `#3ddc84` = 检测有效（ok）
  - 黄 `#f5b942` = 需密码/登录（locked），仍可播
  - 灰白 `rgba(255,255,255,.45)` = 待确认/未检测（uncertain、limited），不是警告
  - 红 `#e5484d` = 已确认失效（bad），**仅此一种为红**
  - unsupported = 隐藏圆点（参考实现同款）
  - idle = 底灰 `#6b7280`（未检测）
- 图例文案：`绿=检测有效 · 黄=需密码/登录 · 灰=待确认/未检测 · 红=已确认失效`，右侧有“重检”按钮：清除可见候选的检测标记、圆点回 idle、重跑资源+盘搜模式检测。
- 检测模式决策（app.js `getCheckMode`，每页缓存一次）：
  - `fm.config().driveCheck === false` → `off`：宿主与后端检测全跳过，圆点保持 idle，行全部可见。
  - `driveCheck === true` 且 `fm.pan.check` 为函数 → `host`：宿主检测优先；仅提交 11 种网盘类型；按下标匹配、按归一化 URL 兜底；状态直映 ok/bad/locked/uncertain/unsupported；未提交项记 unsupported。
  - 其他（无配置、无 pan.check、driveCheck 未定义、任何异常）→ `backend`：沿用原 checkLinks，保留旧 App/浏览器预览行为。
- **不隐藏任何行**（与参考实现不同，参考隐藏 bad/locked/uncertain；本轮保持 RC43 以来的“圆点只提示”策略，仅在交接中说明差异）。检测超时保留 unknown，不视为失效；接口异常、缺授权、不支持检测均不视为失效。
- 预选排序（core.js `rankPreselect` 重写，**本轮指令优先于 2026-10-27 的“检测 OK 优先”计分**）：
  1. 磁盘优先级（用户设置）升序；
  2. 同盘内健康 tiebreak：ok 0、locked 1、未检测 2、uncertain/limited/unsupported/unknown 3、bad 4；
  3. 已验证清晰度（verifiedClarity，仍恒为 null，占位）；
  4. 稳定顺序。
  - 已确认失效在有任何非失效候选时**永不胜出**；全失效时回落到磁盘顺序。标题声称（如 4K）与来源标签仍不计入清晰度。
  - 异步检测更新不移动焦点：preselectFrozen 与 preselectFocusDone 机制不变。

### 按钮 UI（discovery.css）
- `.discovery-all-sources`（显示简介/查看全部来源）由浅色大 pill（padding 8px 13px、#e6ebef 底、#111 字、3px 圆角）改为紧凑次级：padding 7px 12px、rgba(255,255,255,.07) 底、1px 半透边框、14px 圆角、12px 字；聚焦时底色加深 + 原有 outline 保留。手机 ≤390px：padding 6px 10px、11px 字。最终高度约 31px（电视遥控可操作性的下限折中，未再缩小）。
- 简介段落不做右侧留白改动（按钮本就位于段落下方的来源标题行，技能“简介用足宽度”已满足）。

### 检测接口返回值（供复核）
- 宿主 `fm.pan.check([{type, url, password}])` → `results[i] = {type, url, normalized_url, state, cache_hit, checked_at, expires_at, summary}`，state ∈ ok/bad/locked/unsupported/uncertain；宿主内部按 10 条分批、缓存 ok 1h / bad 6h / locked 12h / uncertain 30min；App 检测开关关闭时宿主直接拒绝调用（故必须先读 driveCheck）。
- 后端 PanSou `/api/check/links` → `parseCheckResults` 归一化：ok/bad/locked/rate_limited/unsupported/unknown；rate_limited 映射为 limited（灰白），unknown/timeout 映射为 uncertain（灰白）。
- 三层区分（界面与交接均不混淆）：分享检测有效 ≠ 可列出文件 ≠ 实际起播成功。起播成功只记时间，不永久保证可用（本轮未实现播放反馈记录，见未解决项）。

### 其他
- 兼容扫描：新增本地等价扫描器 `compat-scan.cjs`（Silent1566 扫描器的模式列表，JS 文件先经分词器剥离注释/字符串/正则字面量再查运算符，避免拼音数据串与注释省略号误报；planted `??` 样本验证可检出）。14 个应用文件：**0 错误**。警告说明：CSS min/max 命中全为 `minmax()`（网格函数）；`gap:` 命中为旧属性名 `grid-gap`；backdrop-filter 配 rgba 实色兜底；catalog.js 的 globalThis 为 typeof 守卫；styles.css 的 safe-area 在 @supports 内用 max() 而非相加。
- 多文件页面故无行内 ES5 bootstrap/markers（扫描器 bootstrap 标记项不适用，见交接说明）。

## 三、验证证据（模拟测试，与电视实测分开记录）

- 单测 `node tests-rc47.cjs`：**65/65**（新增 9 项：w1280/w780 尺寸 URL、uncertain 直通、rankPreselect 五项：跨盘磁盘优先、同盘 ok 胜出、同盘 locked 胜 uncertain、bad 永不胜出、全 bad 回落磁盘顺序）。
- 浏览器模拟（headless Chrome + 本地 CONNECT 代理 + 公共夹具页）：**97/97**，新增断言均通过：
  - 盘搜/觅搜切换后 100ms 内已是最终条数（“盘搜：3 条”“觅搜：2 条”，非“正在搜索…”）→ 预取成立，非懒加载；
  - 盘搜卡片质量徽章 4K、夸克 tab 去重 2、URL 行含 dup123（网关数据集）；
  - 圆点六态计算样式：绿 rgb(61,220,132)、黄 rgb(245,185,66)、灰白 rgba(255,255,255,.45)、红 rgb(229,72,77)、unsupported hidden、按钮底 rgba(255,255,255,.07)/12px；
  - 图例文案与重检按钮存在；
  - TMDB 好路径：has-art、经尺寸预加载换图（mock res 落点 shot-poster.svg）、stills=3；
  - **TMDB 失败路径：重开同卡、全部候选 404 后面板仍 poster-only、背景仍为豆瓣海报（无黑屏）**；
  - 旧断言全部保留通过：透明来源面板/行、磁盘 tab 预搜索不重查、模式切回资源可见、拼音首字母建议等。
- 截图 7 张（shots/）：01-home、02-search、03-detail、04-filter、05-detail-tabs、06-detail-synopsis、07-delete-dialog。03-detail 可见紧凑深色按钮 + 图例 + 重检；05-detail-tabs 可见绿点、4K/1080P 徽章、预选行。
- 服务器预览：main/index/app/discovery/discovery.css 200，main SHA 与构建一致，157 站，GG 名正确。
- **电视实测：未做。** 需用户在电视上验收：背景轮播连续切换/切影片/关闭重开/播放返回是否仍有黑屏；盘搜是否出结果；黄点语义是否符合观感；按钮在遥控聚焦下是否清晰；预取在电视网络下是否拖慢前台。

## 四、未解决项

1. 预取缓存与设备密钥轮换的残余：盘搜现走密钥门禁，但详情页预取缓存无密钥轮换钩子——同页会话内换密钥后，缓存的盘搜行仍可显示（app.js 自身搜索缓存会在换密钥时清空，discovery 预取缓存没有）。可接受（缓存仅本页会话、TTL 10 分钟），或后续在 mount 选项中加密钥世代并混入缓存签名。
2. fm.cache 迁移未做：技能建议持久态优先 fm.cache、localStorage 仅作预览/一次性 UI；当前偏好与历史抑制仍用 localStorage，可用但建议后续迁移（不在本轮范围）。
3. 站点健康统计与实际播放反馈未实现：仅作为调度参考记录在案，不替代单条链接检查。
4. 真实清晰度探针仍无：verifiedClarity 恒 null；标题声称永不计入。
5. 首页详情与 app.js 分享弹窗仍是两套详情体验，统一化继续延期。
6. 盘搜/觅搜在电视上的实际延迟与限流表现未知：并发初值 2（预取启动）+ 有效网络 ≤3，待电视测试后调整。
7. 旧版 App（无 fm.pan.check、无 driveCheck 字段）走 backend 兜底，未在旧版上实测。

## 五、地址

- 服务器预览：https://tv.godroc.dpdns.org/next/previews/webhome-rc47-1f006cc61a54/main.json
- 服务器入口页：https://tv.godroc.dpdns.org/next/previews/webhome-rc47-1f006cc61a54/index.html
- GitHub（本轮推送后）：见提交记录，tag `mirror-20261028-rc47-webhome`
- 回退：RC46 预览 https://tv.godroc.dpdns.org/next/previews/webhome-rc46-0a151e42fa6f/main.json（稳定版 RC19 不动）

## 六、备份与登记

- 本轮工作目录：`~/workspace/webhome-rc47/`（构建脚本、单测、夹具、扫描器、截图均在内）。
- 服务器预览目录新建，未动旧预览；nginx 配置本轮未改（RC45 的 /tmdb-api/、/tmdb-img/ 中继沿用）。
- DEPLOYMENT.md 已登记本轮条目。
