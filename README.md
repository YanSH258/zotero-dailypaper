# Daily Paper Digest

[![Zotero 9](https://img.shields.io/badge/Zotero-9-CC2936?style=flat-square&logo=zotero&logoColor=white)](https://www.zotero.org/)
[![Latest release](https://img.shields.io/github/v/release/YanSH258/zotero-dailypaper?style=flat-square)](https://github.com/YanSH258/zotero-dailypaper/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/YanSH258/zotero-dailypaper/total?style=flat-square)](https://github.com/YanSH258/zotero-dailypaper/releases)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)](LICENSE)

一个面向 Zotero 9 的 AI 文献筛选、分类与解读插件。它可以根据你的研究方向为订阅论文评分，从论文自带关键词和摘要中提取关键词，并将文献整理到合适的 Collection 子文件夹。

## 主要功能

- 并行评分 Feed 新论文，筛选与研究方向相关的文章
- 高分 Feed 文章自动加入目标 Collection
- 优先使用论文自带关键词，并由 AI 补充核心关键词
- 根据当前 Collection 的已有子文件夹进行 AI 细分类
- 整理已有文献时，在当前 Collection 下分类，不会统一移动到 `dailypaper`
- 支持自定义分类同义词，将相近表述收敛为同一分类
- 在 Extra 字段保存评分、理由、分类和关键词，方便回看
- 为文章生成结构化中文解读笔记
- 支持每天定时自动评分
- 支持 DeepSeek、OpenAI 及其他兼容 OpenAI API 格式的服务

## 安装

1. 下载最新版本：[daily-paper-digest.xpi](https://github.com/YanSH258/zotero-dailypaper/releases/latest/download/daily-paper-digest.xpi)
2. 打开 Zotero，进入 `工具 → 插件`
3. 点击右上角齿轮按钮，选择 `Install Plugin From File...`
4. 选择下载的 `.xpi` 文件并完成安装

当前稳定版本为 [v1.3.0](https://github.com/YanSH258/zotero-dailypaper/releases/tag/v1.3.0)，支持 Zotero 9。

## 初始配置

安装后进入 `编辑 → 设置 → Daily Paper Digest`，至少填写以下内容：

| 配置项          | 说明                                                 |
| --------------- | ---------------------------------------------------- |
| API Key         | AI 服务的 API Key                                    |
| API Base URL    | 默认 `https://api.deepseek.com/v1`                   |
| 模型名          | 默认 `deepseek-chat`                                 |
| 研究方向        | 每行一个，用于判断论文相关性                         |
| 评分阈值        | 默认 4 分，高于阈值的 Feed 文章会加入目标 Collection |
| 目标 Collection | 默认 `dailypaper`，用于接收高分 Feed 文章            |

可选配置：

- **评分并发数**：默认 5。API 限流时可适当降低。
- **自动关键词与细分类**：启用后为高分文章提取关键词并分类。
- **分类同义词表**：格式为 `标准分类 = 同义词1, 同义词2`，留空即可使用现有子文件夹。
- **每日自动评分时间**：默认每天 8:00。
- **Prompt 模板**：可根据自己的学科和模型进行调整。

研究方向示例：

```text
机器学习势函数/MLIP
图神经网络/GNN
科学大模型/LLM-Agent
分子动力学/MD
DFT/第一性原理
催化与反应机理
```

## 使用方法

### 筛选 Feed 新论文

1. 添加并更新 Zotero Feed。
2. 右键任意条目，选择 `DailyPaper: 批量评分 Feed 文章`。
3. 高分文章会加入目标 Collection，并根据目标 Collection 的子文件夹进行细分类。
4. 选择 `DailyPaper: 批量解读 Collection`，可为 Collection 中的文章生成中文解读笔记。

### 整理已有文献

1. 在左侧选择需要整理的 Collection。
2. 为它创建希望使用的分类子文件夹，例如 `表面与界面`、`催化与反应机理`。
3. 右键选择 `DailyPaper: 将当前 Collection 归入子文件夹`。
4. AI 会从已有子文件夹中选择最合适的分类；原文献仍保留在当前 Collection 中。

也可以选中部分文献，使用 `DailyPaper: 将所选文献归入子文件夹`。

### 单篇操作

- `DailyPaper: 评分选中文章`：为选中文章评分
- `DailyPaper: 将所选文献归入子文件夹`：整理选中文献
- `DailyPaper: 解读选中文章`：生成单篇中文解读

## 分类逻辑

插件不会把“研究方向”直接当作分类文件夹，也不会让 AI 随意创建新主题。

分类候选来自：

1. 当前父 Collection 下已有的子文件夹
2. 用户填写的分类同义词表中的标准分类名
3. 兜底分类 `未分类`

AI 会结合论文标题、摘要、论文自带关键词以及研究方向，从这些候选分类中选择最合适的一项。研究方向仅用于帮助模型理解语义和评分，不作为强制分类名称。

论文自带关键词会保存为 `DP-Source-Keywords`；AI 整理后的关键词保存为 `DP-Keywords`。分类、评分及原因会写入 Extra 字段：

```text
DP-Score: 8/10
DP-Reason: 与机器学习势函数和分子动力学方向高度相关
DP-Category: 机器学习势函数 MLIP
DP-Source-Keywords: machine learning potential; molecular dynamics
DP-Keywords: MLIP; molecular dynamics; interatomic potential
```

## 常见问题

**为什么文章被分到 `未分类`？**

当前 Collection 下没有合适的子文件夹，或 AI 判断现有候选分类都不匹配。可以创建更合适的子文件夹后重新分类。

**为什么没有自动创建新的分类文件夹？**

为了避免产生大量相近或过于宽泛的分类，插件只使用现有子文件夹和分类同义词表中的标准分类。分类同义词表中的标准分类在使用时可以创建对应子文件夹。

**整理已有文献会把文章移动到 `dailypaper` 吗？**

不会。只有 Feed 筛选流程会把高分文章加入目标 Collection；整理已有文献时，会在当前 Collection 下进行分类。

**支持哪些 AI 服务？**

支持 DeepSeek、OpenAI，以及其他兼容 OpenAI Chat Completions API 格式的服务。不同服务的 Base URL 和模型名需要按服务商说明填写。

## 开发

```bash
npm install
npm run start
```

发布前检查：

```bash
npm run typecheck
npm run lint:check
npm run build
```

## 反馈

如遇到问题或有功能建议，请提交 [Issue](https://github.com/YanSH258/zotero-dailypaper/issues)。

## License

[AGPL-3.0](LICENSE)
