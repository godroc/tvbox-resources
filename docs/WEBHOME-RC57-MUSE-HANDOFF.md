# WebHome RC57 — Muse Handoff

- Preview: https://tv.godroc.dpdns.org/next/previews/webhome-rc57-ece0b5a1c7e3/main.json
- Entry: GG · 家庭资源库 [RC57]
- Rollback: RC56 preview (webhome-rc56-b00b7ec820f9). Stable still RC19, tv_tested false.
- GitHub: (commit filled after push)

## What changed (all from the user's 2026-10-28 evening refinements)

1. **搜索返回先收键盘**：搜索输入框聚焦时按返回，先 blur（收起系统键盘）、留在搜索界面，焦点落到首个字母键，可继续下移。设置弹层早已有 blur-first，缺口只在搜索屏。诚实边界：若电视上首次按返回仍直接退出，说明 App 在页面之前吞掉了返回，需用户反馈。
2. **首页顶栏收紧 + 图标放大**：TV 顶栏 56→50px；品牌标 30→34px；设置齿轮 22→24px（styles.css 规则优先，discovery.css 同步）。
3. **分类筛选 toggle**：同一分类页签按一下出筛选、再按一下隐藏（不重载）；切到别的分类时恢复显示；翻页/点筛选芯片保持当前隐藏状态。
4. **长按删除阈值 800→500ms**：navigation.js（收藏卡片）与 discovery.js startHold（最近观看）两处。夹具直接派发 gg-longpress，绕过计时器，故真机 800ms  hold 未被夹具覆盖——这是此前两处同时不显示删除标的头号嫌疑；另请确认已切换到 RC57 入口（旧入口 RC51–RC54 无此编辑模式）。
5. **收藏海报**：makeResource 改走 imageSource（fm.res + 豆瓣 Referer），与详情卡片一致；此前直出 row.image 遇豆瓣 418 被 onerror 摘掉，只剩字母。
6. **联想按原生匹配**：Douban suggest 的远程结果不再过本地 rankSuggestions 重滤，改为远程原序在前、本地联想补位，总数 ≤8。本地池仍是近期 + 收藏 + 当前 DOM 标题（≤60），超 3 字母无匹配的根因是目标不在本地池。
7. **原生搜索按钮**：搜索框新增“原生搜索”按钮（type=button，不提交表单），一键把当前词交给 App 原生搜索；本站搜索仍是主提交。注意：原生聚合不含盘搜/觅搜（quickSearch 均为 0），它只补订阅站点的覆盖，不能替代本站搜索。
8. **详情新增“趣盘”页签**：资源 / 盘搜 / 觅搜 / 趣盘。趣盘 = 订阅站点“趣盘 • 搜索”（csp_QuPanSo）的后端——dex 实测：POST https://b.funletu.com/search，JSON {keyword, categoryid:0, filetypeid:1, courseid:1, page:1, pageSize:15, sortBy:'sort', order:'desc', offset:0}，头 Content-Type/Origin/Referer；回 {code:200, data:{list:[{url, title（可含 <em> 高亮，已剥离）, extcode（提取码）, size}]}}。按 host 映射盘类型（quark/uc/baidu/aliyun/115/xunlei/123/tianyi/pikpak），走 GGCore.normalize，复用 buildPanSection（盘签、检测、重试齐全）。去重：自有 qupanRendered 集合，只对盘搜去重（照觅搜规矩），不影响盘搜/觅搜。首次点开时现搜（未进预取，预取预算与设置开关不动）；失败返回 {rows:[], error:'failed'} 走重试按钮分支，不 reject。
   位置说明：趣盘放在详情页签（与盘搜/觅搜同属“为片名找网盘分享”的流程），未放搜索屏；搜索屏仍是参考站点找片，点进详情后四个页签找分享。

## Verification

- Unit 88/88；compat 0 errors；fixture 157/157（RC56 的 141 + 新增 16：搜索返回 5、原生按钮 1、顶栏 4、筛选 toggle 3、趣盘 3）；7 screenshots 全过，01-home 目测顶栏收紧无溢出，02-search 目测双按钮无错位。
- 上轮 147/150 的 3 个 FAIL 均已闭合：tmdb has-art 为偶发（本轮通过）；搜索返回 2 项是夹具未先点 searchNav（隐藏输入框 focus 静默失败），已修正为真实用户路径。
- 服务器预览 main/index/app/discovery/discovery.css 均为 200，main SHA 与本地构建一致。
- 旧 RC57 半成品目录与临时夹具目录已删；RC56 预览保留作回滚。

## Payload

- /opt/services/tvbox-next/work-muse-rc57/（main.json + 14 app files）
- Work dir: ~/workspace/webhome-rc57/（publish/、shots/、fixture-run.js、fixture-mock.js）
