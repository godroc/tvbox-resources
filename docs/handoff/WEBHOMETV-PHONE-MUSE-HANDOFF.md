# WebHomeTV 本地 RC118 手机输入与推送交接

2026-11-09。MiniPC 的 RC118 局域网候选原地址已加入手机键盘与推送。GitHub 和 Oracle 的 RC118 发布包保持原样，仓库与 Oracle 留存本交接。

- 电视导入地址 `http://192.168.50.252:8100/webhometv/preview/rc118/main.json`。旧键盘试用入口也兼容新配对方式。
- 手机固定地址 `http://192.168.50.252:8100/k/`。二维码编码相同的固定地址。电视在设备设置打开「连接手机键盘」。手机发现电视并申请，电视端选择允许或拒绝。多台待配对电视时手机选择电视编号。旧的六位码已取消。
- 手机输入与推送在电视确认前不可用。字段焦点变化时拒收旧目标文字。HTTP 阻止远程输入密码与密钥，可信 HTTPS 后续验收。
- 手机推送不需要输入焦点。电视从「推送」选用链接，再按「交给播放器」。收件箱每会话最多 8 条、30 分钟有效，保存在进程内存。
- 源码在仓库 `tools/webhometv-remote-input/`，二维码依赖 `qrcode==8.2`。MiniPC 使用 `/opt/services/webhometv/input-service/` 内的 wheel。
- 回退备份 `/opt/services/backups/webhometv/before-rc118-code-free-pair-20261109/`。将 `server.py` 还原到 `input-service/`，`index.html` 还原到 `site/webhometv/keyboard/`，`rc118-index.html` 与 `rc118-manifest.json` 分别还原为 RC118 目录的 `index.html` 与 `manifest.json`，`legacy-remote-input.js` 还原为旧 keyboard 预览目录的 `remote-input.js`。重启 Compose 的 input 服务。

浏览器双页面与 API 实测覆盖固定地址、电视审批、审批前拒绝输入和推送、中文填字、收件箱、HTTP 密钥拦截。真实电视遥控、手机相机扫码和原生播放器起播待验收。

源码 SHA-256

- `server.py` `81c320c5921e89a7fc3c8122104a73c9805e1086d46696e78378de7962ffb1d5`
- `remote-input.js` `1f81a10219796fa8f7fb25c6198dbdaf7e80a77354991e28c25bd0f27a0be932`
- `keyboard.html` `2a5921249b852e5fe244afd9fa51d9ce7078e21cb1adb2cd25e66be7cd6d812a`
