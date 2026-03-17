import { config } from "../../package.json";

// ── Prompts ───────────────────────────────────────────────────────────────────

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
当前论文【仅获取到摘要，未获取到全文】。
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

// ── Pref helpers ──────────────────────────────────────────────────────────────

function getPref<T>(key: string): T {
  return Zotero.Prefs.get(`${config.prefsPrefix}.${key}`, true) as T;
}

async function existsInLibrary(item: any): Promise<boolean> {
    const title = (item.getField("title") || "").toLowerCase().trim();
    const doi = (item.getField("DOI") || "").toLowerCase().trim();
    const userLibID = Zotero.Libraries.userLibraryID;
  
    const ids = await Zotero.Items.getAll(userLibID, false, false, true) as number[];
    const all = await Zotero.Items.getAsync(ids) as any[];
  
    for (const it of all) {
      if (!it.isRegularItem?.()) continue;
      const d = (it.getField("DOI") || "").toLowerCase().trim();
      const t = (it.getField("title") || "").toLowerCase().trim();
      if (doi && d && doi === d) return true;
      if (title && t && title === t) return true;
    }
    return false;
  }
  
// ── API ───────────────────────────────────────────────────────────────────────

async function callAPI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<string> {
  const apiBase =
    (getPref<string>("apiBase") || "https://api.deepseek.com/v1").replace(/\/$/, "");
  const apiModel = getPref<string>("apiModel") || "deepseek-chat";

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: apiModel,
      temperature: 0.3,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

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

function parseJSON(text: string): any {
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

// ── Score ─────────────────────────────────────────────────────────────────────

function buildScoreSystemPrompt(): string {
  const topics =
    getPref<string>("researchTopics") || "机器学习势函数/MLIP\n分子动力学/MD模拟";
  const topicList = topics
    .split("\n")
    .filter(Boolean)
    .map((t) => `- ${t.trim()}`)
    .join("\n");

  return `你是一位化学/计算化学领域的专业研究人员。
请判断下面这篇论文与以下研究方向的相关性，给出 0-10 的整数评分：
- 10：与研究方向高度相关，必读
- 7-9：比较相关，值得关注
- 4-6：有一定关联，可选读
- 0-3：基本无关

【研究方向】
${topicList}

请只返回一个 JSON 对象，不要有任何其他文字：
{"score": <0-10的整数>, "reason": "<一句话说明理由>"}`;
}

export async function scoreRelevance(
  text: string,
  title: string,
  apiKey: string,
): Promise<number> {
  const systemPrompt = buildScoreSystemPrompt();
  const userPrompt = `【论文标题】\n${title}\n\n【论文摘要/内容节选】\n${text.slice(0, 3000)}`;
  try {
    const resp = await callAPI(apiKey, systemPrompt, userPrompt, 200);
    const data = parseJSON(resp);
    const score = parseInt(data.score);
    return isNaN(score) ? 0 : Math.min(10, Math.max(0, score));
  } catch (e) {
    ztoolkit.log(`[DailyPaper] Scoring failed: ${e}`);
    return 0;
  }
}

// ── Collection ────────────────────────────────────────────────────────────────
async function moveToCollection(item: any): Promise<void> {
    const collectionName = getPref<string>("collection") || "dailypaper";
    const userLibID = Zotero.Libraries.userLibraryID;
  
    ztoolkit.log(
      `[DailyPaper] moveToCollection start: title="${item.getField?.("title")}", itemID=${item.id}, libraryID=${item.libraryID}, isFeedItem=${!!item.isFeedItem}`,
    );
  
    let target = Zotero.Collections.getByLibrary(userLibID).find(
      (c: any) => c.name.toLowerCase() === collectionName.toLowerCase(),
    );
  
    if (!target) {
      target = new Zotero.Collection({
        libraryID: userLibID,
        name: collectionName,
      });
      await target.saveTx();
      ztoolkit.log(
        `[DailyPaper] Created collection "${collectionName}" (id=${target.id})`,
      );
    }
  
    let targetItem = item;
  
    if (item.isFeedItem) {
      if (await existsInLibrary(item)) {
        ztoolkit.log(`[DailyPaper] Already in library, skipping: "${item.getField("title")}"`);
        return;
      }
      try {
        ztoolkit.log(
          `[DailyPaper] Translating feed item to user library ${userLibID}...`,
        );
        const translated = await item.translate(userLibID, false);
  
        if (Array.isArray(translated)) {
          ztoolkit.log(
            `[DailyPaper] translate() returned array length=${translated.length}`,
          );
          targetItem = translated[0];
        } else {
          targetItem = translated;
        }
  
        if (!targetItem) {
            ztoolkit.log("[DailyPaper] translate() returned null/undefined, trying manual copy");
            throw new Error("translate returned null");
          }          
  
        ztoolkit.log(
          `[DailyPaper] Feed translated successfully: newItemID=${targetItem.id}, newLibraryID=${targetItem.libraryID}`,
        );
      } catch (e) {
        ztoolkit.log(`[DailyPaper] translate failed, trying manual copy: ${e}`);
        try {
          const newItem = new Zotero.Item("journalArticle");
          newItem.libraryID = userLibID;
          for (const field of ["title", "DOI", "abstractNote", "url", "date", "publicationTitle"]) {
            try {
              const val = item.getField(field);
              if (val) newItem.setField(field, val);
            } catch (_) {}
          }
          const creators = item.getCreators?.();
          if (creators?.length) newItem.setCreators(creators);
          await newItem.saveTx();
          targetItem = newItem;
  
          const dpTags = item.getTags()
            .filter((t: any) => t.tag.startsWith("dp-"))
            .map((t: any) => t.tag);
          for (const tag of dpTags) {
            targetItem.addTag(tag);
          }
  
          const scoreTag = dpTags.find((t: string) => t.startsWith("dp-score-"));
          if (scoreTag) {
            const score = scoreTag.replace("dp-score-", "");
            targetItem.setField("extra", `DP-Score: ${score}/10`);
          }
  
          await targetItem.saveTx();
          ztoolkit.log(`[DailyPaper] Manual copy succeeded: newItemID=${targetItem.id}`);
        } catch (e2) {
          ztoolkit.log(`[DailyPaper] Manual copy also failed: ${e2}`);
          return;
        }
      }
    }
  
    try {
      targetItem.addToCollection(target.id);
      await targetItem.saveTx();
      ztoolkit.log(
        `[DailyPaper] Item ${targetItem.id} added to collection "${collectionName}"`,
      );
    } catch (e) {
      ztoolkit.log(`[DailyPaper] Failed to add item to collection: ${e}`);
    }
  }  
  
// ── Extract text ──────────────────────────────────────────────────────────────

export async function extractText(item: any): Promise<string | null> {
  const attachments = item.getAttachments
    ? (item.getAttachments() as number[])
    : [];

  for (const attID of attachments) {
    const att = (await Zotero.Items.getAsync(attID)) as any;
    if (att.attachmentContentType === "application/pdf") {
      try {
        const result = await Zotero.PDFWorker.getFullText(attID, 50);
        if (result?.text && result.text.length > 200)
          return result.text.slice(0, 15000);
      } catch (e) {
        ztoolkit.log(`[DailyPaper] PDF extraction failed: ${e}`);
      }
    }
  }

  for (const attID of attachments) {
    const att = (await Zotero.Items.getAsync(attID)) as any;
    if (att.attachmentContentType === "text/html") {
      try {
        const content = await att.attachmentText;
        if (content && content.length > 200) return content.slice(0, 15000);
      } catch (e) {
        ztoolkit.log(`[DailyPaper] HTML extraction failed: ${e}`);
      }
    }
  }

  return (item.getField("abstractNote") as string) || null;
}

function smartChunk(text: string, maxChars = 27000): string {
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

function markdownToHtml(md: string): string {
    return md
      // 代码块
      .replace(/```[\s\S]*?```/g, (m) => `<pre><code>${m.slice(3, -3).replace(/^[^\n]*\n/, "")}</code></pre>`)
      // ### 标题
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      // 粗体
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // 斜体
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // 表格（简单处理）
      .replace(/^\|(.+)\|$/gm, (row) => {
        const cells = row.split("|").slice(1, -1).map((c) => `<td>${c.trim()}</td>`).join("");
        return `<tr>${cells}</tr>`;
      })
      .replace(/(<tr>.*<\/tr>\n?)+/g, (t) => `<table border="1" cellpadding="4">${t}</table>`)
      // 分隔线
      .replace(/^---$/gm, "<hr/>")
      // 无序列表
      .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>\n?)+/g, (l) => `<ul>${l}</ul>`)
      // 有序列表
      .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
      // 引用块
      .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
      // 换行
      .replace(/\n/g, "<br/>");
  }
  

// ── Process single item ───────────────────────────────────────────────────────

export async function processItem(item: any, apiKey: string): Promise<void> {
  const title = item.getField("title") as string;
  ztoolkit.log(`[DailyPaper] Processing: ${title}`);

  const text = await extractText(item);
  if (!text) {
    ztoolkit.log(`[DailyPaper] No text for: ${title}`);
    return;
  }

  const journal = (item.getField("publicationTitle") as string) || "";
  const authors = item
    .getCreators()
    .map((c: any) => c.lastName)
    .join(", ");
  const hasFulltext = text.length > 500;

  const header = `【期刊】${journal}\n【标题】${title}\n【作者】${authors}\n\n`;
  const systemPrompt = hasFulltext ? PROMPT_FULLTEXT : PROMPT_ABSTRACT;
  const body = hasFulltext
    ? `【论文正文（已提取关键段落）】\n${smartChunk(text)}`
    : `【论文摘要】\n${text}`;

  let analysis: string;
  try {
    analysis = await callAPI(apiKey, systemPrompt, header + body, 8192);
  } catch (e) {
    analysis = `解读失败: ${e}`;
  }

  // 删除旧的解读笔记，避免重复
  const existingNotes = item.getNotes ? (item.getNotes() as number[]) : [];
  for (const noteID of existingNotes) {
    const note = (await Zotero.Items.getAsync(noteID)) as any;
    if (note.getNote().includes("Daily Paper Digest 解读")) {
      await note.eraseTx();
    }
  }

  const noteContent = `<h2>Daily Paper Digest 解读</h2>
<p><strong>解读时间：</strong>${new Date().toLocaleString("zh-CN")}</p>
<hr/>
${markdownToHtml(analysis)}`;

  const note = new Zotero.Item("note");
  note.libraryID = item.libraryID;
  note.setNote(noteContent);
  note.parentID = item.id;
  await note.saveTx();

  item.addTag("dp-done");
  await item.saveTx();
}

// ── Menu actions ──────────────────────────────────────────────────────────────

function showAlert(msg: string) {
  (Zotero.getMainWindow() as any).alert(msg);
}

export async function scoreSelected(): Promise<void> {
  const apiKey = getPref<string>("apiKey");
  if (!apiKey) {
    showAlert("请先在 工具 → DailyPaper 设置 中填写 API Key");
    return;
  }
  const win = Zotero.getMainWindow() as any;
  const items: any[] = win.ZoteroPane.getSelectedItems();
  if (!items.length) {
    showAlert("请先选中文章");
    return;
  }

  const threshold = getPref<number>("scoreThreshold") || 4;
  const progressWin = new Zotero.ProgressWindow({ closeOnClick: false });
  progressWin.changeHeadline(`📄 DailyPaper: 评分中 0/${items.length}`);
  progressWin.show();
  const itemProgress = new progressWin.ItemProgress(
    "chrome://zotero/skin/spinner-16px.png",
    "准备中...",
  );

  const results: string[] = [];
  let relevant = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const title = (item.getField("title") as string) || "未知标题";
    progressWin.changeHeadline(`📄 DailyPaper: 评分中 ${i + 1}/${items.length}`);
    itemProgress.setText(title.slice(0, 60));

    try {
      const abstract = (item.getField("abstractNote") as string) || "";
      const score = await scoreRelevance(abstract || title, title, apiKey);

      item
        .getTags()
        .filter((t: any) => t.tag.startsWith("dp-score-"))
        .forEach((t: any) => item.removeTag(t.tag));
      item.addTag(`dp-score-${score}`);
 
      // 写入 extra 字段
      const existingExtra = (item.getField("extra") as string) || "";
      const newExtra = existingExtra
      .split("\n")
      .filter((l) => !l.startsWith("DP-Score:"))
      .concat(`DP-Score: ${score}/10`)
      .join("\n")
      .trim();
      item.setField("extra", newExtra);

      if (score < threshold) {
        item.removeTag("dp-relevant");
        item.addTag("dp-irrelevant");
        results.push(`${score}分 ✗  ${title.slice(0, 60)}`);
      } else {
        item.removeTag("dp-irrelevant");
        item.addTag("dp-relevant");
        relevant++;
        results.push(`${score}分 ✓  ${title.slice(0, 60)}`);
        await moveToCollection(item);
      }
      await item.saveTx();
    } catch (e) {
      results.push(`ERR ✗  ${title.slice(0, 60)}`);
      ztoolkit.log(`[DailyPaper] Error scoring: ${e}`);
    }
    await new Promise((r) => setTimeout(r, 0));
  }

  progressWin.close();
  win.alert(
    `评分完成：${relevant}/${items.length} 篇相关\n\n` +
      results.join("\n"),
  );
  
}

