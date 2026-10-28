# WebHome RC55 — Muse 交接

- 候选，非稳定。稳定仍为 RC19，tv_tested false。
- 预览：https://tv.godroc.dpdns.org/next/previews/webhome-rc55-259506eb2862/main.json
- 入口：GG · 家庭资源库 [RC55]，157 站点。回滚：RC54 预览。
- GitHub：commit（待推送）+ tag mirror-20261028-rc55-webhome（待推送）。
- 相对 RC54 的改动（用户 2026-10-28 晚间三条反馈合一版）。

## 1. 长按编辑模式（替代 RC54 弹窗与历史删除层）

- 长按任意一张卡 → 进入编辑模式：该列表/整排全部卡片右上角
  出现红色 × 删除标志；再选中哪张就删哪张，可连续删多张；
  返回键退出编辑模式，不删东西。
- 收藏：真删（写回 favorites.v1、计数刷新、列表即时重渲染，
  删空后自动退出编辑模式、焦点回收藏导航）。
- 最近观看：本页隐藏（写回 gg.webhome.hidden-history-v1，宿主 App
  里的记录不动）；删后仍留在编辑模式，可继续删。
- 退役：RC54 的 favoriteDeleteModal 弹窗与接线、历史删除层
  openDeleteLayer/closeDeleteLayer 及三处 pendingHistoryRefresh
  守卫全部删除；三页弹窗标记同步清理。
- 安全：按住 800ms 才发 gg-longpress、松开不点卡；鼠标/触摸按住
  的后续点击仍被 suppressClick 吞掉，不会长按进模式当场误删。

## 2. 最近观看源名标志

- 历史卡片海报左上角常驻源名小 pill（编辑模式下与右上角 × 同时在，
  与原先豆瓣主页截图一致）。
- 来源：历史 key（站 key@@@片 id）→ 参考站表映射中文名（如玩偶）；
  查不到映射时直接显示原 key；无 key 时不显示。
- 新增 GGCore.sourceNameForKey(key, nameMap) 纯函数（单测覆盖
  映射/回退/空值/无分隔符）。

## 3. 首页字号整体放大

- 卡片标题 14→16px、年份 11→12px、源名 11→12px、评分 10→11px、
  状态 12→13px、分类页签 13→14px、排标题 18→20px；小屏媒体查询
  同比 +1px。标题为单行省略，不换行、不撑布局。
- 范围：发现页内容；顶栏/详情/设置不动。

## 夹具教训（本次实测）

- 旧 RC49 历史删除块的 `var histCard`（元素）覆盖了新块的
  `function histCard()`，调到 `histCard()` 时抛错、run() 无声夭折、
  报告为空。修复：旧块整段删除（删除层已退役），新 helper 改名
  firstHistCard，杜绝同名覆盖。
- 另：scp -r 多文件上传曾 stall 6 分钟以上；改走单文件 tar 包
  + 服务器解压，稳定快速。mv 进已存在目录会嵌套，mv 前必先
  rm -rf 目标目录。

## 验证

- 单元 88/88（新增 sourceNameForKey 4 项）；兼容 0 错误；构建 main sha
  46c27bd5da36fc2875548236b82a024b85dc4263aecd64c04024d8a77a71a6de。
- 浏览器夹具 128/128（编辑模式收藏 7 项 + 历史 7 项 + 源名 1 项
  + 字号 16px 1 项，其余全过；另有 chrome 重断言 6→7→8）。
- 7 张截图全过；01-home 目视：标题/源名/年份放大，无溢出裁切。
- 服务器 main SHA 与构建一致；GitHub 推送后 fast/raw/Pages 需复验 200。
