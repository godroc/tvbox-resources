# WebHomeTV 手机键盘与推送候选交接

2026-11-09。以 RC118 页面为基础，候选运行在 MiniPC，Oracle 留存交接，GitHub 留存源码及交接。

- 电视导入地址 `http://192.168.50.252:8100/webhometv/preview/keyboard/main.json`
- 手机固定地址 `http://192.168.50.252:8100/k/`。可扫电视二维码或填 6 位码。电视保持配对心跳时会续期。断开后令牌失效。
- 手机输入绑定当前字段。焦点变更会丢弃旧目标的文字。密码与密钥等待可信 HTTPS。
- 手机推送无需电视选中输入框。电视从「推送」选用链接，再按「交给播放器」。收件箱每个会话最多 8 条、同链接去重、30 分钟有效，保存在进程内存。
- 源码在仓库 `tools/webhometv-remote-input/`，配对二维码依赖 `qrcode==8.2`。MiniPC 把对应 wheel 放在 `/opt/services/webhometv/input-service/`。
- MiniPC 回退备份 `/opt/services/backups/webhometv/before-phone-inbox-20261109/`。恢复 `server.py`、`remote-input.js`、`index.html` 到原位置后重启 Compose 的 input 容器。

浏览器双页面实测覆盖扫码链接与短码、中文设置字段输入、HTTP 密钥拦截、无焦点推送、计数、显式选用和收件箱移除。电视扫码、遥控及原生播放器起播待实机验收。

候选源码 SHA-256

- `server.py` `0c2dc71b67417e8969dcd89664a35a7b129ac441be04ea91f0977688d6cf14af`
- `remote-input.js` `4199e19467d3bc34656dbcbcec771dbd9a21af1d166db8da11384ac05d11465d`
- `keyboard.html` `31c6b2e6a2ac702983d424f32268508470747f27c6dde1cfffeaad16a24297d1`
