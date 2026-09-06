---
title: Headless Chromium 与 Agent 容器化部署实践要点
date: 2026-09-07
tags:
  - ai
  - tech
  - seedling
description: Linux 容器里跑 headless Chromium 供 Agent 驱动的实践：no-sandbox、CDP 端口连通、资源与渲染隔离的经验。
---

# Headless Chromium 与 Agent 容器化部署实践要点

> 让 Agent 具备"看得见页面"的能力，最直接的路径是在容器里跑一个 Headless Chromium，用 CDP（DevTools Protocol）驱动。这篇记录我踩过并沉淀下来的要点。

## 1. `no-sandbox`：容器的第一道门槛

无特权 Linux 容器里启动 Chromium，第一个报错几乎都是 `Running as root without --no-sandbox is not supported`。

- 用 `--no-sandbox` 放行（容器本身已作隔离层，进程沙箱往往不可用）；
- 保险起见再配 `--headless=new`。若不希望 root 运行，可用非特权用户 + user namespace，但多数 Agent 场景直接 no-sandbox 即可。

## 2. CDP 端口连通：从"起了进程"到"真能驱动"

关键不是 Chromium 起来，而是 CDP 端点可达：

- 启动时指定 `--remote-debugging-port=XXXX`（默认绑定 `127.0.0.1`——跨容器**不会自动暴露**）；
- 容器外要连，需显式绑定可访问地址或用端口映射，且确认防火墙/网络策略放行；
- 一个稳定 HTTP 就绪探测（`/json/version` 返回 OK）远比"进程存活"可靠：
  ```bash
  curl -sf http://127.0.0.1:PORT/json/version && echo "CDP ready"
  ```

## 3. 资源与渲染隔离：headless 的"隐形正确"

容器里没有 GPU，Chromium 落到软件渲染（如 SwiftShader）。常见两个坑：

- **2D canvas / WebGL 被标 `unavailable_software`**——某些页面 JS 侦测到后行为会变；
- **截图空白**：页面 JS/合成层还没画完就截图，canvas 常是空的。解决是**强制等绘制完成再截**：
  ```bash
  chromium --headless=new \
    --run-all-compositor-stages-before-draw \
    --virtual-time-budget=8000 \
    --screenshot=out.png "https://目标"
  ```
  `--virtual-time-budget` 让 Chromium"快进"到 JS + 合成层都尘埃落定，再吐截图。

## 4. 回收与隔离纪律

- 高并发 Agent 各自独立端口/独立 user-data-dir，避免会话状态互相污染；
- 任务结束**显式关闭/清理**进程，别任由僵尸实例囤在容器里吃内存；
- 截图文件写临时目录、用后即清，别让产物堆进仓库或镜像。

---

*实践笔记，种子（seedling）状态，来自 AIKAI 运行 Agent + headless 浏览的真实工程踩坑。*
*这篇与更高层的方法论互为印证：→ [[agentic-knowledge-garden|本地模型与智能体协同：从个人工作流到数字化花园]]*
*工程学如何翻译成壁垒经济学：→ [[thoughts/ai-and-moat-evolution|技术演进与护城河：AI 时代对传统商业壁垒的重塑]]*
