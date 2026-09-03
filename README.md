# dsh-plugin-marketplace

**DeepSeek Harness(`dsh`)插件套件 + 插件市场。**
12 个即装即用的插件(工具 / 效率 / 安全 / 界面美化),配一个可勾选、可批量安装的静态市场页。

> 适配 DeepSeek Harness 开发者预览版(rc.5)。全部插件已在真实 `dsh` 运行时中验证:
> 干净启动、headless 端到端(真实模型调用插件工具)、Web 客户端包正常服务。

---

## 插件一览

| 插件 | 类别 | 说明 |
|---|---|---|
| `dsh-tool-text` | 工具 | 字数统计、base64/hex/url 编解码、md5/sha 哈希、JSON 格式化/查询 |
| `dsh-tool-calculator` | 工具 | 安全表达式计算器(无 eval)+ 单位换算 |
| `dsh-tool-datetime` | 工具 | 当前时间、时间戳互转、日期差,支持时区 |
| `dsh-tool-generator` | 工具 | UUIDv4、短 id、密码、hex 令牌(CSPRNG) |
| `dsh-tool-system-info` | 工具 | 主机信息:OS/CPU/内存/磁盘/Node/时区 |
| `dsh-notes` | 效率 | 持久化备忘/知识库:存、搜、列、删 |
| `dsh-reminder` | 效率 | 定时提醒,到点注入回会话 |
| `dsh-usage-stats` | 效率 | 会话活动统计(轮次/步骤/消息/工具调用) |
| `dsh-skill-git-commit` | 开发 | Conventional Commits 校验与写作指引 |
| `dsh-safety-guard` | 安全 | 危险命令门禁:`rm -rf /`、`mkfs`、fork bomb 等拦截/询问 |
| `dsh-theme-ink` | 界面 | 墨绿深色主题(注册可选主题,覆盖 `--dsw-*` token) |
| `dsh-ui-session-badge` | 界面 | 悬浮状态徽章(实时时钟 + 品牌点) |

## 安装

**方式一:一键全装(推荐)**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-all.ps1 -Profile web
```

**方式二:市场页勾选批量安装**

打开 GitHub Pages 市场页 → 勾选插件 → 「复制安装命令」/「下载 install.ps1」/「打包下载 .zip」。

**方式三:单个安装**

```sh
dsh plugin --profile web add "https://github.com/<owner>/dsh-plugin-marketplace/releases/download/v0.1.0/<name>-0.1.0.tgz"
```

安装后重启 `dsh` 生效。UI 插件(主题/徽章)在 Web 界面自动出现;主题在「设置 → 外观」可选 `ink`。

## 开发

```sh
npm install          # 安装 vitest
npm test             # 104 个单元 + mock 挂载测试
node scripts/build-registry.mjs   # 生成 marketplace/registry.json
node scripts/pack-all.mjs         # 打包全部 tarball 到 dist/
```

每个插件都是独立 npm 包,`package.json` 声明 `dsh.bundle`(host 半)与可选 `dsh.client`(浏览器半)。
host 工具走 `ctx.tools.register()`;安全门禁走 `tools/pre-execute`;UI 走 `ctx.slots` / `ctx.theme`。

## 许可

MIT

---

# dsh-plugin-marketplace (English)

A plugin suite + marketplace for **DeepSeek Harness (`dsh`)**: 12 ready-to-install
plugins (tools / productivity / safety / UI) plus a static marketplace page with
checkbox multi-select and batch install.

## Install

```sh
# all
powershell -ExecutionPolicy Bypass -File scripts/install-all.ps1 -Profile web
# or one
dsh plugin --profile web add "<release-tarball-url>"
```

Restart `dsh` after installing. UI plugins appear in the web app automatically;
the `ink` theme is selectable under Settings → Appearance.

## Develop

```sh
npm install && npm test
node scripts/build-registry.mjs
node scripts/pack-all.mjs
```

MIT License.
