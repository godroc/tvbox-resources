# WebHome RC54 — Muse 交接

- 候选，非稳定。稳定仍为 RC19，tv_tested false。
- 预览：https://tv.godroc.dpdns.org/next/previews/webhome-rc54-d4efa35c7ee3/main.json
- 入口：GG · 家庭资源库 [RC54]，157 站点。回滚：RC53 预览。
- GitHub：commit（待推送）+ tag mirror-20261028-rc54-webhome（待推送）。
- 相对 RC53 唯一改动：收藏列表长按删除（其余代码与 RC53 一致）。

## 动因（用户 2026-10-28）

收藏里的资源删不掉。此前唯一删除路径是打开该条详情、点“取消收藏”，
列表里没有任何删除入口。

## 改动

- app.js makeResource：收藏模式下卡片带 data-gg-longpress='favorite'
  并监听 gg-longpress（复用导航 800ms 按住确认键的长按机制，与历史
  删除同一套）；监听里按 dataset.id 现查 favorites，查到才开框。
- app.js updateResource：每轮按当前 state.favorites 开关该属性，搜索
  视图里的同 id 卡片不会带长按标记（reconcile 会复用节点，只在创建时
  挂标记不够，必须每轮校正）。
- app.js + index.html：新增 favoriteDeleteModal（删除收藏？+ 条目名，
  取消在前、删除在后；无 × 按钮，故 openModal 自动聚焦取消，避免误触，
  与历史删除框的 RC44 教训一致）。返回键、× 语义均由现有层逻辑覆盖
  （层分支点 data-close 的取消按钮关闭）。
- 删除是真删：filter 掉该 id → 写回 favorites.v1 → 收藏计数刷新 →
  收藏视图内即时重渲染 + toast“已删除收藏”；删后焦点落到首张剩余
  卡片，无剩余则回收藏导航。
- 防卫：openFavoriteDelete 先判弹窗存在、确认按钮接线先判元素存在；
  任一页面变体缺弹窗时功能降级，不致挂载抛错拖垮整个应用（本次即因此
  修了 fixture-shot.html：首版截图页因缺弹窗致挂载抛错、GGApp 未定义、
  截图超时；已补齐三页弹窗）。

## 验证

- 单元 84/84；兼容 0 错误；构建 main sha
  7d4e33a76134d6abee364d43457ad73abb17f05ae43f9fab1c31ec61ba1a486a。
- 浏览器夹具 128/128（RC53 的 120 项全过 + 8 项新增）。新增：收藏卡
  渲染、长按标记、长按开框、框内条目名、取消保留、确认删除、计数归 0
  （另有 1 项为既有历史删除断言在新跑法下的正常通过）。
- 7 张截图全过。
- 服务器 main SHA 与构建一致；GitHub 推送后 fast/raw/Pages 需复验 200。
