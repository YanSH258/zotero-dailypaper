import { BasicTool } from "zotero-plugin-toolkit";
import { config } from "../package.json";

const PROMPT_FULLTEXT = `你是一位经验丰富的化学/计算化学领域研究人员。
请对以下论文进行专业、深入的解读。全程中文，术语保留英文原文并附解释。严禁编造具体数字。

### 0. 摘要翻译
将论文摘要原文翻译为中文，保持学术语言风格，不做删减。
---
### 1. 方法动机
**a) 提出动机**：作者为什么要提出这个方法？驱动力和研究背景。
**b) 现有方法的痛点**：现有主流方法的具体局限性（不泛泛而谈）。
**c) 核心假设与直觉**：用 2-3 句话概括本文的核心研究假设。
---
### 2. 方法设计
**a) 方法流程（Pipeline）**：输入 → 每个处理步骤（含技术细节）→ 输出。
**b) 模块结构**：每个模块的功能，以及各模块如何协同。
**c) 公式与算法解释**：通俗解释每个关键公式的含义和作用。
---
### 3. 与其他方法对比
**a) 本质区别**：最根本的不同在哪里？
**b) 创新点**：核心贡献列表（编号）
**c) 适用场景**：什么情况下更有优势？
**d) 对比表格**（包含本文方法与至少2个对比方法，列出核心思路、优缺点）
---
### 4. 实验表现
**a) 实验设计**：数据集、基线、评估指标、实验设置
**b) 关键结果**：最具代表性的数据和结论（数字具体）
**c) 优势场景**：在哪些设置下优势最明显？
**d) 局限性**：泛化能力、计算开销、数据依赖、适用范围限制
---
### 5. 学习与应用
**a) 开源情况与复现建议**
**b) 实现细节**：超参数、数据预处理、训练技巧
**c) 迁移潜力**：能否迁移到其他任务/领域？
---
### 6. 总结
**a) 一句话核心思想**（≤20字）
**b) 速记版 Pipeline**（3-5步，不用论文术语，直白具体）`;

const PROMPT_ABSTRACT = `你是一位经验丰富的化学/计算化学领域研究人员。
  当前这篇论文【仅获取到摘要，未获取到全文】。
  
  请严格按照以下格式输出，并遵守【极严苛指令】：
  ⚠️ 对于摘要中没有提及的内容，必须原封不动输出"因未获取到全文，摘要中无此信息"，绝对禁止依靠领域知识猜测或补全。
  
  ### 0. 摘要翻译
  将论文摘要原文翻译为中文，保持学术语言风格，不做删减。
  ---
  ### 1. 方法动机
  仅基于摘要提取动机和背景（若没有则写"因未获取到全文，摘要中无此信息"）。
  ---
  ### 2. 方法设计
  因未获取到全文，摘要中无此信息。
  ---
  ### 3. 与其他方法对比
  因未获取到全文，摘要中无此信息。
  ---
  ### 4. 实验表现
  仅基于摘要提取关键结果（若摘要中无具体数据，写"因未获取到全文，摘要中无此信息"）。
  ---
  ### 5. 学习与应用
  因未获取到全文，摘要中无此信息。
  ---
  ### 6. 总结
  **a) 一句话核心思想**（基于摘要概括，≤20字）
  **b) 速记版 Pipeline**：因未获取到全文，摘要中无此信息。`;

