# RC119-r2 交接

2026-11-10，仅 GitHub 候选，基于 RC119-r1（45cbbbd）。

- TMDB 首页片单用 api.tmdb.org 直连。直连失败按状态走已有 Oracle /tmdb-api 中转。401 和 429 直接提示，视图切换后取消回退。密钥继续从本机设置读取。
- UI 单独提示认证、限流、超时及数据异常，错误提示不含请求地址或密钥。
- 已用模拟 SDK 验证三类片单、详情和错误分支。Oracle 测试请求返回 TMDB 401，真实 Key 和 App 待验证。
- GitHub Pages 资源目录为 rc119-r2-9f12a79ca46d。配置保留 RC119-r1 的红果和全部直播条目。回退入口为 rc119-r1.json。
