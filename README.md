# Nexus Forum

一个功能完整的现代社区论坛（BBS），基于 **Next.js App Router（vinext）** 构建，运行在 **Cloudflare Workers + D1** 上。连接 GitHub 仓库即可一键部署，无需任何人工配置或密钥。

## 功能特性

- **账号体系**：注册 / 登录 / 登出、邮箱验证、忘记密码 / 重置密码、多会话管理、封禁与解封
- **论坛核心**：多板块（含角色可见性）、主题（置顶 / 锁定 / 公告 / 标签 / 移动）、回帖（引用 / 编辑审计）、浏览计数（按访客去重）
- **社区能力**：FTS5 全文搜索（高亮 + LIKE 降级）、回复与 @提及通知、未读徽标、用户主页、个人设置、明暗主题（跟随系统 / 记忆偏好）
- **治理后台**：`/admin` 面板 — 举报处理、用户管理（封禁 / 角色）、板块 CRUD、审计日志；`/stats` 社区统计页
- **安全默认**：CSRF 同源校验、PBKDF2 密码哈希（10 万次迭代，符合 Workers 上限 + 盐 + 可选 pepper）、D1 限流、Markdown 消毒、参数化 SQL

技术栈：vinext（Vite 上的 Next.js 实现）· Cloudflare Workers · D1（SQLite + FTS5）· Tailwind CSS v4 · shadcn/ui · TypeScript。

---

## 目录

