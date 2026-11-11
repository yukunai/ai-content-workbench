import { findSkill } from "./skills";
import type {
  AnalysisResult,
  CoreExtract,
  DraftResult,
  ExportPayload,
  FormatResult,
  HumanizeResult,
  Skill,
  SkillModule,
  StoryboardImageAsset,
  StoryboardRow,
  VideoAssets,
  VideoRenderPayload,
  VideoRenderProject,
  VideoScript
} from "./types";

const ABSTRACT_TERMS = ["赋能", "打造", "深度", "全面", "高效", "价值", "生态", "体系", "闭环", "升级", "趋势", "优化"];
const TEMPLATE_TERMS = ["首先", "其次", "最后", "总而言之", "综上所述", "不难发现", "随着时代的发展", "由此可见"];
const SUMMARY_TERMS = ["总结", "归根结底", "本质上", "总体来看", "最终", "核心在于"];
const HUMAN_MARKERS = ["我", "我们", "你", "朋友", "客户", "同事", "老板", "那天", "现场", "后来"];
const DETAIL_MARKERS = ["年", "月", "日", "点", "客户", "会议", "屏幕", "朋友", "同事", "老板", "那天", "现场", "案例", "数据", "截图", "评论"];

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function cleanInput(value: string | undefined, fallback: string) {
  const next = value?.trim();
  return next && next.length > 0 ? next : fallback;
}

function countMatches(content: string, terms: string[]) {
  return terms.reduce((count, term) => count + (content.includes(term) ? 1 : 0), 0);
}

function resolveSkill(skill: Skill | undefined, skillId: string | undefined, fallbackModule: SkillModule) {
  if (skill?.id && skill.module === fallbackModule) return skill;
  return findSkill(skillId, fallbackModule);
}

