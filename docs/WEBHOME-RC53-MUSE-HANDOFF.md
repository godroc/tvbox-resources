# WebHome RC53 — Muse 交接

- 候选，非稳定。稳定仍为 RC19，tv_tested false。
- 预览：https://tv.godroc.dpdns.org/next/previews/webhome-rc53-114af2f706b5/main.json
- 入口：GG · 家庭资源库 [RC53]，157 站点。回滚：RC52 预览。
- GitHub：commit（待推送）+ tag mirror-20261028-rc53-webhome（待推送）。
- 相对 RC52 唯一改动：返回后 App 横幅不再卡住（其余代码与 RC52 一致）。

## 动因（用户 2026-10-28 实拍）

返回时电视顶上出现紫色 App 横幅（MO GG·家庭资源库 [RC51] + 时钟，
即 WebHTV App 自带的站点头栏，非页面内容），且之后再也回不到全屏。

## 根因

- 页面启动时确实申请过全屏：applyChrome 调 fm.ui.setChrome
  （电视 tv-full / 非电视 edge，restoreAffordance:'none'）。
- 但 applyChrome 有去重守卫（chromeRequest 与 mode 相同即直接返回），
  只发一次。App 在返回键时自己退出沉浸模式、拉出横幅——页面侧的返回
  处理本来就已正确吞掉按键（导航、详情、设置三路均 preventDefault +
  stopImmediatePropagation），横幅是 App 层行为，页面吞键拦不住。
- 横幅拉出后，页面再也不重申：去重守卫挡住，且 fmresume → probeBridge
  → applyChrome 这条现成的恢复链也被同一守卫废掉；restoreAffordance
  为 none 又意味着 App 不给用户手动恢复全屏的入口，于是横幅卡死。

## 改动（app.js 两处）

1. applyChrome 删去重守卫：每次调用都实发 setChrome（chromeRequest
   仍记录，供 GGApp.inspect() 查看）。调用方本就低频（启动、设备识别、
   桥接点击、恢复），无刷屏风险。
2. 新增返回键重申：document keydown（capture）监听 Escape /
   BrowserBack / GoBack（含 keyCode 4），300ms 防抖后 waitSdk +
   applyChrome（当前 gg-tv 状态）。延迟是让 App 的拉横幅动作先落定，
   再由页面压回去，避免时序竞跑。fmresume 不用另加监听——原有
   resumeBridge → probeBridge 链在去重删掉后已能重申。
3. restoreAffordance 保持 'none' 不动：不给 App 额外恢复按钮添乱，
   恢复全屏改由页面重申负责。

## 验证

- 单元 84/84；兼容 0 错误；构建 main sha
  ad3b94ff6c56df14b1c6ff93013e82dc17268f98e6f885cf726b3e47fa72d771。
- 浏览器夹具 120/120（RC52 的 118 项全过 + 2 项新增）。新增：夹具 fm
  加 ui.setChrome 记录器（window.__chromeCalls）；末尾断言返回键后
  调用数增长（3 → 4）、fmresume 后再增长（4 → 5）。3 的构成可对账：
  启动 probeBridge 1 次 + 设备识别 1 次 + 设置两段返回两次按键防抖
  合并 1 次。
- 7 张截图，01-home 目视无回归。
- 服务器 main SHA 与构建一致；GitHub 推送后 fast/raw/Pages 需复验 200。

## 诚实边界

- 真机上横幅是否 300ms 内压回、以及 App 是否在某些返回路径上
  （如连续快按返回、从播放页返回）仍有别的拉横幅行为，需用户在电视
  上实测确认；夹具只能证明页面侧重申调用确实发出，不能模拟 App 的
  横幅行为。