- [快速开始（本地开发）](#快速开始本地开发)
- [部署到 Cloudflare](#部署到-cloudflare)
- [添加管理员](#添加管理员)
- [配置说明](#配置说明)
- [邮件服务（可选）](#邮件服务可选)
- [日常管理](#日常管理)
- [安全设计](#安全设计)
- [常见问题](#常见问题)
- [项目结构](#项目结构)

---

## 快速开始（本地开发）

```bash
npm install
npm run dev          # http://localhost:3000
```

首次启动后访问首页，注册任意账号即成为本地管理员（见[添加管理员](#添加管理员)）。

生产模式预览（本地运行构建产物）：

```bash
npm run build
npm run start        # 或 npm run preview = build + start（http://localhost:8787）
```

本地开发使用 `.dev.vars` 提供环境变量，D1 数据通过 miniflare 持久化在 `.wrangler/state`（不会影响线上数据库）。

## 部署到 Cloudflare

### 方式一：Cloudflare 仪表盘一键部署（推荐）

1. 把本仓库推送到 GitHub。
2. 登录 [Cloudflare 仪表盘](https://dash.cloudflare.com) → **Workers 和 Pages** → **创建** → **导入仓库**，授权并选择本仓库。
3. 构建设置如下：

   | 设置项 | 值 |
   |---|---|
   | 项目名称 | `bbs-develop-by-agent`（与 `wrangler.jsonc` 的 `name` 一致） |
   | 生产分支 | `main` |
   | 构建命令 | **留空** |
   | 部署命令 | `npm run deploy` |

4. 点击 **保存并部署**。

之后每次 push 到 `main` 分支都会自动重新部署。

部署流水线会自动完成：创建 D1 数据库（`scripts/ensure-d1.mjs`，使用 Cloudflare 注入的构建令牌，含 D1 权限）→ 构建并上传 Worker → 首次请求时自动初始化表结构和 5 个默认板块。**全程零人工干预，无需预先配置任何密钥。**

### 方式二：命令行部署

```bash
npx wrangler login   # 首次需要浏览器授权
npm run deploy       # 自动建库 + 构建 + 部署
```

## 添加管理员

有四种方式，按场景选择：

### 1. 首个注册用户自动成为管理员（默认）

`FORUM_BOOTSTRAP_ADMIN=true`（默认开启）时，**数据库中第一个注册的账号自动获得 `admin` 角色**。全新部署后，打开网站注册第一个账号即可。

> 该机制只在用户数为 0 时生效，不会把后来的普通注册者提升为管理员。

### 2. 预设管理员用户名（推荐给已有用户的站点）

在部署前修改 `wrangler.jsonc`：

```jsonc
"vars": {
  "FORUM_ADMIN_USERNAME": "alice,bob"   // 逗号分隔，大小写不敏感
}
```

这些用户名在**注册时**自动提升为 `admin`。已有部署也可在 Cloudflare 仪表盘 → Worker → **设置 → 变量** 中添加此变量后重新部署。

### 3. 由现有管理员在后台提升

管理员登录后进入 **`/admin?tab=users`**，在目标用户行把角色下拉框切换为 Admin。仅 `admin` 可以更改他人角色。

### 4. 手动 SQL（失去管理员时的兜底）

```bash
npx wrangler d1 execute bbs-db --remote \
  --command "UPDATE users SET role='admin' WHERE username_lower='某人用户名'"
# 本地开发去掉 --remote
```

## 配置说明

常规变量在 `wrangler.jsonc` 的 `vars` 中预设了默认值，可按需修改（改完重新部署生效）：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `FORUM_NAME` / `FORUM_TAGLINE` | `Nexus Forum` / … | 站点名称 / 标语 |
| `FORUM_ADMIN_USERNAME` | 空 | 注册时自动提升为管理员的用户名列表 |
| `FORUM_BOOTSTRAP_ADMIN` | `true` | 首个注册用户自动成为管理员 |
| `FORUM_ALLOW_REGISTRATION` | `true` | 是否开放注册（`false` 时注册页显示"已关闭"） |
| `FORUM_RATE_LIMIT_ENABLED` | `true` | 是否启用限流（登录/注册/发帖/举报等） |
| `FORUM_ITEMS_PER_PAGE` | `20` | 列表每页条目数（5–100） |

敏感密钥（不进代码库，用 Secret 存储）：

```bash
npx wrangler secret put SESSION_SECRET   # 密码 pepper（可选，见下）
npx wrangler secret put RESEND_API_KEY   # 邮件服务（可选，见下）
npx wrangler secret put RESEND_FROM      # 发件人，如 "Nexus Forum <noreply@example.com>"
```

也可以在仪表盘 → Worker → **设置 → 变量和机密** 中添加。

> `SESSION_SECRET` 是密码哈希的 pepper，属于纵深防御。**设置或更换它不会导致已有用户无法登录**（校验时会自动回退到无 pepper 的哈希），新注册用户则立即使用新 pepper。

## 邮件服务（可选）

未配置邮件服务时，论坛开箱即用：

- 注册时填写的邮箱**自动视为已验证**（反正也发不出验证邮件）；
- 忘记密码功能不可用（重置链接无法投递，只在服务端日志中输出），用户需联系管理员。

配置 [Resend](https://resend.com) 后自动切换为邮件模式：

1. 在 Resend 注册并创建 API Key（免费套餐每月 3000 封）。
2. `npx wrangler secret put RESEND_API_KEY`。
3. 自定义域名需在 Resend 完成域名验证，并设置 `RESEND_FROM`（默认用 Resend 的测试发件人）。

之后注册/换邮箱会发送真正的验证邮件，忘记密码会发送重置链接（1 小时有效、一次性、重置后注销全部会话）。

## 日常管理

| 操作 | 入口 |
|---|---|
| 创建/编辑/隐藏板块 | `/admin?tab=categories`（板块可见性支持 everyone / 登录用户 / 版主 / 管理员） |
| 封禁 / 解封 / 改角色 | `/admin?tab=users`（版主只能操作普通会员） |
| 处理举报 | `/admin?tab=reports`（标记为 resolved / dismissed） |
| 查看操作审计 | `/admin?tab=audit` |
| 置顶 / 锁定 / 公告 / 移动主题 | 主题页顶部的 Moderation 工具条（版主及以上可见） |
| 社区统计 | `/stats` |

角色权限：`member`（普通用户）< `moderator`（可处理举报、管理主题、封禁会员）< `admin`（全部权限，含板块管理与角色分配）。

## 安全设计

| 威胁 | 对策 |
|---|---|
| CSRF | 全部写请求校验 `Origin` 同源 + `SameSite=Lax` 会话 Cookie |
| 密码泄露 | PBKDF2-SHA256（100k 迭代，Workers 上限）+ 每用户随机盐 + 可选 pepper + 常量时间比较 |
| 存储型 XSS | Markdown 先全量 HTML 转义再渲染；URL 白名单；搜索摘要转义后仅放行高亮标记 |
| 越权 | 所有管理接口 `requireRole`；资源操作校验属主或版主身份与时间窗口 |
| 暴力破解 / 刷量 | 基于 D1 的固定窗口限流（登录、注册、发帖、举报）；浏览计数每访客每小时每主题一次 |
| 会话劫持 | 会话 token 仅存 SHA-256 哈希、`HttpOnly` Cookie、30 天过期、每人最多 8 个会话 |
| 注入 | 全部查询使用 D1 参数绑定 |

## 常见问题

**Q：部署后打开网站 500？**
查看 Workers Builds 构建日志与 Worker 实时日志（仪表盘 → Worker → 日志）。最常见原因是部署命令填了 `wrangler deploy` 而不是 `npm run deploy`。

**Q：忘记管理员密码且无法收到重置邮件？**
用[手动 SQL](#4-手动-sql失去管理员时的兜底)重置角色或直接更换密码哈希，或配置 Resend 后走忘记密码流程。

**Q：如何关闭注册？**
把 `FORUM_ALLOW_REGISTRATION` 改为 `false` 重新部署，或在仪表盘变量中修改。

**Q：如何自定义域名？**
仪表盘 → Worker → 设置 → 域和路由，添加自定义域。会话 Cookie 会自动跟随 HTTPS。

**Q：本地数据库和线上是同一个吗？**
不是。本地 miniflare 把数据存在 `.wrangler/state`，与线上 D1 完全隔离。操作线上库需 `npx wrangler d1 execute bbs-db --remote ...`。

更详细的架构、数据库设计与 API 文档见 [TraeDevDoc/README.md](TraeDevDoc/README.md)。

## 项目结构

```
app/                  # 路由：页面 + API（(auth)/ admin/ api/ board/ t/ u/ search/ stats/ ...）
components/           # React 组件（含 shadcn/ui 基础件 components/ui/）
lib/                  # 服务端逻辑：auth、db、rate-limit、markdown、queries 等
db/schema.ts          # D1 表结构（幂等语句数组，首次请求自动执行）
scripts/ensure-d1.mjs # 部署时自动创建 D1 数据库并写回 database_id
wrangler.jsonc        # Worker 配置（D1、缓存、vars 等的事实来源）
vite.config.ts        # vinext + @cloudflare/vite-plugin
```