function splitParagraphs(content: string) {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

function splitSentences(content: string) {
  return content
    .replace(/\n+/g, " ")
    .split(/[。！？!?；;]/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 4);
}

function sentenceUniformityRisk(content: string) {
  const lengths = splitSentences(content).map((sentence) => Array.from(sentence).length);
  if (lengths.length < 3) return 52;
  const average = lengths.reduce((sum, item) => sum + item, 0) / lengths.length;
  const variance = lengths.reduce((sum, item) => sum + Math.pow(item - average, 2), 0) / lengths.length;
  const stdev = Math.sqrt(variance);
  return clamp(Math.round(100 - (stdev / Math.max(average, 1)) * 145));
}

function wordCount(content: string) {
  return Array.from(content.replace(/\s/g, "")).length;
}

function ensureSentenceEnd(content: string) {
  return /[。！？!?]$/.test(content.trim()) ? content.trim() : `${content.trim()}。`;
}

function softenTemplateTerms(content: string) {
  return content
    .replaceAll("赋能", "帮人把事情做得更顺")
    .replaceAll("打造", "做出")
    .replaceAll("全面提升", "明显变好")
    .replaceAll("深度", "更具体");
}

function softenParagraphWithoutMetadata(paragraph: string) {
  return paragraph
    .split("\n")
    .map((line) => (/^(#+\s|写作风格：|使用 Skill：)/.test(line.trim()) ? line : softenTemplateTerms(line)))
    .join("\n");
}

function paragraphRisk(paragraph: string, index: number) {
  const plain = paragraph.replace(/^#+\s*/gm, "").trim();
  const templateHits = countMatches(plain, TEMPLATE_TERMS);
  const abstractHits = countMatches(plain, ABSTRACT_TERMS);
  const summaryHits = countMatches(plain, SUMMARY_TERMS);
  const hasHuman = countMatches(plain, HUMAN_MARKERS) > 0;
  const hasDetail = countMatches(plain, DETAIL_MARKERS) > 0 || /\d/.test(plain);
  const sentenceCount = splitSentences(plain).length;
  const uniformRisk = sentenceUniformityRisk(plain);
  const reasons: string[] = [];

  let score = 12;
  if (paragraph.trim().startsWith("#")) score -= 6;
  if (templateHits > 0) {
    score += templateHits * 18;
    reasons.push("有固定连接词或模板结构");
  }
  if (abstractHits > 0) {
    score += abstractHits * 10;
    reasons.push("抽象词偏多");
  }
  if (summaryHits > 0) {
    score += summaryHits * 16;
    reasons.push("段落像在做总结");
  }
  if (!hasHuman && plain.length > 45) {
    score += 16;
    reasons.push("缺少人称或真实对象");
  }
  if (!hasDetail && plain.length > 55) {
    score += 18;
    reasons.push("缺少时间、人物、数字或现场细节");
  }
  if (sentenceCount >= 3 && uniformRisk > 58) {
    score += Math.round(uniformRisk * 0.18);
    reasons.push("句子节奏偏均匀");
  }
  if (/^#+\s*\d|^##\s*(现象|问题|方法|结论)/.test(paragraph)) {
    score += 14;
    reasons.push("小标题过于工整");
  }

  const finalScore = clamp(score);
  const level: "低风险" | "中风险" | "高风险" = finalScore >= 68 ? "高风险" : finalScore >= 42 ? "中风险" : "低风险";
  const suggestion =
    level === "高风险"
      ? "建议补一个具体场景、真实对象或反例，再删掉一两个空泛词。"
      : level === "中风险"
        ? "建议打散句式，加入一句作者自己的判断或犹豫。"
        : "可以保留，必要时只微调用词。";

  return {
    index,
    text: paragraph,
    score: finalScore,
    level,
    reasons: reasons.length > 0 ? reasons : ["风险较低，暂未发现明显模板腔"],
    suggestion
  };
}

function firstMeaningfulSentence(content: string, fallback: string) {
  return splitSentences(content)[0] ?? fallback;
}

export function generateDraft(payload: {
  topic?: string;
  style?: string;
  platform?: string;
  length?: number;
  brief?: string;
  skillId?: string;
  skill?: Skill;
}): DraftResult {
  const brief = cleanInput(payload.brief, payload.topic ?? "AI 写作如何真正帮助内容创作者");
  const topic = cleanInput(payload.topic, brief.split(/[。！？!?，,\n]/)[0] ?? "AI 写作如何真正帮助内容创作者");
  const style = cleanInput(payload.style, "有判断、有细节、不过度包装");
  const platform = cleanInput(payload.platform, "公众号");
  const length = payload.length ?? 1200;
  const skill = resolveSkill(payload.skill, payload.skillId, "write");
  const title = `${topic}：真正重要的不是工具，而是判断`;
  const briefSentence = ensureSentenceEnd(brief);
  const sections = [
    `这篇稿子先按你的提示展开：${briefSentence}我最近反复遇到一个现象：很多人开始用 AI 写稿以后，产量确实上来了，但文章反而变得更像一份正确的说明书。它没有明显错误，可你读完也记不住作者到底相信什么。`,
    `如果只把 AI 当成自动生成器，最后得到的通常是一篇平整、顺滑、没有现场感的稿子。真正有用的方式，是先让人把判断、对象和场景说清楚，再让 AI 参与扩写、检查和改写。`,
    `拿「${topic}」来说，最关键的不是把概念讲满，而是回答一个更小的问题：这件事对谁有用，在哪个具体场景里有用，又会让人少走哪一步弯路。这个问题一清楚，文章就不会飘。`,
    `我会把写作流程拆成三步。第一步只写判断，不急着写漂亮。第二步补场景，比如客户、会议、一次失败的修改。第三步再让模型整理结构和语言。顺序一错，文章就容易变成模板。`,
    `所以，${platform} 上真正能留下来的内容，不是看起来最完整的内容，而是有取舍、有细节、能让读者感到「这人真的处理过这个问题」的内容。AI 可以参与，但它不能替你经历和判断。`
  ];

  const content = [
    `# ${title}`,
    "",
    `写作风格：${style}`,
    `使用 Skill：${skill.name}`,
    "",
    ...sections.flatMap((section, index) => [`## ${index + 1}. ${["现象", "问题", "场景", "方法", "结论"][index]}`, section, ""])
  ].join("\n");

  return {
    title,
    content,
    wordCount: Math.min(wordCount(content), length),
    usedSkill: skill.name
  };
}

export function humanizeArticle(payload: { content?: string; skillId?: string; skill?: Skill }): HumanizeResult {
  const skill = resolveSkill(payload.skill, payload.skillId, "humanize");
  const original = cleanInput(payload.content, generateDraft({}).content);
  const paragraphs = original
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map(softenParagraphWithoutMetadata);

  const reshaped = paragraphs.map((paragraph, index) => {
    if (paragraph.startsWith("#")) return paragraph;
    if (index === 1) {
      return `${paragraph}\n\n这里有个细节很容易被忽略：读者不是在判断你有没有用 AI，而是在判断这段话背后有没有一个真的人在做取舍。`;
    }
    if (paragraph.includes("首先") || paragraph.includes("其次") || paragraph.includes("最后")) {
      return paragraph.replace(/首先|其次|最后/g, "换个更贴近现场的说法");
    }
    return paragraph;
  });

  const content = [
    ...reshaped,
    "",
    "我会保留一点不那么工整的地方。因为很多真实表达不是一路顺下来的，它会有停顿，有补充，也会在关键处露出作者自己的判断。"
  ].join("\n\n");

  return {
    content,
    changes: ["替换高频空泛词", "增加具体判断句", "打散过度工整段落", "补入真实作者口吻"],
    usedSkill: skill.name
  };
}

export function analyzeArticle(payload: { content?: string; platform?: string; skillId?: string; skill?: Skill }): AnalysisResult {
  const content = cleanInput(payload.content, "");
  const platform = cleanInput(payload.platform, "公众号");
  const skill = resolveSkill(payload.skill, payload.skillId, "analyze");

  if (!content) {
    return {
      overall: 0,
      level: "低风险",
      summary: `${skill.name} 没有读取到可评估正文。请先粘贴原稿，或完成写稿/润色后再评估。`,
      items: [
        { id: "source", label: "正文读取", score: 0, detail: "当前请求内容为空。" },
        { id: "template", label: "模板感", score: 0, detail: "没有正文，无法计算。" },
        { id: "abstract", label: "抽象词密度", score: 0, detail: "没有正文，无法计算。" },
        { id: "uniform", label: "句长均匀度", score: 0, detail: "没有正文，无法计算。" },
        { id: "summary", label: "过度总结", score: 0, detail: "没有正文，无法计算。" },
        { id: "person", label: "人称缺失", score: 0, detail: "没有正文，无法计算。" },
        { id: "detail", label: "细节缺失", score: 0, detail: "没有正文，无法计算。" }
      ],
      paragraphs: []
    };
  }

  const chars = Math.max(wordCount(content), 1);
  const templateScore = clamp(countMatches(content, TEMPLATE_TERMS) * 18 + (content.match(/##/g)?.length ?? 0) * 4);
  const abstractScore = clamp(Math.round((countMatches(content, ABSTRACT_TERMS) / Math.max(chars / 260, 1)) * 22));
  const uniformScore = sentenceUniformityRisk(content);
  const summaryScore = clamp(countMatches(content, SUMMARY_TERMS) * 20);
  const personScore = clamp(80 - countMatches(content, HUMAN_MARKERS) * 18);
  const detailScore = clamp(82 - ((content.match(/\d|客户|会议|屏幕|朋友|那天|现场|案例/g)?.length ?? 0) * 9));
  const mismatchScore = platform.includes("小红书") && chars > 1100 ? 72 : platform.includes("公众号") && chars < 450 ? 58 : 28;
  const overall = clamp(
    Math.round(
      templateScore * 0.18 +
        abstractScore * 0.14 +
        uniformScore * 0.2 +
        summaryScore * 0.12 +
        personScore * 0.14 +
        detailScore * 0.14 +
        mismatchScore * 0.08
    )
  );
  const level = overall >= 68 ? "高风险" : overall >= 40 ? "中风险" : "低风险";
  const paragraphs = splitParagraphs(content).map((paragraph, index) => paragraphRisk(paragraph, index + 1));

  return {
    overall,
    level,
    summary: `${skill.name} 已读取 ${chars} 字，风险参考：${level}。这个分数不是检测结论，只代表文本在模板感、细节密度和平台适配上的可疑程度。`,
    items: [
      { id: "template", label: "模板感", score: templateScore, detail: "连接词和固定结构越多，模板感越强。" },
      { id: "abstract", label: "抽象词密度", score: abstractScore, detail: "空泛词越多，越像没有经历支撑的概括。" },
      { id: "uniform", label: "句长均匀度", score: uniformScore, detail: "句子长度过于接近，会显得机械。" },
      { id: "summary", label: "过度总结", score: summaryScore, detail: "频繁收束会让段落像模型总结。" },
      { id: "person", label: "人称缺失", score: personScore, detail: "缺少人称和现场对象，作者感会变弱。" },
      { id: "detail", label: "细节缺失", score: detailScore, detail: "缺少数字、场景、人物和具体动作。" },
      { id: "platform", label: "平台风格不匹配", score: mismatchScore, detail: `当前平台：${platform}。篇幅和节奏需要跟平台习惯贴合。` }
    ],
    paragraphs
  };
}

export function formatArticle(payload: { content?: string; format?: string; skillId?: string; skill?: Skill }): FormatResult {
  const content = cleanInput(payload.content, humanizeArticle({}).content);
  const format = cleanInput(payload.format, "小红书短段落版");
  const skill = resolveSkill(payload.skill, payload.skillId, "format");
  const plain = content.replace(/^#+\s*/gm, "").trim();
  const sentences = splitSentences(plain);

  if (format.includes("小红书")) {
    return {
      format,
      notes: ["短段落", "重点句独立", `使用 ${skill.name}`],
      content: sentences
        .slice(0, 12)
        .map((sentence, index) => (index % 3 === 0 ? `${sentence}。` : sentence))
        .join("\n\n")
        .concat("\n\n你最常遇到的是哪一种 AI 腔？")
    };
  }

  if (format.includes("公众号") || format.includes("微信")) {
    return {
      format,
      notes: ["公众号", "标题层级", "重点句突出", `使用 ${skill.name}`],
      content: [
        `# ${firstMeaningfulSentence(plain, "这篇内容的核心，是把判断说清楚。")}`,
        "",
        ...sentences.slice(0, 10).flatMap((sentence, index) => {
          if (index === 0) return [`> ${sentence}。`, ""];
          if (index === 3 || index === 7) return [`## ${index === 3 ? "为什么会这样" : "具体怎么做"}`, "", `${sentence}。`, ""];
          return [`${sentence}。`, ""];
        }),
        "---",
        "",
        "真正值得保留的，不是看起来最完整的表达，而是能让读者感到作者真的处理过这个问题。"
      ].join("\n")
    };
  }

  if (format.includes("头条")) {
    return {
      format,
      notes: ["头条号文章", "强标题", "信息密度", `使用 ${skill.name}`],
      content: [
        `# ${firstMeaningfulSentence(plain, "这件事真正值得关注的，不是表面变化。")}`,
        "",
        "很多人看到这个话题，第一反应是把它当成一个工具问题。但如果放到真实业务里看，它其实是内容生产方式、判断能力和组织效率的问题。",
        "",
        ...sentences.slice(0, 9).map((sentence, index) => `${index + 1}. ${sentence}。`),
        "",
        "这也是为什么，真正有价值的内容不是堆概念，而是把问题讲清楚，把场景讲具体，把结论讲得能被验证。"
      ].join("\n")
    };
  }

  if (format.includes("知乎")) {
    return {
      format,
      notes: ["先结论", "再拆原因", `使用 ${skill.name}`],
      content: [`先说结论：${firstMeaningfulSentence(plain, "AI 味来自判断缺失。")}。`, "", "原因主要有三点：", "", ...sentences.slice(1, 7).map((sentence, index) => `${index + 1}. ${sentence}。`)].join("\n")
    };
  }

  if (format.includes("LinkedIn")) {
    return {
      format,
      notes: ["短句", "职业语境", `使用 ${skill.name}`],
      content: [`${firstMeaningfulSentence(plain, "AI is changing content work, but judgment still matters.")}.`, "", ...sentences.slice(1, 8).map((sentence) => `- ${sentence}`), "", "The point: tools can speed up execution, but they cannot replace taste, context, and judgment."].join("\n")
    };
  }

  return {
    format,
    notes: ["Markdown", "保留标题层级", `使用 ${skill.name}`],
    content
  };
}

export function exportDocument(payload: ExportPayload) {
  const filenameBase = (payload.filename?.trim() || "content-workbench-export").replace(/[^\w\u4e00-\u9fa5-]+/g, "-");
  if (payload.format === "html") {
    const escaped = payload.content
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replace(/\n/g, "<br />");
    return {
      filename: `${filenameBase}.html`,
      mime: "text/html;charset=utf-8",
      content: `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${filenameBase}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.8;max-width:760px;margin:48px auto;color:#111827}</style></head><body>${escaped}</body></html>`
    };
  }

  if (payload.format === "txt") {
    return {
      filename: `${filenameBase}.txt`,
      mime: "text/plain;charset=utf-8",
      content: payload.content
    };
  }

  return {
    filename: `${filenameBase}.md`,
    mime: "text/markdown;charset=utf-8",
    content: payload.content
  };
}

export function extractCore(payload: {
  content?: string;
  platform?: string;
  videoType?: string;
  duration?: string;
  skillId?: string;
  skill?: Skill;
}): CoreExtract {
  const content = cleanInput(payload.content, humanizeArticle({}).content);
  const plainContent = content
    .replace(/^#+\s*/gm, "")
    .replace(/^写作风格：.*$/gm, "")
    .replace(/^使用 Skill：.*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const platform = cleanInput(payload.platform, "抖音");
  const videoType = cleanInput(payload.videoType, "真人口播");
  const duration = cleanInput(payload.duration, "60 秒");
  const first = firstMeaningfulSentence(plainContent, "AI 味不是因为用了 AI，而是因为文章没有人的判断、犹豫和细节");
  const tension = plainContent.includes("不是") ? "不是用了 AI 才假，而是没有人的判断才假" : "看起来完整的内容，可能反而最不像人";

  return {
    title: `${platform} ${videoType}素材包`,
    hook: `你有没有发现，有些文章一看就不是人写的？`,
    coreViewpoint: `${first.replace(/。$/, "")}。真正的问题通常不是工具，而是判断、场景和取舍缺席。`,
    keep: ["明确观点", "真实场景", "可感知的取舍", "能被口播说出口的句子"],
    cut: ["太完整的背景铺垫", "空泛概念解释", "机械三段式", "没有画面的总结句"],
    tensionPoints: [tension, "越顺滑的稿子，越可能没有作者本人", "去 AI 味不是加口语词，而是补判断"],
    goldenLines: ["AI 不是取代我们的人，它更像一个超级助手。", "真正像人的文字，有判断，也有停顿。", "文章高级不高级，不看词有多大，而看场景有多真。"],
    recommendedDuration: duration,
    bestFormat: videoType
  };
}

export function generateVideoScript(payload: {
  core: CoreExtract;
  platform?: string;
  videoType?: string;
  duration?: string;
  skillId?: string;
  skill?: Skill;
}): VideoScript {
  const core = payload.core;
  const duration = cleanInput(payload.duration, core.recommendedDuration);
  const title = core.goldenLines[1] ?? "你的文章为什么一眼 AI？";
  const opening = core.hook;
  const thirtySecond = `${opening}\n\n很多人以为问题出在语法，其实不是。真正让文章变假的，是它没有人的判断、犹豫和现场细节。\n\n所以别只让 AI 润色。先把你的观点、对象和场景说清楚，再让它帮你整理。`;
  const sixtySecond = `${opening}\n\n我最近看了很多 AI 改出来的稿子，最大的问题不是错，而是太顺了。每段都像总结，每句话都很完整，但你读不出作者到底经历过什么。\n\n${core.coreViewpoint}\n\n一个简单方法：改稿前先问三件事。第一，我到底反对什么？第二，这个观点来自哪个真实场景？第三，哪些话虽然漂亮但应该删掉？\n\n做到这一步，AI 就不是替你写，而是在帮你把判断表达清楚。`;
  const threeMinute = `${sixtySecond}\n\n再往下看，你会发现很多所谓 AI 味，其实是内容生产流程的问题。人还没想清楚，就急着让模型扩写，模型只能补出最平均、最安全、最像模板的表达。\n\n真正的流程应该反过来：先由人写下判断，再由 AI 帮你找空洞处、补例子、拆平台格式，最后再回到人手里做取舍。这样写出来的内容，才不会只是正确，而是可信。`;

  return {
    title,
    opening,
    thirtySecond,
    sixtySecond,
    threeMinute,
    selected: duration.includes("30") ? thirtySecond : duration.includes("3") ? threeMinute : sixtySecond,
    duration
  };
}

export function generateStoryboard(payload: { script: VideoScript; core: CoreExtract }): StoryboardRow[] {
  const lines = payload.script.selected.split(/\n+/).filter(Boolean);
  const visuals = [
    "电脑屏幕上是一篇工整但没有细节的文章",
    "鼠标划掉空泛词和机械连接词",
    "真人对镜头说出核心判断",
    "画面切到一张写满取舍问题的便签",
    "屏幕展示修改前后对比",
    "结尾停在封面标题和发布平台"
  ];

  return visuals.map((visual, index) => ({
    shot: index + 1,
    visual,
    subtitle: lines[index] ?? payload.core.goldenLines[index % payload.core.goldenLines.length],
    seconds: index === 0 ? 3 : index === visuals.length - 1 ? 5 : 8
  }));
}

export function generateStoryboardImages(payload: { storyboard: StoryboardRow[]; style?: string }): StoryboardImageAsset[] {
  const style = cleanInput(payload.style, "写实商业短视频，干净桌面，移动端竖屏构图");
  return payload.storyboard.map((row) => ({
    shot: row.shot,
    prompt: `${style}。镜头 ${row.shot}：${row.visual}。字幕氛围：${row.subtitle}。画面要清晰、有主体、适合短视频封面级截图。`,
    status: "pending",
    preview: `shot-${row.shot}`
  }));
}

export function generateSubtitles(payload: { script: VideoScript; speed?: "slow" | "normal" | "fast" }) {
  const max = payload.speed === "fast" ? 28 : payload.speed === "slow" ? 16 : 22;
  const chars = Array.from(payload.script.selected.replace(/\n+/g, " "));
  const lines: string[] = [];
  for (let index = 0; index < chars.length; index += max) {
    lines.push(chars.slice(index, index + max).join("").trim());
  }
  return lines.filter(Boolean);
}

export function generateVideoAssets(payload: { core: CoreExtract; platform?: string; videoType?: string }): VideoAssets {
  const platform = cleanInput(payload.platform, "抖音");
  return {
    coverTitles: ["你的文章为什么一眼 AI？", "AI 写作最假的地方，不是语法", "别再让 AI 只帮你润色了"],
    platformTitles: [
      `${platform}标题：为什么你的 AI 稿一看就很假？`,
      "小红书标题：AI 润色越改越假？问题可能在这里",
      "B站标题：为什么 AI 写出来总有一股模板味？"
    ],
    publishCopy: `很多人以为“去 AI 味”就是加口语化词。\n但真正的问题，是文章里没有人的判断、场景和取舍。\n\n${payload.core.coreViewpoint}`,
    tags: ["AI写作", "内容创作", "去AI味", "短视频脚本", "个人IP"],
    visualPrompts: [
      "近景，电脑屏幕显示一篇结构工整但空泛的文章，鼠标停在重复词上",
      "真人在桌前对镜头表达观点，旁边有手写便签和修改痕迹",
      "分屏对比，左侧是模板化文字，右侧是带场景和判断的改写"
    ]
  };
}

export function createVideoRenderProject(payload: VideoRenderPayload): VideoRenderProject {
  const shotCount = payload.storyboard.length;
  const subtitleCount = payload.subtitles.length;
  const progress = clamp(
    35 +
      (payload.core ? 12 : 0) +
      (payload.script ? 14 : 0) +
      Math.min(shotCount * 4, 20) +
      Math.min(subtitleCount, 12) +
      (payload.assets ? 7 : 0),
    0,
    100
  );

  return {
    id: `video-${Date.now()}`,
    name: `${payload.platform} · ${payload.videoType} · ${payload.duration}`,
    provider: payload.provider,
    platform: payload.platform,
    videoType: payload.videoType,
    duration: payload.duration,
    status: progress >= 80 ? "可进入生成" : "素材待确认",
    progress,
    createdAt: new Date().toISOString(),
    previewTitle: payload.assets.coverTitles[0] ?? payload.script.title,
    inputs: [
      "核心观点",
      "开头钩子",
      "口播脚本",
      `${shotCount} 个分镜镜头`,
      `${subtitleCount} 条字幕`,
      "封面标题与发布文案",
      "画面提示词"
    ],
    outputs: [
      { label: "后期成片任务预留", status: "pending" },
      { label: "配音任务", status: payload.provider === "TTS" ? "ready" : "pending" },
      { label: "自动剪辑任务", status: ["剪映", "CapCut"].includes(payload.provider) ? "ready" : "pending" },
      { label: "封面生成任务", status: "pending" }
    ],
    nextSteps: [
      `接入 ${payload.provider} API 后创建远程生成任务`,
      "确认画面风格、人物形象和字幕样式",
      "把后期任务状态回写到视频项目列表",
      "优先支持下载完整视频素材包，再接成片、工程文件"
    ]
  };
}