export async function analyzeSelected(): Promise<void> {
  const apiKey = getPref<string>("apiKey");
  if (!apiKey) {
    showAlert("请先在 工具 → DailyPaper 设置 中填写 API Key");
    return;
  }
  const win = Zotero.getMainWindow() as any;
  const items: any[] = win.ZoteroPane.getSelectedItems().filter(
    (item: any) => item.isRegularItem(),
  );
  if (!items.length) {
    showAlert("请先选中文章（Feed 条目需先转为普通条目）");
    return;
  }

  const progressWin = new Zotero.ProgressWindow({ closeOnClick: false });
  progressWin.changeHeadline("🔬 DailyPaper: 解读中...");
  progressWin.show();
  const itemProgress = new progressWin.ItemProgress(
    "chrome://zotero/skin/spinner-16px.png",
    "准备中...",
  );

  let done = 0;
  const process = async (index: number) => {
    if (index >= items.length) {
      itemProgress.setText(`完成！共解读 ${done} 篇`);
      itemProgress.setProgress(100);
      progressWin.startCloseTimer(5000);
      return;
    }
    const item = items[index];
    const title = item.getField("title") as string;
    itemProgress.setText(`${done + 1}/${items.length}: ${title.slice(0, 40)}`);
    itemProgress.setProgress((done / items.length) * 100);
    try {
      await processItem(item, apiKey);
    } catch (e) {
      ztoolkit.log(`[DailyPaper] Error: ${e}`);
    }
    done++;
    setTimeout(() => process(index + 1), 0);
  };
  setTimeout(() => process(0), 0);
}

