# WebHome RC49 — Muse Handoff (2026-10-28)

Preview: https://tv.godroc.dpdns.org/next/previews/webhome-rc49-c57113b6621e/index.html
Entry: GG · 家庭资源库 [RC49] · 157 sites · tv_tested false · rollback RC47
GitHub tag: mirror-20261028-rc49-webhome (commit by Muse, direct push per 2026-10-28 09:59 decision)

## Scope (user decisions 2026-10-28 14:09–14:29)

1. **只保留盘搜**：PanSou 已含 TG（实测：8892 嫁金钗 626 条中 262 条 tg: 来源；
   单独 tgsearch 第 1 页 35 条中 30 条已在 PanSou 内，剩余 5 条里 4 条是 t.me 链接、
   净增 1 条可用链接），且 tgsearch 腿 10–46 秒拖慢自建。故详情自建与家里搜索
   的 TG 范围全部去掉：自建 = PanSou 单源；家里搜索范围 chip 10 个（原 11）；
   设置里“来源顺序”字段删除；tgsearch 容器与网关 /device/tg/ 路由保持运行但
   页面不再调用（后续可一键停用，见下）。
2. **盘搜 tab 改走公开接口**：POST https://so.252035.xyz/api/search（参考项目
   PAN_DEFAULT_API，2026-10-28 实测存活，嫁金钗 99 条）。无密钥也能用；
   公开失败且已配密钥时回退网关 PanSou；公开失败且无密钥时报“公开盘搜暂不可用”。
   旧的 pstv 公开路由（实测 device_unauthorized）已删除。注意：公开接口是第
   三方服务，无 SLA，结果池小于自建（99 vs 626），只做盘搜 tab 的互补池，
   不做主力。
3. **结果排序（用户 14:10 截图投诉）**：core.js 新增 healthRank/resRank/rowOrder：
   可用性（ok > locked > 待检 > uncertain > bad）优先，同健康度内按标题质量
   （4K > 1080P > 720P > 无）排序，同级保持原顺序（WebView 66 sort 不稳定，
   用 seq 装饰）。资源自建组：首屏按质量排，检测完成后按健康重排（焦点在组
   内时跳过该组，避免抢焦点）；参考行：按健康 > 磁盘优先级 > 原序重排；
   盘搜/觅搜：渲染时按质量排（健康重排未接，因盘搜行不走 paintHealthDots）。
   预选仍只看磁盘优先级 + 健康（标题徽章永不参与预选，2026-10-27 决定不变）。
4. **自建状态文案修复**：自建快照消息改为以最新快照为准（旧的累积会把
   “TG：后台搜索中”永久残留）；updateSelfStatus 用 done||selfDone，避免
   后台追加把“已完成”打回“仍在查询”。
5. **TMDB 备用图片域名（用户 14:29 提问，实测有用）**：参考项目在
   image.tmdb.org 与 images.tmdb.org 之间切换；实测同一张原图两域名返回
   200 且字节完全相同（md5 一致）。RC49 接入：剧照候选链
   [直连， 直连备用域名， 中继， imageSource(直连)， imageSource(中继)]；
   主图失败时先试备用域名直连，再回落海报；image() 通用路径同理。
   候选单图仍 8 秒超时。

## RC48 继承（未变）

直连优先 + 两入口同一中继常量；每图 8 秒超时；预选 5 秒限时锁定 +
坏行撤离 + 徽章跟光标；参考跨站去重；盘搜↔觅搜去重；质量徽章词表；
5 秒后锁定的预选不含迟到来源（RC49 自建只剩 PanSou，迟到问题消失）。

## Verification

- Unit tests-rc49.cjs：78/78（含 rowOrder 7 项 + defaultSearchScope 改为 pan only）。
- Compat scan：0 errors。
- Browser fixture：104/104（含新增：排序比较器 2 项、自建/盘搜首行质量、
  范围 chip 10 个、家里搜索 3 条、countTg 元素已删）。
- Screenshots：7 张（03-detail、05-detail-tabs 目视确认：4K 首行、预选与光标同行）。
- Server：main/index/app/discovery/discovery.css HTTP 200 + main SHA 匹配。
- GitHub：fast/raw/Pages 200（Pages 传播延迟约 1 分钟，重查后 200）。

## Notes / open items

- tgsearch 容器与网关 tg 路由未删除：页面不再调用；如确认不再需要，
  停用命令：sudo systemctl stop tgsearch-gateway（网关）及 docker stop tgsearch；
  另：tgsearchers7 入群待办已无意义（该频道内容不再经页面呈现），
  除非把它配进 PanSou 自己的 108 频道里。
- PanSou 配置界面：我们部署的镜像不内置前端（8892 / 返回 404，8887 全程
  要 JWT，401 已验证）；参考站（so.252035.xyz）自带前端且搜索/打开不用登录。
  如需“像参考站一样”的可视化配置页，需另把 PanSou 前端部署到我们服务器
  （指 tv 实例可免登录，指 authed 实例需 JWT 登录），未在本版做。
- Mini-PC 部署未采纳：PanSou 后端本身 0.1 秒，瓶颈不在宿主；Mini-PC 只有
  电视 LAN 直连才快，但要重做鉴权与地址（且页与网关仍在 Oracle），
  收益约 0.3 秒/次，代价是第二套 TG 会话与配置同步、断电即断、站外不可用。
  Oracle 与 Mini-PC 均已 24/7 在线，能耗增量都约等于 0，不构成决策因素。
- Deferred（与 RC47 相同）：fm.cache 迁移未做；详情双体验未统一；
  真清晰度探针仍无；盘搜行健康重排未接。
