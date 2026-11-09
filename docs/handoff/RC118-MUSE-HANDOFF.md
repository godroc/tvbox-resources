# WebHomeTV RC118 交接给 Muse

RC118 页面来源为 GitHub 提交 `36761b3`，版本标签 `mirror-20261109-rc118-webhome`。2026-11-09 发布 MiniPC 局域网候选，Oracle 也有独立预览。电视正式验收待完成。

## 入口

- MiniPC 候选配置 `http://192.168.50.252:8100/webhometv/preview/rc118/main.json`
- Oracle 候选配置 `https://tv.godroc.dpdns.org/next/previews/webhome-rc118-ec69da6fafc4/main.json`
- GitHub 配置 `rc118.json` 与 `docs/webhome/rc118-ec69da6fafc4/`
- 日常入口预留为 `/webhometv/main.json`，等验收后启用

## 部署与维护

MiniPC 部署目录为 `/opt/services/webhometv`，使用独立的 Docker Compose 静态服务。候选目录包含配置、HTML、JS、CSS 和校验清单。局域网配置只调整 WebHome 的首页地址，原有 157 个站点及远程 Spider JAR 依赖保留。外部海报、站点和播放仍取决于各来源。设备密钥留在设备自身。

1. 每次更新从同一个 Git 提交生成 GitHub 和 Oracle 的版本文件。检查文件哈希，分别核对真实访问地址。在仓库和 Oracle 各写一份给 Muse 的交接，记录版本、提交、地址、变化、验证和回退。
2. 将最新开发候选同步到 MiniPC 的 `preview/<版本>/`。先在暂存目录核对清单，再切换入口。通过模拟器和电视验收后，将已验收版本用于固定日常入口。
3. MiniPC 长期只保留一个已验收版和一个最新开发版。替换前一开发版前先核实新候选和远程归档可用。需要回退到更早版本时，从 GitHub 或 Oracle 的对应版本恢复，不依赖 MiniPC 保留历史副本。

## 验收

在模拟器和电视导入局域网候选，检查首页、盘搜与检测、本机设置和播放返回。浏览器或 HTTP 验证无法替代电视 App 对局域网 HTTP 的验收。比较速度时使用同一设备、同一配置缓存状态，分别记录首次进首页和首条有效结果。
