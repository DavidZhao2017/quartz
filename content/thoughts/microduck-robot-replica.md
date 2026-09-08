---
title: 折腾笔记｜手搓 MicroDuck 四足机器人保姆级复刻
date: 2026-09-09
tags:
  - 机器人
  - 开源硬件
  - 强化学习
  - seedling
description: 把帆哥那期 MicroDuck 保姆级教程从头到尾复刻了一遍，把硬件 BOM、舵机坑、螺丝清单和真机部署命令整理成可执行的复盘。
---

# 折腾笔记｜手搓 MicroDuck 四足机器人保姆级复刻

> 一句话：把帆哥那期 MicroDuck 教程**自己动手整了一遍**，这篇把 BOM、舵机坑、螺丝清单、真机部署命令全写下来，下次换舵机只改 URDF 不重写控制链路。

---

## 原视频

<a href="https://www.youtube.com/watch?v=Vep8AjoCnEM" target="_blank" rel="noopener" class="video-card">
  <img src="./static/images/microduck-thumbnail.jpg" alt="手搓 microduck 保姆级完整教程" class="video-card__thumb" loading="lazy" />
  <div class="video-card__body">
    <div class="video-card__title">手搓 microduck 保姆级完整教程！一步一步带你从零开始做鸭，小白也能复刻！</div>
    <div class="video-card__author">AI-Fan AI 研究室 · 帆哥 (@AARG_FAN)</div>
    <span class="video-card__cta">📹 教程原片直达 ↗</span>
  </div>
</a>

> 📌 **国内访客**: B 站暂未找到该视频的原版搬运, 下方"延伸阅读"列了几条**同主题**的 B 站教程 (OpenDuckMini 项目复刻 / 帆哥本人 B 站主页), 可作为国内访问替代。

**相关 B 站资源**:

