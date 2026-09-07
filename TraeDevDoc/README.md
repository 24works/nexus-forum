# Nexus Forum — 项目文档

> 一个构建在 Cloudflare Workers 之上的现代社区论坛（BBS）。

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 技术栈](#2-技术栈)
- [3. 功能特性](#3-功能特性)
- [4. 架构概览](#4-架构概览)
- [5. 数据库设计](#5-数据库设计)
- [6. 安全设计](#6-安全设计)
- [7. 一键部署（Cloudflare 仪表盘）](#7-一键部署cloudflare-仪表盘)
- [8. 本地开发](#8-本地开发)
- [9. 配置说明](#9-配置说明)
- [10. API 参考](#10-api-参考)
- [11. 已知限制](#11-已知限制)

---

## 1. 项目概述

**Nexus Forum** 是一个功能完整的社区论坛系统（BBS），具备当代论坛应有的全部核心能力：账号体系、板块、主题、回帖、全文搜索、通知、举报、管理后台、暗色模式等。

项目针对 **Cloudflare Workers 边缘平台** 构建，数据库使用 **Cloudflare D1（边缘 SQLite）**，通过 **vinext**（Cloudflare 官方推荐的 Next.js-on-Workers 方案）运行。

关键设计目标：

- **零人工干预部署**：连接 GitHub 仓库后即可一键部署，D1 数据库自动创建，表结构在首次请求时自动初始化，首个注册用户自动成为管理员。
- **开箱即用**：不配置任何可选密钥（邮件、会话密钥）也能完整跑通全部功能。

## 2. 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16（App Router）架构，由 vinext 在 Vite 上重新实现 |
| 运行平台 | Cloudflare Workers（Workers Assets + Cache API + Images） |
| 构建 | Vite 8 + @cloudflare/vite-plugin + @vitejs/plugin-rsc |
| 数据库 | Cloudflare D1（SQLite，含 FTS5 全文检索） |
| 样式 | Tailwind CSS v4 |
| 图标 | lucide-react |
| 类型检查 | TypeScript（strict） |

## 3. 功能特性

### 账号与认证
- 注册 / 登录 / 登出
- 邮箱验证（预留验证链接，未配置邮件服务时以调试链接形式返回）
- 忘记密码 / 重置密码
- 会话管理：最多并发 8 个会话、过期清理、`HttpOnly` Cookie
- 角色体系：`member` / `moderator` / `admin`
- 封禁 / 解封、徽标（角色）展示

### 论坛核心
- 分区（Board）：启用/禁用、访问角色（所有人/会员/版主/管理员）、排序
- 主题（Thread）：发帖、编辑、删除、置顶、锁定、公告、跨分区移动、标签、浏览计数
- 回帖（Post）：回复、引用、编辑（含审计）、删除
- 按热度/最新/浏览/最早排序

### 社区能力
- 全文搜索（FTS5，带高亮，LIKE 降级）
- 通知（回复通知 + @提及通知 + 未读徽标）
- 用户主页（资料、签名、发帖统计）
- 个人设置（主题、签名、简介、修改密码）

### 治理与安全
- 举报与处理（举报→解决/驳回）
- 审计日志（管理操作全记录）
- 反垃圾（蜜罐字段）
- 限流（基于 D1 的固定窗口限流）

### 界面
- 响应式布局、明/暗色主题（跟随系统或手动切换）

## 4. 架构概览

```
app/                  # App Router 路由（页面 + API）
  (auth)/             # 登录/注册/找回密码/验证邮箱页面
  api/admin/          # 管理接口（板块、举报、用户）
  api/auth/           # 认证接口（登录、注册、验证、重置等）
  api/me/             # 个人资料接口
  api/notifications/  # 通知接口
  api/posts/          # 帖子接口（编辑/删除/举报）
  api/threads/        # 主题接口（创建/回复/查看计数等）
  board/ t/ u/ search/ notifications/ me/ threads/  # 页面
components/           # React 组件（UI、表单、帖子行等）
lib/                  # 服务端业务逻辑（认证、数据库、限流、Markdown 等）
db/schema.ts          # D1 表结构（幂等 SQL 语句数组）
scripts/ensure-d1.mjs # 部署时自动创建 D1 数据库
wrangler.jsonc        # Cloudflare Worker 配置（来源事实）
vite.config.ts        # vinext + Cloudflare Vite 插件配置
```

关键机制：

- **数据库访问**：`lib/db.ts` 统一封装 `env.DB`，提供 `ensureSchema()`（首次请求时惰性建表）、`row/all/scalar/batch` 等助手。
- **会话**：随机 256-bit token，服务端只存 SHA-256 哈希；API 路由用 `lib/auth.ts`，Server Components 用 `lib/session-rsc.ts`。
- **RSC 数据流**：页面为 React Server Components，交互组件为 `"use client"`，通过 `lib/api-client.ts` 调 API（自动附 Origin 头）。

## 5. 数据库设计

表清单（时间戳统一为 Unix 毫秒）：

| 表 | 用途 |
|---|---|
| `meta` | 键值元数据（schema_version） |
| `users` | 用户（角色、状态、邮箱、主题、统计） |
| `sessions` | 会话（token 哈希、过期时间、IP/UA） |
| `email_tokens` | 邮箱验证 / 重置密码令牌 |
| `boards` | 分区（角色门槛、统计、最后活动） |
| `threads` | 主题（置顶、锁定、公告、标签、计数） |
| `posts` | 回帖（内容、编辑审计） |
| `notifications` | 通知（类型、已读状态） |
| `reports` | 举报（状态、解决人） |
| `rate_limits` | 限流桶（bucket, period, count） |
| `audit_log` | 审计日志 |
| `threads_fts` / `posts_fts` | FTS5 全文索引（触发器同步） |

**自动迁移**：`db/schema.ts` 以「完整 SQL 语句数组」形式导出（`SCHEMA_STATEMENTS`），全部为 `IF NOT EXISTS` 幂等语句，首次请求时批量执行。注意：触发器含 `BEGIN...END;` 块，不能简单按 `;` 切分，这正是采用语句数组的原因。

## 6. 安全设计

| 威胁 | 对策 |
|---|---|
| CSRF | 所有写请求校验 `Origin` 与 Host 同源（`assertSameOrigin`）+ 会话 Cookie `SameSite=Lax` |
| 密码泄露 | PBKDF2-SHA256（15 万次迭代）+ 每用户随机盐 + 可选 pepper（来自 `SESSION_SECRET`），常量时间比较 |
| 越权 | 管理/版主接口强制 `requireRole`；主题编辑/删除校验作者或版主身份；会话失效用户被拒绝 |
| 暴力破解 | 登录限流（IP 10 次/10 分钟 + 账户 20 次/15 分钟）、注册限流、找回密码限流（均在 `FORUM_RATE_LIMIT_ENABLED` 开启时生效） |
| 存储型 XSS | Markdown 先整体 HTML 转义再做渲染，渲染器只生成安全标签；URL 白名单（禁 `javascript:` 等）；最后再做一次消毒 |
| 会话劫持 | token 以哈希落库、`HttpOnly` Cookie、30 天过期、多会话上限 |
| 垃圾注册 | 蜜罐字段 + 注册限流 + 待办：`FORUM_ALLOW_REGISTRATION` 可关注册 |
| 注入 | 全部查询走 D1 参数绑定，动态 SQL 片段来自固定白名单 |

## 7. 一键部署（Cloudflare 仪表盘）

### 前提
- 代码已推送到 GitHub 仓库。
- 一个 Cloudflare 账号（免费套餐即可）。

### 部署步骤

1. 登录 Cloudflare 仪表盘，进入 **Workers 和 Pages**。
2. 点击 **创建应用程序** → **导入仓库**（Import a repository/Get started）。
3. 授权 GitHub，选择本仓库。
4. 相关设置如下：

```
工 程 名 称:     bbs-develop-by-agent   （必须与 wrangler.jsonc 中的 name 一致）
生产分支:       main
安装命令:       默认（npm install）
构 建 命 令:    （留空！）
部 署 命 令:    npm run deploy
根 目 录:      （留空，即仓库根目录）
```

5. 点击 **保存并部署（Save and Deploy）**。

> **重要**：不要填写单独的 Build command + `wrangler deploy`。vinext 的 worker 配置在构建时才生成，必须使用一体化的 `vinext deploy` 流程（即 `npm run deploy`）。构建命令留空、部署命令填 `npm run deploy` 已在实践中被验证是正确搭配。

### 部署流水线做了什么

`npm run deploy` 依次执行：

1. `node scripts/ensure-d1.mjs`
   - 读取 `wrangler.jsonc`，若 `database_id` 仍是占位符，则用 `wrangler d1 list` 检查同名库（`bbs-db`），不存在则 `wrangler d1 create` 创建，并把真实 ID 写回 `wrangler.jsonc`。
   - 全程幂等；在 Workers Builds 环境中 `CLOUDFLARE_API_TOKEN` 由 Cloudflare 自动注入，无需任何手动配置。
2. `vinext-cloudflare deploy --config dist/server/wrangler.json`
   - 内部完成 `vinext build`（生成客户端资产 + worker 配置）并调用 `wrangler deploy` 上传。

### 首次启动（零干预）

- D1 库在部署期间自动创建。
- 表结构在首个请求时自动初始化（`ensureSchema`）。
- **第一个注册的用户自动成为管理员**（`FORUM_BOOTSTRAP_ADMIN=true`），之后可用管理面板管理板块、用户和举报。
- 未配置 `RESEND_API_KEY` 时，邮箱验证/重置链接会在 API 响应中以调试链接返回，流程仍可完整走通。

### 环境变量 / 密钥（可选）

| 变量 | 说明 |
|---|---|
| `SESSION_SECRET` | 密码 pepper。未设置时也可用（pepper 为空），安全建议生产环境设置为 Worker Secret |
| `RESEND_API_KEY` | Resend 邮件服务密钥。未设置时用调试链接替代 |
| `RESEND_FROM` | 发件人地址（默认 `Nexus Forum <onboarding@resend.dev>`） |
| `FORUM_NAME` / `FORUM_TAGLINE` | 站点名称 / 标语 |
| `FORUM_ADMIN_USERNAME` | 逗号分隔的用户名，注册时自动提升为管理员 |
| `FORUM_BOOTSTRAP_ADMIN` | 首个注册用户自动为管理员（默认 true） |
| `FORUM_ALLOW_REGISTRATION` | 是否开放注册（默认 true） |
| `FORUM_RATE_LIMIT_ENABLED` | 是否启用限流（默认 true） |
| `FORUM_ITEMS_PER_PAGE` | 每页条目数（默认 20） |

以上常规变量已在 `wrangler.jsonc` 的 `vars` 中预设默认值，无需额外操作。

## 8. 本地开发

```bash
npm install
npm run dev          # 启动开发服务器（http://localhost:3000）
```

开发模式下 `.dev.vars` 提供本地 `SESSION_SECRET`；本地用 miniflare 模拟 D1（`.wrangler/state` 持久化）。

生产模式预览：

```bash
npm run build        # 构建（输出 dist/）
npm run start        # 用 wrangler 本地运行构建产物
# 或
npm run preview      # 等价于 build + start
```

类型检查：`npm run typecheck`。

## 9. 配置说明

参见 [7. 一键部署](#7-一键部署cloudflare-仪表盘) 中的配置表，以及根目录 `wrangler.jsonc`（它是 Worker 配置的事实来源：D1、缓存、Images、观察性、vars 都在这里）。

## 10. API 参考

### 认证
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/register` | 注册（含蜜罐、限流、首个用户提升管理员） |
| POST | `/api/auth/login` | 登录（IP+账户双重限流） |
| POST | `/api/auth/logout` | 登出 |
| POST | `/api/auth/verify-email` | 邮箱验证 |
| POST | `/api/auth/resend-verification` | 重发验证 |
| POST | `/api/auth/forgot-password` | 忘记密码 |
| POST | `/api/auth/reset-password` | 重置密码 |

### 内容
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/threads` | 创建主题 |
| PATCH/DELETE | `/api/threads/:id` | 编辑/删除/置顶/锁定/公告/移动/恢复 |
| POST | `/api/threads/:id/reply` | 回复 |
| POST | `/api/threads/:id/view` | 浏览计数 |
| PATCH/DELETE | `/api/posts/:id` | 编辑/删除回帖 |
| POST | `/api/posts/:id/report` | 举报 |

### 用户 / 通知 / 管理
| 方法 | 路径 | 说明 |
|---|---|---|
| GET/PATCH | `/api/me` | 查看/更新个人资料 |
| POST | `/api/notifications/read` | 标记通知已读 |
| POST | `/api/admin/boards` | 创建板块 |
| PATCH/DELETE | `/api/admin/boards/:id` | 编辑/删除板块 |
| PATCH | `/api/admin/users/:id` | 封禁/改角色/验证用户 |
| PATCH | `/api/admin/reports/:id` | 处理举报 |

所有 API 返回 JSON：`{ ok: true, ... }` 或 `{ ok: false, error, field? }`。

## 11. 已知限制

- **vinext 处于 beta**：部分 Next.js 16 API 可能有不完整实现；构建日志中路由分类为 `?` 属正常（vinext 尚不做动态 API 静态分析）。
- **图片优化**：`next/image` 在请求时由 Cloudflare Images 优化，而非构建时。
- **邮件**：未配置 Resend 时验证/重置链接仅存在于 API 响应中（不会发送到邮箱）。
- **隐私**：审计日志与会话记录包含 IP/UA 的哈希及短 User-Agent 片段，如需更强数据保留策略需自行定制。
- **搜索排序**：FTS5 相关性归一化较简（按命中次数近似），大数据量下排序精度有限。