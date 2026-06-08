# Daily Paper Digest

[![zotero target version](https://img.shields.io/badge/Zotero-9-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)

一个 Zotero 插件，利用 AI 自动筛选订阅论文并生成中文解读笔记。

## 功能

- 对订阅（Feed）中的新论文自动评分，筛选与研究方向相关的文章
- 高分文章自动移入指定 Collection
- 高分文章自动提取关键词，优先使用论文自带关键词，并按细分类移动到子 Collection
- 支持可选分类同义词表，自动把相近分类收敛到标准分类名
- Feed 筛选进入 `dailypaper`；已有文献整理会在当前 Collection 下创建分类子文件夹，不移动到 `dailypaper`
- 支持配置评分并发数、缓存已有分类，并可手动分类选中文献或当前 Collection
- Extra 字段保存评分原因，便于回看筛选依据
- 对文章生成结构化中文解读笔记（摘要翻译、方法解析、实验结果、总结等）
- 每天早上 8 点自动评分，无需手动触发
- 支持任意兼容 OpenAI 格式的 API（DeepSeek、OpenAI 等）

## 安装

从 [Releases](../../releases) 下载最新的 `.xpi` 文件，拖入 Zotero 即可安装。

## 配置

编辑 → 首选项 → Daily Paper Digest，填写：

- API Key
- API Base URL（默认 `https://api.deepseek.com/v1`）
- 模型名（默认 `deepseek-chat`）
- 评分阈值（默认 4 分，高于此分数视为相关）
- 评分并发数（默认 5）
- 自动关键词与细分类（默认开启）
- 分类同义词表（可选，格式：`标准分类 = 同义词1, 同义词2`）
- 研究方向（每行一个，如 `机器学习势函数/MLIP`）
- 目标 Collection 名（默认 `dailypaper`）

## 使用

**日常流程**

1. 订阅更新后，右键任意条目 → 📰 DailyPaper: 批量评分 Feed 文章
2. 高分文章自动进入 dailypaper Collection 及其子分类，Extra 字段显示 `DP-Score: 7/10`、`DP-Reason`、`DP-Category`、`DP-Source-Keywords`、`DP-Keywords`
3. 右键 → 📚 DailyPaper: 批量解读 Collection，生成解读笔记

**单篇操作**

- 选中文章 → 📄 DailyPaper: 评分选中文章
- 选中文章 → 🏷️ DailyPaper: 将所选文献归入子文件夹
- 左侧选中 Collection → 🗂️ DailyPaper: 将当前 Collection 归入子文件夹
- 选中文章 → 🔬 DailyPaper: 解读选中文章

## License

AGPL-3.0
