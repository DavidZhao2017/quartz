---
title: 折腾笔记｜Flix 开源 ESP32 四轴飞行器整理（按 BOM 复刻的硬核准备）
date: 2026-09-17
tags:
  - 机器人
  - 开源硬件
  - 四轴飞行器
  - ESP32
  - seedling
description: 把 okalachev/flix 这个 ESP32 自制四轴飞行器项目从头到尾拆了一遍：硬件 BOM、ESP32 Mini 与 GY-91 的 SPI 接线、4 路 MOSFET 驱动 8520 有刷电机的电路、飞控源码入口和 GitHub 资源地址都整理成可执行清单。
---

# 折腾笔记｜Flix 开源 ESP32 四轴飞行器整理（按 BOM 复刻的硬核准备）

> 一句话：把 okalachev 的 **Flix**（flight + X）开源项目**从头拆了一遍**。项目主打"ESP32 + Arduino 自制四轴"，2k 行飞控源码、MAVLink over Wi-Fi/ESP-NOW、USB 手柄直连、Gazebo 仿真可用。本文按**复刻**视角整理：BOM、接线、避坑点、源码入口、配套资料全部归档，下次开打激光切 PCB 时只挑零件不动架构。

## 1. 项目速览

Flix 是 [okalachev](https://github.com/okalachev) 主导的开源四轴项目，目标"教育与研究"场景。从 v0 到 v1.1（3D 打印机架版本），整套设计走**通用件 + 3D 打印 + Arduino 飞控**路线，源码不到 2000 行，单人可复刻。**官方强调：它真的能飞**，不是纸上谈兵。

**几个关键能力**：

- 通信走 **MAVLink** 协议（同一套地面站软件能复用：QGroundControl / Mission Planner）
- 支持 **Wi-Fi / ESP-NOW** 双通道，**USB 游戏手柄** / 遥控器 / 手机三种控制方式
- **Gazebo 仿真**直接跑固件源码，无需移植（验证算法先用仿真炸鸡，不烧真机）
- **Python SDK** 可脚本化飞行任务（路线规划、批量跑测试、自动拍照）
- 配套飞控理论**教科书**（作者在写）

## 2. 我在意的几个点（决定复刻预算）

| 项 | 详情 | 复刻成本 |
|---|---|---|
| 主控 | ESP32 Mini（也支持 ESP32-S3 / ESP32-C3） | ¥15–35（Mini 便宜但阉割版慎选） |
| IMU | GY-91（10 轴，集成 MPU-9250 + BMP280 气压计¹） | ¥25 |
| 电调方案 | 直接用 **MOSFET** 驱动 **8520 有刷电机**（不是 ESC） | ¥8（4×MOSFET + 4×电机 + 6×电阻） |
| 桨 | 55mm 或 65mm（注意轴径匹配电机轴） | ¥4–8 |
| 电池 | 3.7V Li-Po **952540** 软包（注意 **25C 放电倍率**） | ¥25 |
| 机架 | **3D 打印**，2 个 STL 文件 | ¥10（耗材）+ 一台打印机 |
| 螺丝 | M3×5（IMU 固定）+ M1.4×5（机架组装） | ¥2 |

¹ **气压计目前未启用**（算法没接），但 GY-91 板载就先用着。

**我看到 BOM 时最先反应的是"用 MOSFET 不用 ESC"**。原因是 8520 是 3.7V 有刷电机，**额定电压必须正好 3.7V**（不是"3.7V–6V 工作电压范围"那种），所以 ESP32 输出一路 GPIO → MOSFET 栅极 → 直接驱动电机，省掉 ESC 的几十克重量和十几块钱。这种简化在**亚克力 + 3D 打印的微型四轴**上是合理的。

## 3. 接线表（必看）

ESP32 与 **GY-91 IMU** 通过 **VSPI** 接口通信（不是普通 I2C，是 SPI 高速）：

| IMU 引脚 | ESP32 Mini 引脚 | 备注 |
|---|---|---|
| GND | GND | 共地 |
| 3.3V | 3.3V | IMU 供电 |
| SCL (SCK) | SVP (GPIO18) | SPI 时钟 |
| SDA (MOSI) | GPIO23 | SPI 主出从入 |
| SAO (MISO) | GPIO19 | SPI 主入从出 |
| NCS | GPIO5 | SPI 片选 |

**4 路电机驱动（MOSFET 必须焊接下拉电阻）**：

| 电机 | 位置 | 转向 | 桨型 | 电机线颜色 | GPIO |
|---|---|---|---|---|---|
| Motor 0 | 后左 (Rear left) | 逆时针 | B | 黑 + 白 | GPIO12 (TDI) |
| Motor 1 | 后右 (Rear right) | 顺时针 | A | 蓝 + 红 | GPIO13 (TCK) |
| Motor 2 | 前右 (Front right) | 逆时针 | B | 黑 + 白 | GPIO14 (TMS) |
| Motor 3 | 前左 (Front left) | 顺时针 | A | 蓝 + 红 | GPIO15 (TD0) |

> ⚠️ **避坑：MOSFET 不能用 KIA 100N03A**（即使标称一样也未必能驱动），作者点名推荐 **UMW 100N03A** 或同档。
> ⚠️ **避坑：电机线颜色**对应桨型，**反了直接翻机**。蓝红 = 顺时针 = 桨 A；黑白 = 逆时针 = 桨 B。

**可选：RC 接收机（接 UART2）**

| 接收机 | ESP32 |
|---|---|
| GND | GND |
| VIN | VCC（或 3.3V，取决于接收机） |
| Signal (TX) | GPIO4 |

**可选：电池电压分压采样 → ADC1 任意引脚**（如 ESP32 上的 GPIO32，ESP32-S3 上是 GPIO3）。

## 4. 工具需求

复刻这台机器只需要四样东西：

- **3D 打印机**（机架 STL 在仓库 `Resources/`）
- **电烙铁 + 焊锡（含助焊剂）**
- **螺丝刀 + 万用表**（调试电源/信号时必用）
- **耐心 + 一只不贵的小飞控开发板**

**钱不是重点，时间和耐心才是**。整个项目最大头是**调试**而不是硬件采购。

## 5. 源码结构与复刻路径

仓库代码不到 2000 行，主要分三块：

1. **飞控主循环**（PID + 姿态解算 + MAVLink 输出）
2. **驱动层**（IMU 读取、SPI 通信、GPIO 输出 MOSFET PWM）
3. **通信层**（MAVLink over Wi-Fi 或 ESP-NOW）

**官方推荐的复刻流程**（不在 README 里直接给，但有几个公开文档）：

- **Assembly instructions**（组装步骤）
- **Usage: build, setup and flight**（编译、配置、首飞）
- **Simulation**（Gazebo 仿真教程）
- **Python library**（SDK 用法）
- **Firmware architectural overview**（飞控架构说明）
- **Troubleshooting**（故障排查）
- **Log analysis**（日志分析）

**📚 完整教程链接**：项目主仓库下文档区有详细分段，原仓库链接见文末。

**复刻我的个人路径（先仿真后真机）**：

```bash
# 1. 先在 Gazebo 里跑飞控源码（不烧硬件，验证算法）
cd ~/flix-sim
docker compose up -d
# 容器起来后用 QGroundControl 走 UDP 127.0.0.1:14550 连进来看姿态

# 2. 仿真调通后再烧 ESP32
git clone https://github.com/okalachev/flix.git
cd flix/firmware
# 用 PlatformIO 或 Arduino IDE 烧录 (选 ESP32 Mini 板型)
pio run -t upload

# 3. 硬件首次上电：拆掉桨 → 通电 → 看 MAVLink 输出 → 用手柄测响应
# 4. 装桨 → 拴安全绳 → 30cm 高度试悬停
# 5. 出户飞：先无 GPS（姿态模式），定位控制还在开发中
```

## 6. 仍在开发中的功能

| 功能 | 状态 | 影响 |
|---|---|---|
| **Position control**（位置控制 / 自主悬停） | 开发中（用顶视摄像头 + RoboCamp 2026 demo 验证） | 现在只能姿态模式，靠飞手手动 |
| **Flix2 官方 PCB** | 设计中（关注作者频道） | 现在只能用 3D 打印 + 杜邦线，重量和电磁干扰都不理想 |
| **飞控理论教科书** | 在写 | 解释 PID / 滤波 / 姿态解算的物理含义 |

> **2026-09 时点**：项目还处于"能用 + 教育价值 > 商业稳定性"的阶段。想拿来做正式应用（如测绘、长续航）至少要等 **position control** 上线 + **官方 PCB**。

## 7. 我的复刻决策清单

| 步骤 | 我需要准备的东西 | 风险 |
|---|---|---|
| 1 | ESP32 Mini × 1，GY-91 × 1 | 低（淘宝 ¥50 内搞定） |
| 2 | 8520 电机 × 4 + 65mm 桨 × 4 | 中（轴径匹配常踩坑） |
| 3 | UMW 100N03A × 4 + 10kΩ 电阻 × 6 + MX2.0 母头 × 1 | 低 |
| 4 | 3D 打印机架（2 个 STL 文件） | 低（已有打印机） |
| 5 | 编译烧录（PlatformIO） | 中（首次 SPI 时序配置要查 IMU 库） |
| 6 | Gazebo 仿真联调 | 中（环境搭建需 Docker） |
| 7 | **绑安全绳**试飞 | **高（首次必带，姿态模式无 GPS）** |
| 8 | 切 PCB（Flix2 官方板） | 待定 |

**暂未决定**：是否买 LiteRadio CC2500 遥控（¥120），还是先用 USB 手柄凑合。

## 8. 为什么写这篇

我之前复刻过 MicroDuck 四足机器人（强化学习步态），那种"激光雷达 + ROS2 + Isaac Gym"路线对硬件和算力门槛太高。Flix 让我看到**另一种极简路线**：单片机 + Arduino + 真实物理建模。

**接下来**：

- 短期：**先跑通仿真**，不烧硬件
- 中期：等 Flix2 官方 PCB 出来，**打板 + 重新组装**
- 长期：如果 Position Control 上线，**扩展到室外自主悬停**实验

---

> 本文基于 [okalachev/flix](https://github.com/okalachev/flix) 开源项目整理，原文地址: [github.com/okalachev/flix](https://github.com/okalachev/flix)，仅供个人学习折腾记录。
