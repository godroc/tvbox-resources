# WebHomeTV 本地 RC118 手机输入与推送交接

2026-11-09。MiniPC 的 RC118 局域网候选原地址已加入手机键盘与推送。GitHub 和 Oracle 的 RC118 发布包保持原样，仓库与 Oracle 留存本交接。

- 电视导入地址 `http://192.168.50.252:8100/webhometv/preview/rc118/main.json`。旧键盘试用入口也兼容新配对方式。
- 手机固定地址 `http://192.168.50.252:8100/k/`。二维码编码相同的固定地址。电视在设备设置打开「连接手机键盘」。打开手机地址即连接当前唯一等待中的电视。多台等待时在手机选择电视编号。首次连接占用该电视会话，电视可随时断开。
- 电视手动开启键盘后，手机可连接并输入或推送。字段焦点变化时拒收旧目标文字。HTTP 阻止远程输入密码与密钥，可信 HTTPS 后续验收。
- 手机推送不需要输入焦点。电视从「推送」选用链接，再按「交给播放器」。收件箱每会话最多 8 条、30 分钟有效，保存在进程内存。
- 源码在仓库 `tools/webhometv-remote-input/`，二维码依赖 `qrcode==8.2`。MiniPC 使用 `/opt/services/webhometv/input-service/` 内的 wheel。
- 回退备份 `/opt/services/backups/webhometv/before-rc118-auto-connect-20261109/`。将 `server.py` 还原到 `input-service/`，`index.html` 还原到 `site/webhometv/keyboard/`，`rc118-index.html` 与 `rc118-manifest.json` 分别还原为 RC118 目录的 `index.html` 与 `manifest.json`，`rc118-remote-input.js` 还原为 RC118 的 `remote-input.js`，`legacy-remote-input.js` 还原为旧 keyboard 预览目录的 `remote-input.js`。重启 Compose 的 input 服务。

浏览器双页面与 API 实测覆盖固定地址、直接连接、第二台手机无法占用已连接会话、中文填字、收件箱、HTTP 密钥拦截。真实电视遥控、手机相机扫码和原生播放器起播待验收。

源码 SHA-256

- `server.py` `14c1680ff464ee485c6da924c3a69ef38d10e98b7efe122e8556b64d36981a34`
- `remote-input.js` `0260bcc9c3b35e5870e9194536be6ba0906e65cb28b26cc91e0745ab6fb0d6ce`
- `keyboard.html` `d67993a0f6b205ce3316f7fe9827d6f53234ffd0741f91fefca2b7e67a249187`
