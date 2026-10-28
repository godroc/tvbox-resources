# WebHome RC51 — Muse 交接

- 候选，非稳定。稳定仍为 RC19，tv_tested false。
- 预览：https://tv.godroc.dpdns.org/next/previews/webhome-rc51-8fe0cf25d0c1/main.json
- 入口：GG · 家庭资源库 [RC51]，157 站点。回滚：RC50 预览。
- GitHub：commit（待推送）+ tag mirror-20261028-rc51-webhome（待推送）。

## 动因

用户 2026-10-28 在 RC50 详情盘搜页看到“盘搜公共暂不可用”。原因已查明，
不是电视问题：公开池 https://so.252035.xyz 本身不稳定——同一请求一小时内
测到过 200 成功 160 条、400、403、18 秒、30 秒超时。RC50 的预取失败一次
后本详情内不再重试，所以一直显示失败。自建不受影响（0.1 秒级、626 条）。

## 改动（相对 RC50）

1. core.js：新增纯函数 GGCore.panPublicErrorKind(status, ms)。
   ms>=29000 → 'timeout'；status 400/403/429 → 'http-<status>'；其余 → 'failed'。
2. app.js：searchPanPublic 不再裸 reject。成功回调内 parsePublic 的抛错被
   try/catch 接住 → {rows:[], ms, error:'failed'}；失败回调从 postRequest
   的错误信息里用 /（(\d+)）/ 提取状态码，经 panPublicErrorKind 分类。
   （postRequest 本身在 !ok 时抛“请求失败（<status>）”；fm.req 超时走
   ok:false/status:500，靠耗时区分超时。）
3. discovery.js：buildPanSection 新增重试按钮（class discovery-recheck-btn，
   文案“重试”，默认隐藏，插在状态行之后、磁盘页签之前）。非 need-key 的
   错误结果显示按钮；点击后重置 loaded/loading/stashed、状态回到“正在搜索…”、
   重新 load()；成功后按钮重新隐藏。need-key 不给重试（没密钥重试无用）。
   错误文案：timeout → “请求超时（对方太慢，点重试再试一次）”；
   http-* → “对方拒绝了请求（可能限流，点重试再试一次）”；
   其他 → “暂不可用（点重试再试一次）”；need-key 文案不变。
4. 单元测试 +6（panPublicErrorKind：29 秒超时、400/403/429、500→failed、
   无状态→failed）。夹具：mock 公共分支支持 window.__panPublicFailNext
   一次性失败（403）；fixture-run 在主详情打开前置旗，盘搜块改为断言
   拒因文案 + 重试按钮可见 → 点重试 → 恢复 3 条 + 秒数 + 按钮隐藏，
   其后徽章/页签/链接断言不变。

## 验证

- 单元 84/84；兼容扫描 0 错误；构建 main sha
  1cbf078c8ceeb3da2450ed2f7128b422f68b9f49bab7dfbbb4c9dcbc28647646。
- 浏览器夹具 103/103（含 4 条新断言：拒因文案、重试按钮可见、重试后恢复、
  按钮隐藏）。7 张截图，05-detail-tabs 目视正常（资源模式、预选在焦点行）。
- 夹具过程记录：前两次运行失败均非代码问题。第一次 NO-REPORT（页面未载入）；
  第二次重载跑出 app.js:12 读 C.disks 抛错，根因是隧道 520/502 + 证书无效
  导致 core.js 未载入（该行是 RC50 已有代码，C 未定义时必崩）。抖动过后
  （core.js/app.js/fixture.html 公网均 200）第三次重跑 103/103。
- 服务器 main SHA 与构建一致；GitHub 推送后 fast/raw/Pages 需复验 200。

## 已知与未做

- pan 模式健康重排仍未接线（圆点不重绘），与 RC50 相同。
- 公开池仍是第三方演示站、无 SLA；RC51 只做到失败可见 + 可重试，
  不保证池子本身可用。自建（设备密钥）仍是最稳的盘搜来源。
- fm.cache 迁移、真实清晰度探针、详情统一下一步均未做。