export async function scoreFeedItems(): Promise<void> {
  const apiKey = getPref<string>("apiKey");
  if (!apiKey) {
    showAlert("请先在 工具 → DailyPaper 设置 中填写 API Key");
    return;
  }

  const items = await getFeedUnprocessedItems();
  if (!items.length) {
    showAlert("没有需要评分的 Feed 文章");
    return;
  }

  const threshold = getPref<number>("scoreThreshold") || 4;
  const progressWin = new Zotero.ProgressWindow({ closeOnClick: false });
  progressWin.changeHeadline("📰 DailyPaper: 批量评分 Feed...");
  progressWin.show();
  const itemProgress = new progressWin.ItemProgress(
    "chrome://zotero/skin/spinner-16px.png",
    `0/${items.length}`,
  );

  let done = 0;
  let relevant = 0;
  let moved = 0;
  const CONCURRENCY = 5;

  const processNext = async (index: number) => {
    if (index >= items.length) {
        itemProgress.setText(
            `完成！${relevant}/${items.length} 篇相关，${moved} 篇已加入文库`,
          );          
      itemProgress.setProgress(100);
      progressWin.startCloseTimer(8000);
      return;
    }
    const batch = items.slice(index, index + CONCURRENCY);
    await Promise.all(
      batch.map(async (item: any) => {
        try {
          const title = item.getField("title") as string;
          const abstract = (item.getField("abstractNote") as string) || "";
          const score = await scoreRelevance(abstract || title, title, apiKey);

          item
            .getTags()
            .filter((t: any) => t.tag.startsWith("dp-score-"))
            .forEach((t: any) => item.removeTag(t.tag));
          item.addTag(`dp-score-${score}`);

                // 写入 extra 字段
          const existingExtra = (item.getField("extra") as string) || "";
          const newExtra = existingExtra
          .split("\n")
          .filter((l) => !l.startsWith("DP-Score:"))
          .concat(`DP-Score: ${score}/10`)
          .join("\n")
          .trim();
          item.setField("extra", newExtra);

          if (score < threshold) {
            item.addTag("dp-irrelevant");
          } else {
            item.addTag("dp-relevant");
            relevant++;
          
            try {
              await moveToCollection(item);
              moved++; 
            } catch (e) {
              ztoolkit.log(
                `[DailyPaper] moveToCollection failed: "${item.getField("title")}": ${e}`,
              );
            }
          }          

          item.isRead = true;
          await item.saveTx();
        } catch (e) {
          ztoolkit.log(
            `[DailyPaper] Error scoring item "${item.getField("title")}" (id=${item.id}): ${e}`,
        );
        }
        done++;
        itemProgress.setText(`${done}/${items.length}，${relevant} 篇相关`);
        itemProgress.setProgress((done / items.length) * 100);
      }),
    );
    setTimeout(() => processNext(index + CONCURRENCY), 0);
  };
  setTimeout(() => processNext(0), 0);
}

