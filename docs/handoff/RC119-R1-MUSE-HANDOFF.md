# RC119-r1 交接

基于 RC119 d38d350。2026-11-10 仅发布 GitHub 候选。完整配置新增「红果 • 短剧」，位于果果短剧之后，共 158 个站点。沿用 RC119 的 TMDB 和 WebHome 文件。

- 配置入口为 rc119-r1.json 和 raw-rc119-r1.json。
- Spider 来自用户提供的「红果短剧(弹幕+显季版).py」，按原字节保存于 spiders/hongguo-2fdb3b1b4496.py。
- SHA-256 为 2fdb3b1b4496a53aeb59cd6495a5d8cab6f65816d38fb2ca3a185fd2e16d5f8a。
- 已核对 Python 语法、Spider 入口以及原有 157 个站点逐项一致。脚本依赖客户端 Python 宿主，播放和弹幕待 App 验收。
- 使用 RC119 原配置可回退。
