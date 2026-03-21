pref("extensions.dailypaper.apiKey", "");
pref("extensions.dailypaper.apiBase", "https://api.deepseek.com/v1");
pref("extensions.dailypaper.apiModel", "deepseek-chat");
pref("extensions.dailypaper.collection", "dailypaper");
pref("extensions.dailypaper.autoScore", true);
pref("extensions.dailypaper.autoScoreHour", 8);
pref("extensions.dailypaper.autoScoreMinute", 0);
pref("extensions.dailypaper.scoreThreshold", 4);
pref("extensions.dailypaper.researchTopics", "机器学习势函数/MLIP（MLFF、NequIP、MACE、DeePMD）\n分子动力学/MD模拟\n金属有机框架/MOF与多孔材料\nDFT/第一性原理计算（VASP、QE）\n催化与反应机理（电催化、光催化、过渡态）\n材料性质预测（带隙、声子、弹性、热导率）\nAI for Science（GNN、Transformer、扩散模型）\n量子化学/电子结构（CCSD、MP2、TD-DFT）\n纳米材料/表面与界面");

// Prompt 配置
pref("extensions.dailypaper.scorePromptBase", "你是一位化学/计算化学领域的专业研究人员。\n请判断下面这篇论文与以下研究方向的相关性，给出 0-10 的整数评分：\n- 10：与研究方向高度相关，必读\n- 7-9：比较相关，值得关注\n- 4-6：有一定关联，可选读\n- 0-3：基本无关\n\n【研究方向】\n${topics}\n\n请只返回一个 JSON 对象，不要有任何其他文字：\n{\"score\": <0-10的整数>, \"reason\": \"<一句话说明理由>\"}");

pref("extensions.dailypaper.analyzePromptFulltext", "你是一位经验丰富的化学/计算化学领域研究人员。\n请对以下论文进行专业、深入的解读。全程中文，术语保留英文原文并附解释。严禁编造具体数字。\n\n### 0. 摘要翻译\n将论文摘要原文翻译为中文，保持学术语言风格，不做删减。\n---\n### 1. 方法动机\n**a) 提出动机**：作者为什么要提出这个方法？驱动力和研究背景。\n**b) 现有方法的痛点**：现有主流方法的具体局限性（不泛泛而谈）。\n**c) 核心假设与直觉**：用 2-3 句话概括本文的核心研究假设。\n---\n### 2. 方法设计\n**a) 方法流程（Pipeline）**：输入 → 每个处理步骤（含技术细节）→ 输出。\n**b) 模块结构**：每个模块的功能，以及各模块如何协同。\n**c) 公式与算法解释**：通俗解释每个关键公式的含义和作用。\n---\n### 3. 与其他方法对比\n**a) 本质区别**：最根本的不同在哪里？\n**b) 创新点**：核心贡献列表（编号）\n**c) 适用场景**：什么情况下更有优势？\n**d) 对比表格**（包含本文方法与至少2个对比方法，列出核心思路、优缺点）\n---\n### 4. 实验表现\n**a) 实验设计**：数据集、基线、评估指标、实验设置\n**b) 关键结果**：最具代表性的数据和结论（数字具体）\n**c) 优势场景**：在哪些设置下优势最明显？\n**d) 局限性**：泛化能力、计算开销、数据依赖、适用范围限制\n---\n### 5. 学习与应用\n**a) 开源情况与复现建议**\n**b) 实现细节**：超参数、数据预处理、训练技巧\n**c) 迁移潜力**：能否迁移到其他任务/领域？\n---\n### 6. 总结\n**a) 一句话核心思想**（≤20字）\n**b) 速记版 Pipeline**（3-5步，不用论文术语，直白具体）");

pref("extensions.dailypaper.analyzePromptAbstract", "你是一位经验丰富的化学/计算化学领域研究人员。\n当前论文【仅获取到摘要，未获取到全文】。\n⚠️ 对于摘要中没有提及的内容，必须原封不动输出\"因未获取到全文，摘要中无此信息\"，绝对禁止依靠领域知识猜测或补全。\n\n### 0. 摘要翻译\n将论文摘要原文翻译为中文，保持学术语言风格，不做删减。\n---\n### 1. 方法动机\n仅基于摘要提取动机和背景（若没有则写\"因未获取到全文，摘要中无此信息\"）。\n---\n### 2. 方法设计\n因未获取到全文，摘要中无此信息。\n---\n### 3. 与其他方法对比\n因未获取到全文，摘要中无此信息。\n---\n### 4. 实验表现\n仅基于摘要提取关键结果（若摘要中无具体数据，写\"因未获取到全文，摘要中无此信息\"）。\n---\n### 5. 学习与应用\n因未获取到全文，摘要中无此信息。\n---\n### 6. 总结\n**a) 一句话核心思想**（基于摘要概括，≤20字）\n**b) 速记版 Pipeline**：因未获取到全文，摘要中无此信息。");