export async function analyzeCollection(): Promise<void> {
  const apiKey = getPref<string>("apiKey");
  if (!apiKey) {
    showAlert("请先在 工具 → DailyPaper 设置 中填写 API Key");
    return;
  }

  const collectionName = getPref<string>("collection") || "dailypaper";
  const collections = Zotero.Collections.getByLibrary(
    Zotero.Libraries.userLibraryID,
  );
  const target = collections.find(
    (c: any) => c.name.toLowerCase() === collectionName.toLowerCase(),
  );
  if (!target) {
    showAlert(`找不到 Collection: ${collectionName}`);
    return;
  }

  const itemIDs = target.getChildItems(true) as number[];
  const allItems = (await Zotero.Items.getAsync(itemIDs)) as any[];
  const pending = allItems.filter((item: any) => {
    if (!item.isRegularItem()) return false;
    return !item.getTags().some((t: any) => t.tag === "dp-done");
  });

  if (!pending.length) {
    showAlert("Collection 里没有待解读的文章（已全部标记 dp-done）");
    return;
  }

  const progressWin = new Zotero.ProgressWindow({ closeOnClick: false });
  progressWin.changeHeadline("📚 DailyPaper: 批量解读 Collection...");
  progressWin.show();
  const itemProgress = new progressWin.ItemProgress(
    "chrome://zotero/skin/spinner-16px.png",
    `0/${pending.length}`,
  );

  let done = 0;
  const CONCURRENCY = 3;

  const processNext = async (index: number) => {
    if (index >= pending.length) {
      itemProgress.setText(`完成！共解读 ${done} 篇`);
      itemProgress.setProgress(100);
      progressWin.startCloseTimer(8000);
      return;
    }
    const batch = pending.slice(index, index + CONCURRENCY);
    await Promise.all(
      batch.map(async (item: any) => {
        const title = item.getField("title") as string;
        itemProgress.setText(
          `${done + 1}/${pending.length}: ${title.slice(0, 40)}`,
        );
        try {
          await processItem(item, apiKey);
        } catch (e) {
          ztoolkit.log(`[DailyPaper] Error: ${e}`);
        }
        done++;
        itemProgress.setProgress((done / pending.length) * 100);
      }),
    );
    setTimeout(() => processNext(index + CONCURRENCY), 0);
  };
  setTimeout(() => processNext(0), 0);
}

// ── Feed helpers ──────────────────────────────────────────────────────────────

async function getFeedUnprocessedItems(): Promise<any[]> {
  const results: any[] = [];
  const feeds = (Zotero.Feeds.getAll ? Zotero.Feeds.getAll() : []) as any[];
  for (const feed of feeds) {
    try {
      const itemIDs = (await Zotero.Items.getAll(
        feed.libraryID,
        false,
        false,
        true,
      )) as number[];
      const feedItems = (await Zotero.Items.getAsync(itemIDs)) as any[];
      for (const fi of feedItems) {
        if (!fi.isFeedItem || fi.isRead) continue;
        const tags = fi.getTags().map((t: any) => t.tag);
        if (tags.includes("dp-irrelevant") || tags.includes("dp-relevant"))
          continue;
        results.push(fi);
      }
    } catch (e) {
      ztoolkit.log(`[DailyPaper] Feed scan error: ${e}`);
    }
  }
  return results;
}