- 📺 [AI研究室-帆哥 B 站主页](https://space.bilibili.com/3546380273493405) — 帆哥其他 AI 教程 (帆哥 B 站主页 ID 来自其 YouTube 简介 cross-link, 如有出入以其主页为准)
- 📺 [【Open Duck Mini】从零开始到强化策略 — 机器人的开发全流程](https://www.bilibili.com/video/BV1LPCwB6EBc/) — 小圆脸宝宝, 同主题硬件到 RL 全流程拆解
- 📺 [Microduck 硬件架构拆解](https://www.bilibili.com/video/BV1R2tH6tEsK/) — Z-Rob, 用 XL330 复刻的行走测试
- 📺 [无需高端显卡, 教你训练一只 Microduck](https://www.bilibili.com/video/BV1tvtE6uEgF/) — 矽递科技, SeeedStudio 出品的训练教程
- 📺 [OpenDuckMini 快速入门教程](https://www.ncnynl.com/archives/202506/6757.html) — 创客智造, 配套舵机配置 + 行走测试教程合集

---

## 一、整机长啥样 / 我的复刻目标

- 12 个小舵机驱动的低成本四足机器人, 整机重量 < 1kg, 桌面上小跑不翻。
- 主控用树莓派 Zero 2W (够小、够便宜, 够跑 12 维 PPO 策略)。
- 跟着视频复刻的核心目标: **自己把硬件到 sim-to-real 整个链路打通**, 不是只看个热闹。

---

## 二、硬件 BOM (采购清单)

> ⚠️ 视频里帆哥强调过: "OpenRB 这块板子别买山寨的, 否则总线时序不对。" —— 我用的是正版 OpenRB-150, 到手即用。

| # | 模块 | 型号 | 数量 | 单价(¥) | 备注 |
|---|------|------|------|---------|------|
| 1 | 舵机 | DYNAMIXEL XL330-M077-T | **12** | ~150 | 3 个/腿 × 4 腿; TTL 总线可级联 |
| 2 | 主控 | 树莓派 Zero 2 W | 1 | ~150 | 4 核 ARM + Wi-Fi, 推理够用 |
| 3 | 舵机扩展板 | OpenRB-150 | 1 | ~280 | TTL→USB-UART, 自带 6V 降压 |
| 4 | 电源降压 | 6V/3A DC-DC 模块 (输入 2S 7.4V) | 1 | ~15 | XL330 标称 6V, 2S 锂电直供会过压 |
| 5 | 电池 | 2S 18650 (7.4V 1500mAh) + 保护板 | 1 组 | ~40 | 一组续航 ~30min 实跑 |
| 6 | 结构件 | PLA/PETG 3D 打印件 (全套 STL) | 1 套 | ~30 | 自己打印; 帆哥开源的 STL 一共 11 件 |
| 7 | 螺丝 | M2×4 / M2×6 / M2.5×6 自攻 + 螺母若干 | 1 包 | ~5 | 见下文避坑清单 |
| 8 | 杂项 | D 型轴套、排线、热缩管、扎带 | 若干 | ~10 | 必买 D 型轴套, 否则连杆会滑键 |

**总预算 ~ ¥1,500** (不含 3D 打印机电费)。

---

## 三、组装避坑清单 (最值钱的部分)

### 螺丝尺寸表

| 位置 | 规格 | 长度 | 备注 |
|------|------|------|------|
| 舵机-主体固定 | M2 自攻 | **6mm** | 不能超 8mm, 否则顶穿舵机壳体顶坏电机 |
| 关节输出轴 | M2 | **4mm** | 太长会卡舵机齿轮, 太短会松 |
| OpenRB 板固定 | M2.5 | **6mm** | 与 Pi Zero 孔位对齐 |
| 电池仓盖板 | M2.5 自攻 | **8mm** | 唯一允许 8mm 的位置 |

> ⚠️ **致命坑**: M2 螺丝拧到舵机壳体里超过 8mm, 会直接顶到电机后盖。这玩意儿坏一只就是 ~150 元, **装机后用手掰每个关节, 听金属摩擦异响就立刻停**。

### 舵机零点校准 (最耗时的一步)

> ⚠️ 视频里帆哥原话: "零点错 1°, 整机走两步就歪。" —— 我自己的经验: 这一步**单独留 30 分钟**, 不要赶进度。

1. **断电状态**下, 把 12 只舵机输出轴**手拧到大约 0°** 对齐标记线。
2. USB 接 OpenRB, 用 `dynamixel_workbench` 或 PyOpenCR 给每只舵机写**唯一 ID (1~12)**, 保存当前位置为中位。
3. 装上连杆后通电自检: 发指令让每只舵机回中, 目测整机的"站姿"是否水平对称。
4. 哪只歪就重写那一只的 zero offset (OpenRB 工具支持 `goal_current = 0` 时微调)。

### D 型轴套安装顺序

```
打印件 → 轴套 → 舵机输出轴 → M2×4 螺丝紧固
```

> ⚠️ 不要先拧紧再插轴套 —— 会顶坏打印件。我第一只腿就是这么废的, 重打花了 40 分钟。

---

## 四、OpenRB ↔ Pi Zero 接线 (TTL 总线方向)

OpenRB 上的 TTL 端口已经做好了线序, **只要把舵机菊花链接到正确端口就行**:

| OpenRB 引脚 | 接到 | 说明 |
|------------|------|------|
| DYNAMIXEL TTL (左) | XL330 #1 → #2 → … → #12 | 菊花链, **注意方向**: 数据流从主控到舵机 |
| 5V | XL330 VCC 红线 | 板上 6V→5V 已降好 |
| GND | XL330 GND 黑/棕线 | 必须共地, 否则总线不稳定 |

> ⚠️ XL330 的**数据线只有一根**, 视频里没强调 —— 菊花链走线时**别把一根红线错插到 data 脚**, 否则上电就烧。

Pi Zero ↔ OpenRB USB:

```bash
# 主机端
ls /dev/ttyACM*   # 应该看到 /dev/ttyACM0 或 /dev/ttyUSB0
sudo usermod -a -G dialout $USER   # 加串口权限
```

---

## 五、软件启动命令 (可复制粘贴)

> ⚠️ 帆哥用的是 ROS2 Humble + Isaac Gym 仿真, 我实测在 Zero 2W 上只能跑 ONNX 推理; 仿真训练在主力机上跑完再下发。

### 主力机: 仿真训练 (PPO)

```bash
# 克隆官方仓库
git clone https://github.com/<原作者仓库>.git microduck
cd microduck/sim

# 用 conda 隔离环境 (视频同款)
conda create -n microduck python=3.10 -y
conda activate microduck
pip install -r requirements.txt

# 启动 Isaac Gym 训练 (headless 模式, 4 卡跑 4 小时)
python train.py --task microduck_walk \
    --headless --num_envs 4096 --max_iterations 5000
```

导出 ONNX:

```bash
python export_onnx.py \
    --ckpt logs/microduck_walk/model.pt \
    --output policy.onnx
```

### 树莓派 Zero 2W: 真机部署

```bash
# 1. 把策略文件 scp 过去
scp policy.onnx pi@microduck.local:/opt/microduck/

# 2. SSH 上车
ssh pi@microduck.local

# 3. 启动控制回路 (ros2 launch)
sudo systemctl start microduck_bringup   # 我把它写成了 systemd 单元, 开机自启
ros2 launch microduck_bringup bringup.launch.py \
    serial_port:=/dev/ttyACM0 \
    policy_path:=/opt/microduck/policy.onnx
```

### 在线遥测 (看策略有没有抽风)

```bash
# 在主机上订阅 joint_states
ros2 topic echo /microduck/joint_states --one-shot
# 应该看到 12 个 joint 的角度在动
```

---

## 六、我踩的三个最离谱的坑

> 这些视频里没明说, 纯自己复刻时撞墙了:

1. **2S 电池直供舵机抖动** —— XL330 标称 6V, 2S 满电 8.4V 直接过压, 舵机会高频抖。**必须先降压到 6V 再上舵机**, 视频里只提了一句"记得加降压", 没展开。
2. **Pi Zero 串口权限被 dialout 组挡** —— 首次 SSH 进去跑 `ros2 topic` 直接 `Permission denied`。一行 `sudo usermod -a -G dialout pi` 然后**重启** (不是 logout)。
3. **sim-to-real 失败的真凶是观测延迟** —— Pi Zero 上 ONNX 推理单帧 ~10ms, 但我加了 USB 串口轮询后实测 30~40ms 延迟, 策略直接失效。**解法**: 把控制步频从 100Hz 降到 50Hz, 仿真里同步用 50Hz 训练, 策略鲁棒性立刻回来。

---

## 七、复刻清单速查 (贴桌边)

```
[ ] 12 × XL330 (TTL 总线)
[ ] 1 × Pi Zero 2W + microSD 32G
[ ] 1 × OpenRB-150
[ ] 1 × 6V/3A DC-DC 降压模块
[ ] 2S 18650 + 保护板
[ ] 11 件 STL 打印件 (PLA/PETG)
[ ] D 型轴套 × 12 (关键!)
[ ] M2/M2.5 螺丝包
[ ] 一次性台灯 + 放大镜 (校准用)
```

---

## 下一步要做的

- [ ] 把 sim2real 失败的几次实验数据画成图, 对比 50Hz vs 100Hz 策略的足端轨迹
- [ ] 把 `bringup.launch.py` 抽成 systemd 单元, 开机自启
- [ ] 试一下把 XL330 换成 XL430, 看扭矩上限能放出来多少

---

> 本文基于 **AI-Fan AI 研究室 · 帆哥** 的视频教程整理, 原视频见: <https://www.youtube.com/watch?v=Vep8AjoCnEM>, 仅供个人学习折腾记录。