class DailyPaperPlugin {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.scheduleDaily();
    Zotero.log("[DailyPaper] Plugin started");
  }

  shutdown() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  scheduleDaily() {
    const now = new Date();
    const next = new Date();
    next.setHours(8, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const delay = next.getTime() - now.getTime();
    Zotero.log(`[DailyPaper] Next run in ${Math.round(delay / 60000)} minutes`);

    this.timer = setTimeout(async () => {
      await this.run();
      this.scheduleDaily();
    }, delay);
  }

  async run() {
    Zotero.log("[DailyPaper] Starting daily run...");
    const apiKey = Zotero.Prefs.get("extensions.dailypaper.apiKey", true) as string;
    if (!apiKey) {
      Zotero.log("[DailyPaper] No API key set, aborting");
      return;
    }
    const collectionName =
      (Zotero.Prefs.get("extensions.dailypaper.collection", true) as string) || "dailypaper";
    const items = await this.getUnprocessedItems(collectionName);
    Zotero.log(`[DailyPaper] Found ${items.length} unprocessed items`);
  
    // 并发处理，每批 5 篇
    const CONCURRENCY = 5;
    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const batch = items.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map((item: any) =>
          this.processItem(item, apiKey).catch((e: any) =>
            Zotero.log(`[DailyPaper] Error processing item: ${e}`)
          )
        )
      );
      Zotero.log(`[DailyPaper] Batch ${Math.floor(i / CONCURRENCY) + 1} done`);
    }
  
    Zotero.log("[DailyPaper] Daily run complete");
  }  

  async getUnprocessedItems(collectionName: string) {
    const collections = Zotero.Collections.getByLibrary(
      Zotero.Libraries.userLibraryID
    );
    const target = collections.find(
      (c: any) => c.name.toLowerCase() === collectionName.toLowerCase()
    );
    if (!target) {
      Zotero.log(`[DailyPaper] Collection "${collectionName}" not found`);
      return [];
    }
    const itemIDs = target.getChildItems(true) as number[];
    const items = (await Zotero.Items.getAsync(itemIDs)) as any[];
    return items.filter((item: any) => {
      if (!item.isRegularItem()) return false;
      const tags = item.getTags().map((t: any) => t.tag);
      return !tags.includes("dp-done") && !tags.includes("dp-irrelevant");
    });
  }

  async extractText(item: any): Promise<string | null> {
    const attachments = item.getAttachments() as number[];

    // 优先 PDF
    for (const attID of attachments) {
      const att = (await Zotero.Items.getAsync(attID)) as any;
      if (att.attachmentContentType === "application/pdf") {
        try {
          const result = await Zotero.PDFWorker.getFullText(attID, 50);
          if (result?.text && result.text.length > 200) {
            return result.text.slice(0, 15000);
          }
        } catch (e) {
          Zotero.log(`[DailyPaper] PDF extraction failed: ${e}`);
        }
      }
    }

    // HTML 快照
    for (const attID of attachments) {
      const att = (await Zotero.Items.getAsync(attID)) as any;
      if (att.attachmentContentType === "text/html") {
        try {
          const content = await att.attachmentText;
          if (content && content.length > 200) return content.slice(0, 15000);
        } catch (e) {
          Zotero.log(`[DailyPaper] HTML extraction failed: ${e}`);
        }
      }
    }

    // 兜底摘要
    return (item.getField("abstractNote") as string) || null;
  }

  async processItem(item: any, apiKey: string) {
    const title = item.getField("title") as string;
    Zotero.log(`[DailyPaper] Processing: ${title}`);

    const text = await this.extractText(item);
    if (!text) {
      Zotero.log(`[DailyPaper] No text for: ${title}`);
      return;
    }

    const score = await this.scoreRelevance(text, title, apiKey);
    Zotero.log(`[DailyPaper] Score: ${score} for: ${title}`);

    if (score < 4) {
      item.addTag("dp-irrelevant");
      await item.saveTx();
      return;
    }

    const journal = (item.getField("publicationTitle") as string) || "";
    const authors = item
      .getCreators()
      .map((c: any) => c.lastName)
      .join(", ");
    const hasFulltext = text.length > 500;
    const result = await this.analyze(
      text,
      title,
      journal,
      authors,
      hasFulltext,
      apiKey
    );

    await this.saveNote(item, score, result.analysis);
    item.addTag("dp-done");
    await item.saveTx();
  }

  async scoreRelevance(
    text: string,
    title: string,
    apiKey: string
  ): Promise<number> {
    const systemPrompt = `你是一位化学/计算化学领域的专业研究人员。
请判断下面这篇论文与以下研究方向的相关性，给出 0-10 的整数评分：
- 10：与研究方向高度相关，必读
- 7-9：比较相关，值得关注
- 4-6：有一定关联，可选读
- 0-3：基本无关

【研究方向】
- 机器学习势函数 / MLIP（MLFF、NequIP、MACE、DeePMD 等）
- 分子动力学 / MD 模拟
- 金属有机框架 / MOF 与多孔材料
- DFT / 第一性原理计算（VASP、QE 等）
- 催化与反应机理（电催化、光催化、过渡态）
- 材料性质预测（带隙、声子、弹性、热导率）
- 大模型 / AI for Science（GNN、Transformer、扩散模型、基础模型）
- 量子化学 / 电子结构（CCSD、MP2、TD-DFT 等）
- 纳米材料 / 表面与界面

请只返回一个 JSON 对象，不要有任何其他文字：
{"score": <0-10的整数>, "reason": "<一句话说明理由>"}`;

    const userPrompt = `【论文标题】\n${title}\n\n【论文摘要/内容节选】\n${text.slice(0, 3000)}`;

    try {
      const resp = await this.callAPI(apiKey, systemPrompt, userPrompt, 200);
      const data = this.parseJSON(resp);
      const score = parseInt(data.score);
      return isNaN(score) ? 0 : Math.min(10, Math.max(0, score));
    } catch (e) {
      Zotero.log(`[DailyPaper] Relevance scoring failed: ${e}`);
      return 0;
    }
  }

  async analyze(
    text: string,
    title: string,
    journal: string,
    authors: string,
    hasFulltext: boolean,
    apiKey: string
  ) {
    const header = `【期刊】${journal}\n【标题】${title}\n【作者】${authors}\n\n`;
    const systemPrompt = hasFulltext ? PROMPT_FULLTEXT : PROMPT_ABSTRACT;
    const body = hasFulltext
      ? `【论文正文（已提取关键段落）】\n${this.smartChunk(text)}`
      : `【论文摘要】\n${text}`;

    try {
      const result = await this.callAPI(apiKey, systemPrompt, header + body, 8192);
      return { success: true, analysis: result };
    } catch (e) {
      return { success: false, analysis: `解读失败: ${e}` };
    }
  }

  smartChunk(text: string, maxChars = 27000): string {
    if (text.length <= maxChars) return text;
    const budget: Record<string, number> = {
      intro: 2000,
      method: 10000,
      results: 10000,
      conclusion: 5000,
    };
    const patterns: Record<string, RegExp> = {
      intro: /introduction|background|motivation/i,
      method: /method|approach|model|framework|computational|theory|calculation/i,
      results: /result|experiment|performance|evaluation|benchmark/i,
      conclusion: /conclusion|summary|discussion|outlook/i,
    };
    const parts: string[] = [];
    for (const key of ["intro", "method", "results", "conclusion"]) {
      const match = patterns[key].exec(text);
      if (match) parts.push(text.slice(match.index, match.index + budget[key]));
    }
    if (!parts.length) {
      return (
        text.slice(0, maxChars / 2) +
        "\n...[中间内容已省略]...\n" +
        text.slice(-maxChars / 4)
      );
    }
    let result = parts.join("\n...\n");
    if (result.length > maxChars) result = result.slice(0, maxChars);
    return result;
  }

  async saveNote(item: any, score: number, analysis: string) {
    const noteContent = `<h2>Daily Paper Digest 解读</h2>
<p><strong>相关性评分：</strong>${score}/10</p>
<p><strong>解读时间：</strong>${new Date().toLocaleString("zh-CN")}</p>
<hr/>
${analysis.replace(/\n/g, "<br/>")}`;

    const note = new Zotero.Item("note");
    note.libraryID = item.libraryID;
    note.setNote(noteContent);
    note.parentID = item.id;
    await note.saveTx();
  }

  async callAPI(
    apiKey: string,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number
  ): Promise<string> {
    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          temperature: 0.3,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!response.ok)
      throw new Error(`API ${response.status}: ${await response.text()}`);
    const data = (await response.json()) as any;
    const choice = data.choices[0];
    let content = choice.message.content.trim();
    if (choice.finish_reason === "length") {
      content += "\n\n> ⚠️ **[AI 解读因达到输出长度上限被截断]**";
    }
    return content;
  }

  parseJSON(text: string): any {
    text = text
      .trim()
      .replace(/^```[^\n]*\n?/, "")
      .replace(/```$/, "");
    try {
      return JSON.parse(text);
    } catch {
      const match = /\{.*\}/s.exec(text);
      if (match) return JSON.parse(match[0]);
      return { score: 0, reason: "解析失败" };
    }
  }
}
const basicTool = new BasicTool();
// @ts-expect-error
if (!basicTool.getGlobal("Zotero")[config.addonInstance]) {
  // @ts-expect-error
  Zotero[config.addonInstance] = new DailyPaperPlugin();
}