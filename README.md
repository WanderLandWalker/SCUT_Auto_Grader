# SCUT_Auto_Grader

**华南理工大学作业互评自动脚本**

 [![Greasy Fork](https://img.shields.io/badge/Greasy_Fork-安装脚本-green?style=flat)](https://greasyfork.org/zh-CN/scripts/519362)[![Release](https://img.shields.io/badge/Release-v6.0-blue?style=flat)](https://github.com/WanderLandWalker/SCUT_Auto_Grader/releases/latest)[![License](https://img.shields.io/badge/License-GPL--3.0-green?style=flat)](https://github.com/WanderLandWalker/SCUT_Auto_Grader/blob/master/LICENSE)

---

## 功能

| 模式 | 说明 |
|------|------|
| **默认满分** | 所有学生直接打100分，自动遍历全部题目和学生 |
| **AI自动评分** | 调用大模型API，根据参考答案和学生回答自动评分写评语 |
| **导出题目数据** | 遍历所有题目，导出JSON+TXT，复制Prompt给外部AI批量评分 |
| **导入评分结果** | 粘贴AI返回的JSON或选择文件，自动填入评分并提交 |

### 核心特性

- **10+供应商一键切换**：DeepSeek、OpenAI、通义千问、硅基流动、智谱、Kimi、豆包、百川、零一万物、自定义
- **跳过已评学生**：自动检测"评定成功"标记，跳过已评过的作业
- **15.5秒防刷冷却**：精确控制两次提交间隔，符合教务系统限制
- **API失败熔断**：AI报错时直接停止，不会乱打默认分
- **思考模型兼容**：`max_tokens=5000`，支持DeepSeek-R1等推理模型
- **模型防失忆**：页面刷新后自动恢复供应商、URL、模型配置
- **综合题文件下载**：自动下载学生提交的.doc/.pdf附件
- **选文件夹导出**：支持选择本地文件夹保存导出数据

## 安装

### 方式一：从脚本平台安装（推荐）

 [![Greasy Fork](https://img.shields.io/badge/-Greasy_Fork-黑色?style=flat)](https://greasyfork.org/zh-CN/scripts/519362)

1. 安装油猴管理器：[Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/)
2. 点击上方平台链接，点击"安装"即可

### 方式二：从 GitHub 安装

1. 下载 [最新 Release](https://github.com/WanderLandWalker/SCUT_Auto_Grader/releases) 中的 `SCUT_Auto_Grader.user.js`
2. 浏览器地址栏输入 `file:///` + 文件完整路径
3. 油猴弹出安装提示，点击"安装"

### 方式三：手动粘贴

油猴管理面板 → `+` 新建脚本 → 删除默认内容 → 粘贴代码 → `Ctrl+S` 保存

## 使用

### 默认满分

1. 选择 **默认满分** 模式
2. 点击 **开始**
3. 脚本自动给每个学生打100分并提交，已评过的自动跳过

### AI自动评分

1. 选择 **AI自动评分** 模式
2. 选择供应商（如 DeepSeek）
3. 填入 API Key
4. 选择或输入模型名称（如 `deepseek-chat`）
5. 点击 **开始**
6. 脚本自动调用AI评分，每15秒提交一题

### 导出 + 外部AI评分

1. 选择 **导出题目数据** 模式
2. 点击 **开始导出**，选择保存文件夹
3. 脚本遍历所有题目，导出JSON和TXT文件
4. 完成后点击 **复制Prompt到剪贴板**
5. 打开任意AI（ChatGPT/DeepSeek/通义等），粘贴发送
6. AI返回评分JSON后，保存为 `.json` 文件
7. 回到脚本，选择 **导入评分结果**，导入JSON文件
8. 点击 **开始**，自动填入评分并提交

## 支持的供应商

| 供应商 | API Base URL | 推荐模型 |
|--------|-------------|----------|
| DeepSeek | `https://api.deepseek.com/v1` | deepseek-chat |
| OpenAI | `https://api.openai.com/v1` | gpt-4o-mini |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | qwen-plus |
| 硅基流动 | `https://api.siliconflow.cn/v1` | deepseek-ai/DeepSeek-V3 |
| 智谱GLM | `https://open.bigmodel.cn/api/paas/v4` | glm-4-flash |
| 月之暗面 | `https://api.moonshot.cn/v1` | moonshot-v1-8k |
| 豆包 | `https://ark.cn-beijing.volces.com/api/v3` | doubao-1.5-pro-32k |
| 自定义 | 任意OpenAI兼容接口 | 任意模型 |

## 版本历史

| 版本 | 变化 |
|------|------|
| v6.0 | max_tokens提升至5000兼容思考模型，增加@downloadURL自动更新 |
| v4.8 | 终极纠错：打印完整服务器回包排查非标准API问题 |
| v4.6 | 修复页面刷新导致模型配置丢失的Bug |
| v4.5 | 双重冷却机制：API防刷3.5秒+教务系统15.5秒 |
| v4.4 | UI美化(Catppuccin主题)，跳过已评，导出改进 |
| v4.0 | 状态机架构，跨页面刷新恢复进度 |

各版本可在 [Releases](https://github.com/WanderLandWalker/SCUT_Auto_Grader/releases) 下载。

## 技术实现

- **状态机**：用 `localStorage` 保存任务进度，页面刷新后自动恢复
- **防刷机制**：`clickSubmit()` 中实现15.5秒冷却计时，`__doPostBack` 直接切换学生
- **已评检测**：检查页面文本中的"评定成功"/"评定时间"/"您评定的成绩"标记 + localStorage提交记录
- **AI兼容**：支持OpenAI格式响应 + 非标准格式（`j.response`、`j.data.response`）+ 正则兜底解析

---

## 如果觉得有用

如果这个脚本帮到了你，欢迎给个 Star 支持一下！

[![GitHub Stars](https://img.shields.io/github/stars/WanderLandWalker/SCUT_Auto_Grader?style=social)](https://github.com/WanderLandWalker/SCUT_Auto_Grader)

## 许可证

[GPL-3.0 License](https://github.com/WanderLandWalker/SCUT_Auto_Grader/blob/master/LICENSE)
