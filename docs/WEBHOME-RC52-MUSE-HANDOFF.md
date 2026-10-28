# WebHome RC52 — Muse 交接

- 候选，非稳定。稳定仍为 RC19，tv_tested false。
- 预览：https://tv.godroc.dpdns.org/next/previews/webhome-rc52-e88484947613/main.json
- 入口：GG · 家庭资源库 [RC52]，157 站点。回滚：RC51 预览。
- GitHub：commit（待推送）+ tag mirror-20261028-rc52-webhome（待推送）。

## 动因（用户 2026-10-28 晚间连续反馈）

1. 首页选中热门电影/热播剧集后筛选直接弹出；应为选中后按确认才出，默认不出。
2. 设置里输入框聚焦弹出键盘时按返回直接退出设置；应为先收键盘，再按返回才退出。
3. 首页海报下片名字体小（实拍图确认即 .discovery-title）。
4. 详情模式页签（资源/盘搜/觅搜）的焦点光标不明显：选中觅搜时只见两条绿色
   竖杠，没有上下的横杠。
5. 搜索字母键盘两排排布不均（23+14），且输入字母后不出候选词。

## 改动（相对 RC51）

1. discovery.js：删掉分类页签的 focus 切页监听，只留 click（确认）切页。
   焦点只高亮，不切分类、不出筛选；按确认后才进分类并出筛选。routeReplace
   变量仍在 setRoute 里引用，恒为 false，无其他影响。
2. navigation.js（主路径）+ app.js keyNavigation（兜底路径）：返回键分支中，
   若当前焦点是文本输入框（TEXTAREA，或非 checkbox/radio/submit/button 的
   INPUT），先 blur（收键盘）并吞掉这次返回，不关闭层；焦点不在输入框时
   第二次返回才关闭层。SELECT 的既有先关下拉行为不变。
3. discovery.css：.discovery-title 12px → 14px（片单页签与浏览网格两处）；
   年份 11px 不动。
4. discovery.css：新增 .discovery-mode-tab:focus{outline:none;box-shadow:
   inset 0 0 0 2px #e5edb5}。根因：全局 button:focus 是 3px 外轮廓，而
   .discovery-mode-tabs 是 overflow-x:auto（纵向按 auto 裁剪），轮廓上下边
   被裁掉，只剩左右两条竖线；内嵌阴影画在按钮框内，永不被裁。
5. app.js：字母键盘改 4 排（A-J / K-T / U-Z+0-3 / 4-9+退格+清空，
   10/10/10/8，共 38 键）；styles.css 新增 .letter-picker-row
   {flex:0 0 100%}，否则行 div 会被父级 flex 并排（首版截图即因此仍是
   两行，已由“四行纵向排布”断言 + 截图双重确认）。
6. app.js：候选词两处修复。(a) 豆瓣 suggest 请求补 Referer
   https://movie.douban.com/（此前无 Referer，电视端大概率被拒且静默吞错，
   本地池为空时即无候选）。(b) 候选池并入当前已加载的片单标题
   （discoveryTitles()，读 .discovery-rail/.discovery-grid 的 .discovery-title，
   去重、上限 60），本地与远程重渲染均用合并池；首字母前缀匹配本身无问题。

## 验证

- 单元 84/84；兼容 0 错误；构建 main sha
  0a189d693ee674461b1fea87d6a73542ea9425cb8a202784fd5f4cdd4fa8ce49。
- 浏览器夹具 118/118。新增断言：片名 14px；页签聚焦落点 + 聚焦不切分类；
  键盘 38 键、4 行、10/10/10/8、四行纵向排布（tops 245/288/331/374）；
  片单池（CS 命中测试影片A/B，本地池无此二者）；模式页签聚焦落点 +
  内嵌焦点框（rgb(229,237,181) 2px inset）；设置打开、输入框聚焦、
  第一次返回仅失焦设置仍开、第二次返回关闭。
- 7 张截图；02-search 目视确认 4 排键盘 + 候选词条。
- 夹具过程记录：首跑设置块失败，根因是夹具页 settingsModal 缺 tmdbKey /
  prefetchPan / prefetchMipan 三字段致 openSettings 抛错（真机 index.html
  字段齐全，无此问题）；已补齐夹具表单。另：代理须先于浏览器启动
  （相对路径起代理会报模块找不到），以及 scp 上传后须显式 mv 到预览目录名
  （直接 mv 到 previews/ 会保留 rc52-publish* 原名）。
- 服务器 main SHA 与构建一致；GitHub 推送后 fast/raw/Pages 需复验 200。

## 远程输入分析（用户要求“分析一下”，未做实现）

结论：能做，但宿主 App 没有现成通道；三条路（均为建议，非决定）：

- A. 电视系统自带手机遥控键盘（零开发）：安卓电视的手机遥控 App 在系统层
  模拟输入，所有 App 通用；取决于他的电视/手机是否支持，不在页面控制内。
- B. 自搭远程输入页（建议的集成方案）：手机开我们服务器上的输入页 →
  经设备密钥鉴权的网关 → 电视页轮询取回 → 填入当前焦点输入框。复用现有
  设施（tvbox-web、设备密钥鉴权网关、预取轮询模式）。要做：网关加
  “待输入文本”接口（写/读/清）、电视页轻量轮询器（仅有输入框聚焦时取）、
  手机端极简输入页。鉴权必须做（设备密钥或一次性配对码），绝不能无鉴权，
  否则任何人能往他电视上打字；公网暴露须再加限流。延迟 1–2 秒（轮询），
  够打字用。约 1 个 RC 的量，不碰代理栈。
- C. 不推荐常驻 WebSocket/长连接：更实时但要多一个常驻服务，且电视
  WebView 后台行为不确定；轮询已够用。
- 最痛的场景是设置里 43 位设备密钥、TMDB 密钥这类长串输入，遥控逐字敲
  很痛苦；远程输入一次解决。需他定的事：做不做、鉴权方式（沿用设备密钥
  vs 一次性配对码）、手机页放公网还是仅局域网（仅局域网更安全但手机须与
  电视同 WiFi）。

## 已知与未做

- 远程输入未实现，等用户定方案。
- pan 模式健康重排仍未接线；fm.cache 迁移、真实清晰度探针均未做。
