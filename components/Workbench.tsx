"use client";

import {
  BarChart3,
  BookOpen,
  Boxes,
  Bold,
  Activity,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Code2,
  Copy,
  Download,
  Eye,
  FileText,
  Film,
  Github,
  Globe2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  ImagePlus,
  Italic,
  KeyRound,
  LayoutDashboard,
  Library,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Loader2,
  PenLine,
  Play,
  PlayCircle,
  Quote,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Strikethrough,
  Table2,
  Trash2,
  Underline,
  Undo2,
  Upload,
  UserRound,
  UsersRound,
  Wand2,
  X
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { apiModelCapabilities, apiModels, defaultApiModelId, findApiModel } from "@/lib/apiModels";
import { defaultInspirationRules, fallbackInspirationSignals } from "@/lib/inspirationRules";
import { builtinSkills, defaultSkills } from "@/lib/skills";
import type {
  ActiveSkills,
  AnalysisResult,
  ApiModelCapability,
  CoreExtract,
  DraftResult,
  FormatResult,
  HumanizeResult,
  InspirationRule,
  InspirationScanResult,
  InspirationSignal,
  Skill,
  SkillModule,
  StoryboardImageAsset,
  StoryboardRow,
  VideoAssets,
  VideoRenderProject,
  VideoRenderProvider,
  VideoScript
} from "@/lib/types";

type LoadingKey =
  | "write"
  | "humanize"
  | "analyze"
  | "format"
  | "core"
  | "script"
  | "storyboard"
  | "images"
  | "subtitle"
  | "assets"
  | "render"
  | "inspiration"
  | "trendradar"
  | "pipeline"
  | "export"
  | null;

type Accent = "blue" | "violet" | "green" | "orange" | "red";

type ModuleCardConfig = {
  id: WorkflowBlockId;
  index?: number;
  title: string;
  description: string;
  buttonLabel: string;
  module: SkillModule;
  accent: Accent;
  icon: React.ComponentType<{ size?: number }>;
  action: () => Promise<void>;
  loadingKey: Exclude<LoadingKey, null>;
  defaultSkillName: string;
  defaultSkillDesc: string;
};

type ModuleResult = {
  title: string;
  body: string;
  meta?: string;
};

type ResultViewer = {
  id: string;
  title: string;
  body: string;
  editable?: boolean;
} | null;

type PromptSkillDraft = {
  id?: string;
  target: WorkflowBlockId;
  module: SkillModule;
  name: string;
  description: string;
  prompt: string;
} | null;

type GithubSkillDraft = {
  module: SkillModule;
  target: WorkflowBlockId;
  repo: string;
  branch: string;
  path: string;
  name: string;
  description: string;
  status?: string;
} | null;

type SkillSource = "default" | "upload" | "github" | "prompt";

type SkillPicker = {
  target: WorkflowBlockId;
  module: SkillModule;
  source: SkillSource;
} | null;

type WorkflowBlockId =
  | "write"
  | "humanize"
  | "analyze"
  | "format"
  | "core"
  | "script"
  | "storyboard"
  | "subtitle"
  | "cover"
  | "video";
type ActiveApiModels = Record<WorkflowBlockId, string>;
type ActiveBlockSkills = Record<WorkflowBlockId, string>;
type AdminTargetModule = WorkflowBlockId | "all";

type ApiModelCredential = {
  apiKey: string;
  endpoint: string;
  modelId: string;
  secretId: string;
  organization: string;
};

type ModelTestResult = {
  ok: boolean;
  message: string;
  endpoint?: string;
  status?: number;
  modelId?: string;
  detail?: string;
} | null;

type SidebarKey =
  | "workbench"
  | "admin"
  | "content"
  | "drafts"
  | "videoProjects"
  | "templates"
  | "assets"
  | "inspiration"
  | "analytics"
  | "mySkill"
  | "teamSkill"
  | "skillMarket";

const navItems = [
  { id: "workbench", label: "工作台", icon: LayoutDashboard },
  { id: "admin", label: "管理后台", icon: ShieldCheck },
  { id: "content", label: "我的内容", icon: FileText },
  { id: "drafts", label: "我的草稿", icon: BookOpen },
  { id: "videoProjects", label: "视频项目", icon: Film },
  { id: "templates", label: "模板市场", icon: Boxes },
  { id: "assets", label: "素材库", icon: Library },
  { id: "inspiration", label: "灵感库", icon: Sparkles },
  { id: "analytics", label: "数据分析", icon: BarChart3 }
] as const;

const skillCenterItems = [
  { id: "mySkill", label: "我的Skill", icon: UserRound },
  { id: "teamSkill", label: "团队Skill", icon: UsersRound },
  { id: "skillMarket", label: "Skill市场", icon: Boxes }
] as const;

const videoPlatforms = ["抖音", "小红书", "视频号", "B站", "TikTok", "YouTube Shorts"];
const videoTypes = ["真人口播", "图文快闪", "知识科普", "情绪观点", "带货种草", "课程切片", "老板 IP", "品牌宣传"];
const durations = ["30 秒", "60 秒", "90 秒", "3 分钟"];
const renderProviders: VideoRenderProvider[] = [
  "Kling 可灵",
  "Google Veo",
  "Runway Gen",
  "MiniMax",
  "Midjourney",
  "Flux",
  "Stable Diffusion",
  "火山方舟",
  "火山引擎",
  "豆包 Doubao / Seed",
  "可灵",
  "Runway",
  "Pika",
  "剪映",
  "CapCut",
  "数字人 API",
  "TTS"
];
const formatTargets = ["微信公众号版", "小红书版", "头条号文章"];
const skillModules: SkillModule[] = ["write", "humanize", "analyze", "format", "video"];
const workflowBlocks: Array<{ id: WorkflowBlockId; label: string; module: SkillModule }> = [
  { id: "write", label: "写稿模块", module: "write" },
  { id: "humanize", label: "反 AI 润色模块", module: "humanize" },
  { id: "analyze", label: "AI 痕迹评估模块", module: "analyze" },
  { id: "format", label: "排版模块", module: "format" },
  { id: "core", label: "核心提炼模块", module: "video" },
  { id: "script", label: "短视频脚本模块", module: "video" },
  { id: "storyboard", label: "分镜设计模块", module: "video" },
  { id: "subtitle", label: "字幕与口播稿模块", module: "video" },
  { id: "cover", label: "封面与标题模块", module: "video" },
  { id: "video", label: "成片素材包模块", module: "video" }
];
const defaultActiveApiModels: ActiveApiModels = {
  write: defaultApiModelId,
  humanize: defaultApiModelId,
  analyze: defaultApiModelId,
  format: defaultApiModelId,
  core: defaultApiModelId,
  script: defaultApiModelId,
  storyboard: defaultApiModelId,
  subtitle: defaultApiModelId,
  cover: defaultApiModelId,
  video: defaultApiModelId
};
const defaultActiveBlockSkills = Object.fromEntries(
  workflowBlocks.map((block) => [block.id, defaultSkills[block.module]])
) as ActiveBlockSkills;
const USER_SKILLS_STORAGE_KEY = "ai-content-workbench:user-skills";
const ACTIVE_SKILLS_STORAGE_KEY = "ai-content-workbench:active-skills";
const ACTIVE_BLOCK_SKILLS_STORAGE_KEY = "ai-content-workbench:active-block-skills";
const API_MODEL_STORAGE_KEY = "ai-content-workbench:selected-api-model";
const ACTIVE_API_MODELS_STORAGE_KEY = "ai-content-workbench:active-api-models";
const API_MODEL_CREDENTIALS_STORAGE_KEY = "ai-content-workbench:model-credentials";
const TRENDRADAR_ENDPOINT_STORAGE_KEY = "ai-content-workbench:trendradar-endpoint";
const defaultTrendRadarEndpoint = "http://localhost:3333/mcp";

function defaultCredentialFor(model: ReturnType<typeof findApiModel>): ApiModelCredential {
  return {
    apiKey: "",
    endpoint: model.endpoint,
    modelId: model.modelId,
    secretId: "",
    organization: ""
  };
}

function normalizeApiModelId(id: string | undefined) {
  if (!id || id === "openai-gpt-4o") return defaultApiModelId;
  return apiModels.some((model) => model.id === id) ? id : defaultApiModelId;
}

function modelLogoText(provider: string) {
  if (provider.includes("OpenAI") || provider.includes("ChatGPT")) return "OA";
  if (provider.includes("DeepSeek")) return "DS";
  if (provider.includes("Qwen") || provider.includes("通义")) return "Q";
  if (provider.includes("Claude")) return "C";
  if (provider.includes("Gemini") || provider.includes("Google")) return "G";
  if (provider.includes("可灵") || provider.includes("Kling")) return "K";
  if (provider.includes("豆包") || provider.includes("Doubao")) return "豆";
  if (provider.includes("文心") || provider.includes("ERNIE")) return "文";
  if (provider.includes("智谱") || provider.includes("GLM")) return "GLM";
  if (provider.includes("Kimi")) return "K";
  if (provider.includes("混元") || provider.includes("Hunyuan")) return "混";
  if (provider.includes("火山")) return "火";
  if (provider.includes("Runway")) return "R";
  if (provider.includes("MiniMax")) return "MM";
  if (provider.includes("Midjourney")) return "MJ";
  if (provider.includes("Flux")) return "F";
  if (provider.includes("Stable")) return "SD";
  if (provider.includes("Llama")) return "L";
  if (provider.includes("Grok")) return "X";
  if (provider.includes("Step") || provider.includes("阶跃")) return "S";
  return provider.slice(0, 2).toUpperCase();
}

function simpleIconSlug(provider: string) {
  if (provider.includes("OpenAI") || provider.includes("ChatGPT")) return "openai";
  if (provider.includes("DeepSeek")) return "deepseek";
  if (provider.includes("Qwen") || provider.includes("通义")) return "alibabacloud";
  if (provider.includes("Claude")) return "anthropic";
  if (provider.includes("Gemini")) return "googlegemini";
  if (provider.includes("Google")) return "google";
  if (provider.includes("文心") || provider.includes("ERNIE")) return "baidu";
  if (provider.includes("豆包") || provider.includes("Doubao")) return "bytedance";
  if (provider.includes("混元") || provider.includes("Hunyuan")) return "tencentqq";
  if (provider.includes("火山")) return "bytedance";
  if (provider.includes("Runway")) return "runway";
  if (provider.includes("Midjourney")) return "midjourney";
  if (provider.includes("Stable")) return "stabilityai";
  if (provider.includes("Llama")) return "meta";
  if (provider.includes("Grok")) return "x";
  if (provider.includes("小米") || provider.includes("MiMo")) return "xiaomi";
  return "";
}

function modelLogoFallbackUrl(provider: string) {
  const domain = (() => {
    if (provider.includes("OpenAI") || provider.includes("ChatGPT")) return "openai.com";
    if (provider.includes("DeepSeek")) return "deepseek.com";
    if (provider.includes("Qwen") || provider.includes("通义")) return "qwen.ai";
    if (provider.includes("Claude")) return "anthropic.com";
    if (provider.includes("Gemini")) return "gemini.google.com";
    if (provider.includes("Google")) return "google.com";
    if (provider.includes("可灵") || provider.includes("Kling")) return "klingai.com";
    if (provider.includes("豆包") || provider.includes("Doubao")) return "doubao.com";
    if (provider.includes("文心") || provider.includes("ERNIE")) return "yiyan.baidu.com";
    if (provider.includes("智谱") || provider.includes("GLM")) return "bigmodel.cn";
    if (provider.includes("Kimi")) return "moonshot.cn";
    if (provider.includes("混元") || provider.includes("Hunyuan")) return "hunyuan.tencent.com";
    if (provider.includes("火山")) return "volcengine.com";
    if (provider.includes("Runway")) return "runwayml.com";
    if (provider.includes("MiniMax")) return "minimax.io";
    if (provider.includes("Midjourney")) return "midjourney.com";
    if (provider.includes("Flux")) return "bfl.ai";
    if (provider.includes("Stable")) return "stability.ai";
    if (provider.includes("Llama")) return "llama.com";
    if (provider.includes("Grok")) return "x.ai";
    if (provider.includes("Step") || provider.includes("阶跃")) return "stepfun.com";
    if (provider.includes("小米") || provider.includes("MiMo")) return "mi.com";
    return "";
  })();
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : "";
}

function modelLogoUrl(provider: string) {
  return modelLogoFallbackUrl(provider);
}

function modelLogoClass(provider: string) {
  if (provider.includes("OpenAI") || provider.includes("ChatGPT")) return "openai";
  if (provider.includes("DeepSeek")) return "deepseek";
  if (provider.includes("Qwen") || provider.includes("通义")) return "qwen";
  if (provider.includes("Claude")) return "claude";
  if (provider.includes("Gemini") || provider.includes("Google")) return "gemini";
  if (provider.includes("可灵") || provider.includes("Kling")) return "kling";
  if (provider.includes("豆包") || provider.includes("Doubao")) return "doubao";
  if (provider.includes("文心") || provider.includes("ERNIE")) return "ernie";
  if (provider.includes("智谱") || provider.includes("GLM")) return "glm";
  if (provider.includes("Kimi")) return "kimi";
  if (provider.includes("混元") || provider.includes("Hunyuan")) return "hunyuan";
  if (provider.includes("火山")) return "volcano";
  if (provider.includes("Runway")) return "runway";
  if (provider.includes("MiniMax")) return "minimax";
  if (provider.includes("Midjourney")) return "midjourney";
  if (provider.includes("Flux")) return "flux";
  if (provider.includes("Stable")) return "stable";
  if (provider.includes("Llama")) return "llama";
  if (provider.includes("Grok")) return "grok";
  if (provider.includes("Step") || provider.includes("阶跃")) return "step";
  return "generic";
}

function isSkillModule(value: unknown): value is SkillModule {
  return typeof value === "string" && skillModules.includes(value as SkillModule);
}

function skillSource(skill?: Skill): SkillSource {
  if (!skill?.isUser) return "default";
  if (skill.id.startsWith("prompt-")) return "prompt";
  if (skill.id.startsWith("github-")) return "github";
  return "upload";
}

function sourceLabel(source: SkillSource) {
  if (source === "default") return "默认Skill";
  if (source === "upload") return "上传Skill";
  if (source === "github") return "GitHub导入";
  return "自定义Prompt";
}

function moduleLabel(module: SkillModule) {
  if (module === "write") return "写稿模块";
  if (module === "humanize") return "反 AI 润色模块";
  if (module === "analyze") return "AI 痕迹评估模块";
  if (module === "format") return "排版模块";
  return "短视频模块";
}

function workflowBlockLabel(id: AdminTargetModule) {
  if (id === "all") return "全部模块";
  return workflowBlocks.find((item) => item.id === id)?.label ?? "未知模块";
}

function workflowBlockModule(id: WorkflowBlockId): SkillModule {
  return workflowBlocks.find((item) => item.id === id)?.module ?? "video";
}

function defaultWorkflowBlockForModule(module: SkillModule): WorkflowBlockId {
  return workflowBlocks.find((item) => item.module === module)?.id ?? "video";
}

function isWorkflowBlockId(value: unknown): value is WorkflowBlockId {
  return typeof value === "string" && workflowBlocks.some((item) => item.id === value);
}

function parseGithubSkillSource(repoInput: string, branchInput: string, pathInput: string) {
  const fallbackBranch = branchInput.trim() || "main";
  const fallbackPath = pathInput.trim();
  const trimmed = repoInput.trim();
  if (!trimmed) return null;

  const parseSegments = (segments: string[]) => {
    const owner = segments[0];
    const repoName = segments[1]?.replace(/\.git$/i, "");
    if (!owner || !repoName) return null;
    return { owner, repoName };
  };

  let owner = "";
  let repoName = "";
  let branch = fallbackBranch;
  let path = fallbackPath;

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);
    if (url.hostname === "raw.githubusercontent.com") {
      const parsed = parseSegments(segments);
      if (!parsed || !segments[2]) return null;
      owner = parsed.owner;
      repoName = parsed.repoName;
      branch = segments[2];
      path = segments.slice(3).join("/") || fallbackPath;
    } else if (url.hostname.endsWith("github.com")) {
      const parsed = parseSegments(segments);
      if (!parsed) return null;
      owner = parsed.owner;
      repoName = parsed.repoName;
      if ((segments[2] === "blob" || segments[2] === "tree") && segments[3]) {
        branch = segments[3];
        path = segments.slice(4).join("/") || fallbackPath;
      }
    } else {
      return null;
    }
  } catch {
    const segments = trimmed
      .replace(/^git@github\.com:/, "")
      .replace(/^github\.com\//, "")
      .replace(/\.git$/i, "")
      .split("/")
      .filter(Boolean);
    const parsed = parseSegments(segments);
    if (!parsed) return null;
    owner = parsed.owner;
    repoName = parsed.repoName;
  }

  if (!owner || !repoName || !path) return null;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const encodedBranch = encodeURIComponent(branch);
  return {
    repo: `${owner}/${repoName}`,
    branch,
    path,
    rawUrl: `https://raw.githubusercontent.com/${owner}/${repoName}/${encodedBranch}/${encodedPath}`,
    pageUrl: `https://github.com/${owner}/${repoName}/blob/${encodedBranch}/${encodedPath}`
  };
}

const sidebarViews: Record<Exclude<SidebarKey, "workbench" | "admin">, {
  title: string;
  subtitle: string;
  mindset: string;
  stores: string;
  chips: string[];
  cards: Array<{ title: string; state: string; body: string; metrics: string[] }>;
  actions: string[];
  fields: string[];
}> = {
  content: {
    title: "我的内容",
    subtitle: "已完成、已发布、已归档的内容资产",
    mindset: "我做完了什么",
    stores: "文章、短视频脚本、图文笔记、直播回放、课程内容、品牌文案、营销邮件",
    chips: ["已发布", "待发布", "已归档", "表现最好", "可复用", "需要更新"],
    cards: [
      { title: "AI 写作最假的地方，不是语法", state: "表现最好", body: "公众号长文 · 可拆成短视频脚本和小红书笔记", metrics: ["阅读 48,200", "收藏率 12.4%", "转化 3.8%", "2 小时前更新"] },
      { title: "老板 IP 口播：别把 AI 当代笔", state: "已发布", body: "60 秒视频 · 已沉淀字幕、封面、发布文案", metrics: ["完播率 41%", "评论 328", "复用 5 次", "昨天更新"] },
      { title: "品牌月报：内容增长复盘", state: "可复用", body: "品牌文案 · 适合复制为下月复盘模板", metrics: ["转化 21 单", "团队引用 7 次", "需更新数据", "5 天前更新"] }
    ],
    actions: ["生成复用版本", "按表现筛选", "同步到素材库", "更新旧内容"],
    fields: ["状态", "内容类型", "渠道", "阅读量", "转化", "完播率", "收藏率", "最近更新时间"]
  },
  drafts: {
    title: "我的草稿",
    subtitle: "半成品内容，不和已完成内容混在一起",
    mindset: "我正在做什么",
    stores: "想法、大纲、初稿、待润色稿、待审阅稿、待发布稿",
    chips: ["一个想法", "大纲", "初稿", "待润色", "待审阅", "待发布"],
    cards: [
      { title: "AI 教程账号如何做选题雷达", state: "大纲", body: "已有 6 个小标题，需要补案例和平台版本", metrics: ["重复草稿 1 篇", "缺案例", "建议小红书版", "今天更新"] },
      { title: "把播客访谈转成图文笔记", state: "待润色", body: "口语稿已导入，等待降噪、提炼观点、拆短段落", metrics: ["音频 42 分钟", "已转写", "待审阅", "昨天更新"] },
      { title: "新品发布文案：增长焦虑场景", state: "待发布", body: "已完成公众号版，缺短视频标题和封面文案", metrics: ["完成度 82%", "缺封面", "可发布", "3 天前更新"] }
    ],
    actions: ["补全结构", "发现重复草稿", "自动补事实案例", "改写到目标平台"],
    fields: ["创作阶段", "目标平台", "素材缺口", "重复风险", "负责人", "下一步动作"]
  },
  videoProjects: {
    title: "视频项目",
    subtitle: "从选题到复盘的一条完整生产线",
    mindset: "我在生产哪个视频",
    stores: "选题、脚本、分镜、素材、旁白、字幕、封面、发布文案、剪辑版本、复盘数据",
    chips: ["选题", "脚本", "素材", "剪辑", "发布", "复盘"],
    cards: [
      { title: "AI 写作为什么一眼假", state: "剪辑", body: "脚本、分镜、字幕已完成，等待 B-roll 和封面确认", metrics: ["6 个镜头", "字幕 23 条", "素材缺 2 个", "剪辑版 v2"] },
      { title: "普通人怎么用 AI 做知识视频", state: "脚本", body: "选题来自灵感库，已关联产品截图和历史案例", metrics: ["60 秒", "口播稿完成", "封面待生成", "今天更新"] },
      { title: "老板 IP：增长不是多发内容", state: "复盘", body: "已发布，等待完播率和评论关键词回流到数据分析", metrics: ["完播率 38%", "收藏 1,240", "复盘待写", "昨天发布"] }
    ],
    actions: ["生成脚本", "生成分镜", "补齐素材", "生成复盘"],
    fields: ["选题", "脚本", "素材", "剪辑版本", "发布状态", "复盘数据"]
  },
  templates: {
    title: "模板市场",
    subtitle: "可复用的创作方法，不只是漂亮版式",
    mindset: "我可以怎么更快做",
    stores: "脚本模板、发布文案模板、播客提纲、品牌月报、直播复盘、招商方案、AI 工作流",
    chips: ["短视频脚本", "新品发布", "小红书种草", "播客访谈", "品牌月报", "AI 工作流"],
    cards: [
      { title: "爆款短视频脚本模板", state: "可套用", body: "先问受众、冲突、证据、行动，再生成脚本草稿", metrics: ["使用 18k", "评分 4.8", "适合抖音", "可进视频项目"] },
      { title: "小红书种草模板", state: "可套用", body: "体验前后差异、真实细节、风险提醒、互动结尾", metrics: ["使用 9.2k", "收藏 3.1k", "适合图文", "可进草稿"] },
      { title: "直播复盘模板", state: "团队常用", body: "拆解流量、停留、转化、话术和下一轮动作", metrics: ["复用 72 次", "含数据字段", "可进数据分析", "商业可用"] }
    ],
    actions: ["套用到草稿", "套用到视频项目", "AI 追问关键问题", "生成可编辑版本"],
    fields: ["模板类型", "适用平台", "关键问题", "输出格式", "使用次数", "评分"]
  },
  assets: {
    title: "素材库",
    subtitle: "可以直接拿来生产内容的资产",
    mindset: "我手上有什么",
    stores: "图片、视频、音频、产品图、Logo、色卡、案例截图、客户评价、参数、报告、金句、CTA",
    chips: ["图片", "视频", "音频", "文案", "数据", "案例", "品牌资产"],
    cards: [
      { title: "客户评价截图：增长焦虑", state: "商业可用", body: "适合案例拆解、短视频开头、品牌信任段落", metrics: ["使用 12 次", "已授权", "关联 3 项目", "团队可用"] },
      { title: "老板采访录音：AI 内容判断", state: "仅内部参考", body: "可提炼观点，不能直接外发原音频", metrics: ["42 分钟", "需确认版权", "AI 摘要完成", "关联老板 IP"] },
      { title: "品牌色卡与 Logo 规范", state: "团队可用", body: "封面、PPT、视频包装统一视觉资产", metrics: ["品牌资产", "版本 v3", "使用 48 次", "已授权"] }
    ],
    actions: ["语义搜索素材", "生成 AI 摘要", "检查版权状态", "关联到项目"],
    fields: ["类型", "来源", "可用范围", "关联项目", "使用次数", "版权状态", "AI 摘要"]
  },
  inspiration: {
    title: "灵感库",
    subtitle: "选题雷达，只收和账号业务有关的信号",
    mindset: "我可以做什么",
    stores: "Google 热搜、新闻、娱乐影视、体育赛事、财经商业、科技产品、消费生活、政策变化、品牌案例、指定网站、团队表现数据",
    chips: ["全球热搜", "科技产品", "娱乐影视", "体育赛事", "财经商业", "消费生活", "国际社会", "品牌案例"],
    cards: [
      { title: "某 AI 工具上线实时视频理解", state: "高相关", body: "适合做普通人如何用它做知识视频的选题", metrics: ["短视频", "公众号分析", "风险：灰度开放", "关联素材 4 个"] },
      { title: "小红书 AI 教程爆款集中出现", state: "可跟进", body: "真实案例截图类内容收藏率明显更高", metrics: ["收藏率高", "竞品 6 条", "建议案例拆解", "今天发现"] },
      { title: "教育行业政策更新", state: "需谨慎", body: "适合做边界解释，不适合直接做夸张标题", metrics: ["政策变化", "风险提醒", "需核实", "可做长文"] }
    ],
    actions: ["生成灵感卡片", "订阅信号", "关联素材", "转成草稿"],
    fields: ["关注范围", "为什么相关", "可创作角度", "建议形式", "相关素材", "风险提醒"]
  },
  analytics: {
    title: "数据分析",
    subtitle: "告诉你什么有效、为什么有效、下一步做什么",
    mindset: "做得怎么样",
    stores: "内容表现、渠道表现、选题表现、模板表现、素材复用、团队效率、转化数据",
    chips: ["内容表现", "渠道表现", "选题表现", "模板表现", "素材复用", "团队效率", "转化数据"],
    cards: [
      { title: "真实案例截图提升收藏率", state: "建议行动", body: "最近 30 天带案例截图内容收藏率比纯观点内容高 42%", metrics: ["收藏 +42%", "建议 3 条案例拆解", "素材库回流", "高信心"] },
      { title: "小红书短段落模板转化更稳", state: "模板洞察", body: "同主题下，小红书短段落版互动率高于公众号长文拆条", metrics: ["互动 +18%", "模板复用 9 次", "建议继续测试", "中信心"] },
      { title: "视频号老板 IP 完播下降", state: "需更新", body: "前 3 秒钩子重复度过高，建议从灵感库补新冲突点", metrics: ["完播 -11%", "重复钩子", "建议换开头", "本周"] }
    ],
    actions: ["生成下周建议", "回流灵感库", "复盘模板表现", "分析素材复用"],
    fields: ["内容表现", "渠道表现", "选题表现", "模板表现", "素材复用", "团队效率", "转化数据"]
  },
  mySkill: {
    title: "我的 Skill",
    subtitle: "个人创建的固定 AI 工作流",
    mindset: "我的固定动作",
    stores: "新闻转选题、播客转笔记、个人风格改写、脚本废话检查、客户评价整理",
    chips: ["个人工作流", "默认规则", "最近使用", "收藏", "可复制", "可组合"],
    cards: [
      { title: "把新闻变成 5 个短视频选题", state: "常用", body: "输入新闻链接，输出钩子、角度、风险提醒", metrics: ["运行 86 次", "成功率 91%", "默认抖音", "今天用过"] },
      { title: "按我的风格改写文章", state: "默认", body: "保留观点，降低模板腔，加入判断和细节", metrics: ["运行 132 次", "收藏", "可组合", "个人可用"] },
      { title: "客户评价整理成案例库", state: "可复用", body: "从素材库截图和录音里抽案例、场景和引用句", metrics: ["运行 24 次", "关联素材库", "商业可用", "本周更新"] }
    ],
    actions: ["新建 Skill", "组合 Skill", "设为默认", "复制到团队"],
    fields: ["输入", "固定动作", "输出", "默认模块", "使用次数", "权限"]
  },
  teamSkill: {
    title: "团队 Skill",
    subtitle: "团队共享的统一工作流",
    mindset: "团队统一怎么做",
    stores: "品牌语气检查、法务风险检查、卖点提炼、活动复盘、客户案例生成",
    chips: ["品牌团队", "法务", "产品", "运营", "销售", "管理层"],
    cards: [
      { title: "品牌语气检查", state: "团队默认", body: "检查是否符合品牌语气、禁用词和表达边界", metrics: ["团队 18 人", "运行 340 次", "默认启用", "负责人品牌组"] },
      { title: "法务风险检查", state: "审批中", body: "标注绝对化表述、承诺性表达、合规风险", metrics: ["高风险提醒", "需审批", "版本 v2", "负责人法务"] },
      { title: "产品卖点提炼", state: "可用", body: "从参数、客户评价、竞品差异中提炼卖点", metrics: ["关联素材库", "运行 76 次", "团队可用", "本月更新"] }
    ],
    actions: ["申请使用", "提交改版", "查看权限", "复制为个人 Skill"],
    fields: ["适用团队", "负责人", "权限", "审批状态", "版本", "运行次数"]
  },
  skillMarket: {
    title: "Skill 市场",
    subtitle: "外部提供的固定 AI 工作流",
    mindset: "外部方法怎么用",
    stores: "电商带货脚本、课程大纲、B 站标题优化、小红书封面文案、投放素材拆解",
    chips: ["电商", "教育", "B站", "小红书", "投放", "品牌"],
    cards: [
      { title: "电商带货脚本生成器", state: "热门", body: "输入产品卖点和用户痛点，输出 30/60/90 秒脚本", metrics: ["安装 12k", "评分 4.9", "商业可用", "可试用"] },
      { title: "B 站视频标题优化器", state: "新上架", body: "根据选题、受众和竞品标题生成多版标题", metrics: ["安装 2.4k", "评分 4.7", "适合知识区", "可复制"] },
      { title: "投放素材拆解器", state: "专业版", body: "拆解广告素材结构、卖点、钩子和风险", metrics: ["安装 8.1k", "需订阅", "电商团队", "高复用"] }
    ],
    actions: ["安装 Skill", "试用一次", "收藏", "查看评价"],
    fields: ["提供方", "适用场景", "输入", "输出", "评分", "授权范围"]
  }
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function preserveCorruptStorageValue(key: string, raw: string) {
  try {
    localStorage.setItem(`${key}:corrupt:${Date.now()}`, raw);
  } catch {
    // If the browser refuses the backup, still avoid deleting unrelated keys.
  }
}

function readJsonStorage(key: string): unknown {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    preserveCorruptStorageValue(key, raw);
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function ModuleButton({
  children,
  loading,
  onClick,
  accent
}: {
  children: React.ReactNode;
  loading: boolean;
  onClick: () => void;
  accent: Accent;
}) {
  return (
    <button className={`module-action ${accent}`} onClick={onClick} disabled={loading}>
      {loading ? <Loader2 className="spin" size={16} /> : null}
      {children}
    </button>
  );
}

function SkillOption({
  title,
  subtitle,
  icon,
  accent,
  children
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: Accent;
  children?: React.ReactNode;
}) {
  return (
    <div className={`skill-option ${accent}`}>
      <div className="skill-option-icon">{icon}</div>
      <strong>{title}</strong>
      <span>{subtitle}</span>
      {children}
    </div>
  );
}

function ModuleCard({
  config,
  loading,
  selectedSkill,
  selectedModel,
  selectedModelConfigured,
  moduleSkills,
  result,
  active,
  onFocusResult,
  onViewResult,
  onSecondaryResult,
  secondaryResultLabel,
  secondaryResultLoading,
  onPickSkillSource,
  onPromptSkill,
  onPickModel
}: {
  config: ModuleCardConfig;
  loading: LoadingKey;
  selectedSkill?: Skill;
  selectedModel: ReturnType<typeof findApiModel>;
  selectedModelConfigured: boolean;
  moduleSkills: Skill[];
  result?: ModuleResult;
  active: boolean;
  onFocusResult: () => void;
  onViewResult: () => void;
  onSecondaryResult?: () => void;
  secondaryResultLabel?: string;
  secondaryResultLoading?: boolean;
  onPickSkillSource: (target: WorkflowBlockId, module: SkillModule, source: SkillSource) => void;
  onPromptSkill: (target: WorkflowBlockId) => void;
  onPickModel: (block: WorkflowBlockId) => void;
}) {
  const Icon = config.icon;
  const sourceSkills = {
    default: moduleSkills.filter((skill) => skillSource(skill) === "default"),
    upload: moduleSkills.filter((skill) => skillSource(skill) === "upload"),
    github: moduleSkills.filter((skill) => skillSource(skill) === "github"),
    prompt: moduleSkills.filter((skill) => skillSource(skill) === "prompt")
  };
  const selectedSource = skillSource(selectedSkill);
  return (
    <article className={`module-card ${config.accent}`}>
      <header className="module-card-head">
        <div className={`module-icon ${config.accent}`}>
          {config.index ? <strong>{config.index}</strong> : <Icon size={24} />}
        </div>
        <div>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>
        <ModuleButton accent={config.accent} loading={loading === config.loadingKey} onClick={config.action}>
          {config.buttonLabel}
        </ModuleButton>
      </header>

      <section className="skill-config">
        <div className="skill-config-title">
          <h3>Skill配置</h3>
          <button className={`card-model-button ${selectedModelConfigured ? "configured" : ""}`} type="button" onClick={() => onPickModel(config.id)}>
            <span>模型</span>
            <strong>{selectedModel.name}</strong>
            <small>{selectedModelConfigured ? "自填API" : "默认API"}</small>
          </button>
        </div>
        <div className="skill-options">
          <button
            className={`skill-option plain ${config.accent} ${selectedSource === "default" ? "selected" : ""}`}
            type="button"
            onClick={() => onPickSkillSource(config.id, config.module, "default")}
          >
            {selectedSource === "default" ? <b>当前</b> : null}
            <div className="skill-option-icon">
              <Sparkles size={16} />
            </div>
            <strong>默认Skill</strong>
            <span>{selectedSource === "default" ? selectedSkill?.name : `${sourceSkills.default.length} 个可选`}</span>
            <small>点击选择默认规则</small>
          </button>

          <button
            className={`skill-option plain ${config.accent} ${selectedSource === "upload" ? "selected" : ""}`}
            type="button"
            onClick={() => onPickSkillSource(config.id, config.module, "upload")}
          >
            {selectedSource === "upload" ? <b>当前</b> : null}
            <div className="skill-option-icon">
              <Upload size={18} />
            </div>
            <strong>上传Skill</strong>
            <span>{selectedSource === "upload" ? selectedSkill?.name : `${sourceSkills.upload.length} 个已上传`}</span>
            <small>点击选择或上传</small>
          </button>

          <button className={`skill-option plain ${config.accent} ${selectedSource === "github" ? "selected" : ""}`} type="button" onClick={() => onPickSkillSource(config.id, config.module, "github")}>
            {selectedSource === "github" ? <b>当前</b> : null}
            <div className="skill-option-icon">
              <Github size={20} />
            </div>
            <strong>从 GitHub 导入</strong>
            <span>{selectedSource === "github" ? selectedSkill?.name : `${sourceSkills.github.length} 个已导入`}</span>
            <small>点击选择或导入</small>
          </button>

          <button className={`skill-option plain ${config.accent} ${selectedSource === "prompt" ? "selected" : ""}`} type="button" onClick={() => onPickSkillSource(config.id, config.module, "prompt")}>
            {selectedSource === "prompt" ? <b>当前</b> : null}
            <div className="skill-option-icon">
              <PenLine size={18} />
            </div>
            <strong>自定义Prompt</strong>
            <span>{selectedSource === "prompt" ? selectedSkill?.name : "编写 Prompt"}</span>
            <small>{sourceSkills.prompt.length} 个可选，点击选择</small>
          </button>
        </div>
      </section>

      <div className={`module-result ${active ? "active" : ""}`} onClick={onFocusResult}>
        {result ? (
          <>
            <span>{result.title}</span>
            <strong>{result.body}</strong>
            {result.meta ? <small>{result.meta}</small> : null}
          </>
        ) : (
          <>
            <span>运行结果</span>
            <strong>点击“{config.buttonLabel}”后在这里显示结果</strong>
          </>
        )}
        {result ? (
          <div className="module-result-actions">
            <button type="button" onClick={onViewResult}>
              查看内容
            </button>
            {onSecondaryResult && secondaryResultLabel ? (
              <button type="button" onClick={onSecondaryResult} disabled={secondaryResultLoading}>
                {secondaryResultLoading ? <Loader2 className="spin" size={13} /> : null}
                {secondaryResultLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function riskTone(level: AnalysisResult["level"]) {
  if (level === "高风险") return "high";
  if (level === "中风险") return "medium";
  return "low";
}

function splitEditableParagraphs(content: string) {
  const paragraphs = content.split(/\n{2,}/);
  return paragraphs.length > 0 ? paragraphs : [content];
}

function updateEditableParagraph(content: string, index: number, nextParagraph: string) {
  const paragraphs = splitEditableParagraphs(content);
  paragraphs[index] = nextParagraph;
  return paragraphs.join("\n\n");
}

function AnalysisEditor({
  analysis,
  value,
  onChange
}: {
  analysis: AnalysisResult;
  value: string;
  onChange: (value: string) => void;
}) {
  if (analysis.paragraphs.length === 0) return null;
  const paragraphs = splitEditableParagraphs(value);

  return (
    <section className="analysis-editor">
      <header>
        <strong>原文风险标注与修改</strong>
        <span>直接在标色段落里修改：红色优先改，黄色微调，绿色可保留。</span>
      </header>
      <div>
        {paragraphs.map((text, index) => {
          const paragraph = analysis.paragraphs[index] ?? {
            index: index + 1,
            text,
            score: 0,
            level: "低风险" as const,
            reasons: ["新增或拆分后的段落，建议重新评估"],
            suggestion: "保存后重新评估即可刷新标注。"
          };
          return (
          <article className={`risk-paragraph ${riskTone(paragraph.level)}`} key={`${paragraph.index}-${paragraph.text.slice(0, 12)}`}>
            <div>
              <b>段落 {index + 1}</b>
              <span>{paragraph.level} · {paragraph.score}%</span>
            </div>
            <textarea
              value={text}
              onChange={(event) => onChange(updateEditableParagraph(value, index, event.target.value))}
              rows={Math.max(4, Math.ceil(Array.from(text).length / 42))}
              aria-label={`段落 ${index + 1}`}
            />
            <small>{paragraph.reasons.join(" / ")}。{paragraph.suggestion}</small>
          </article>
          );
        })}
      </div>
    </section>
  );
}

function projectHotspotsFor(title: string, body: string, signals: InspirationSignal[]) {
  const text = `${title} ${body}`.toLowerCase();
  const matched = signals.filter((signal) => {
    const haystack = `${signal.title} ${signal.body} ${signal.ruleName} ${signal.angles.join(" ")}`.toLowerCase();
    return text
      .split(/\s+|，|。|：|:|、/)
      .filter((word) => word.length >= 2)
      .some((word) => haystack.includes(word));
  });
  return (matched.length > 0 ? matched : signals).slice(0, 3);
}

function chunkSignals(signals: InspirationSignal[], size: number) {
  const chunks: InspirationSignal[][] = [];
  for (let index = 0; index < signals.length; index += size) {
    chunks.push(signals.slice(index, index + size));
  }
  return chunks;
}

function signalUrl(signal: InspirationSignal) {
  return signal.url || `https://news.google.com/search?q=${encodeURIComponent(`${signal.title} ${signal.source}`)}&hl=zh-CN&gl=US&ceid=US:zh-Hans`;
}

type LibraryCardData = {
  title: string;
  state: string;
  body: string;
  metrics: string[];
  hotspots?: InspirationSignal[];
};

type LibraryOperation = {
  title: string;
  eyebrow: string;
  body: string;
  items: string[];
  primary: string;
};

function libraryChipCards(section: Exclude<SidebarKey, "workbench" | "admin">, chip: string, fallbackCards: LibraryCardData[]): LibraryCardData[] {
  const assets: Record<string, LibraryCardData[]> = {
    图片: [
      { title: "产品截图：工作流看板", state: "团队可用", body: "适合教程封面、公众号配图和功能说明", metrics: ["类型 图片", "来源 上传", "使用 18 次", "已授权"] },
      { title: "客户评价截图：增长焦虑", state: "商业可用", body: "适合案例拆解、短视频开头、品牌信任段落", metrics: ["使用 12 次", "已授权", "关联 3 项目", "团队可用"] },
      { title: "品牌人物照片", state: "需确认", body: "适合老板 IP 口播封面，发布前确认肖像授权", metrics: ["人物照", "需授权", "关联老板", "仅内部"] }
    ],
    视频: [
      { title: "产品演示 B-roll", state: "商业可用", body: "可剪入教程、发布会切片和短视频转场", metrics: ["时长 38s", "使用 9 次", "1080p", "已授权"] },
      { title: "客户现场采访片段", state: "仅内部参考", body: "适合提炼案例观点，不直接外发原片", metrics: ["时长 4m", "需确认", "关联案例", "AI 摘要"] },
      { title: "老板 IP 口播素材", state: "团队可用", body: "可复用为课程切片和视频号短评", metrics: ["6 段", "字幕完成", "复用 4 次", "本周"] }
    ],
    音频: [
      { title: "老板采访录音：AI 内容判断", state: "仅内部参考", body: "可提炼观点，不能直接外发原音频", metrics: ["42 分钟", "需确认版权", "AI 摘要完成", "关联老板 IP"] },
      { title: "客户电话反馈录音", state: "需确认授权", body: "适合整理成痛点、金句和销售 FAQ", metrics: ["18 分钟", "待转写", "客户案例", "内部"] },
      { title: "播客访谈音频", state: "可复用", body: "可转成小红书笔记、公众号长文和短视频口播", metrics: ["56 分钟", "已转写", "复用 3 次", "团队可用"] }
    ],
    文案: [
      { title: "历史广告语合集", state: "可复用", body: "适合训练品牌语气、复盘表达边界", metrics: ["128 条", "品牌资产", "使用 21 次", "已授权"] },
      { title: "常用 CTA 片段", state: "团队可用", body: "适合落地页、邮件和短视频结尾", metrics: ["46 条", "转化追踪", "本月更新", "可商用"] },
      { title: "客户案例长文", state: "需更新", body: "可拆成图文笔记、销售话术和短视频脚本", metrics: ["3 篇", "缺数据", "可复用", "待审阅"] }
    ],
    数据: [
      { title: "内容表现数据表", state: "可分析", body: "可用于数据分析、选题复盘和下周建议", metrics: ["30 天", "渠道 5 个", "已清洗", "可回流"] },
      { title: "产品参数表", state: "团队可用", body: "适合卖点提炼、竞品对比和招商方案", metrics: ["42 项", "版本 v3", "产品组", "已确认"] },
      { title: "用户调研摘要", state: "可复用", body: "可补事实、场景和用户原话", metrics: ["样本 186", "金句 24", "已脱敏", "可商用"] }
    ],
    案例: [
      { title: "增长焦虑客户案例", state: "商业可用", body: "适合案例拆解、销售页和短视频观点", metrics: ["行业 SaaS", "截图 4 张", "复用 7 次", "已授权"] },
      { title: "品牌翻车复盘案例", state: "仅参考", body: "适合避坑内容和品牌语气检查", metrics: ["公关事件", "需核实", "风险提醒", "案例库"] },
      { title: "课程转化案例", state: "可复用", body: "适合教育账号、课程页和直播复盘", metrics: ["转化 +18%", "数据齐", "本月", "可发布"] }
    ],
    品牌资产: [
      { title: "品牌色卡与 Logo 规范", state: "团队可用", body: "封面、PPT、视频包装统一视觉资产", metrics: ["品牌资产", "版本 v3", "使用 48 次", "已授权"] },
      { title: "字体和版式规范", state: "默认", body: "适合公众号、海报和封面生成统一风格", metrics: ["字体 3 套", "模板 8 个", "团队默认", "可复用"] },
      { title: "公司介绍与 Boilerplate", state: "可商用", body: "适合媒体稿、招商方案和品牌页", metrics: ["版本 v5", "法务确认", "使用 32 次", "团队"] }
    ]
  };

  const analytics: Record<string, LibraryCardData[]> = {
    内容表现: fallbackCards,
    渠道表现: [
      { title: "小红书收藏率最高", state: "建议加码", body: "案例截图和真实改稿过程内容表现最好", metrics: ["收藏 +42%", "互动 +18%", "建议 3 条", "高信心"] },
      { title: "公众号长文转化稳定", state: "继续运营", body: "深度拆解和方法论文章带来咨询线索", metrics: ["转化 3.8%", "阅读 48k", "停留 2m", "稳定"] },
      { title: "视频号开头疲劳", state: "需更新", body: "前三秒钩子重复度偏高，建议引入热点冲突", metrics: ["完播 -11%", "评论下降", "需换开头", "本周"] }
    ],
    选题表现: [
      { title: "反 AI 味选题持续有效", state: "高潜", body: "用户对真实细节、判断和改写前后对比更敏感", metrics: ["收藏 +31%", "转发 +12%", "可系列化", "高信心"] },
      { title: "工具教程热度回落", state: "需换角度", body: "单纯教程不如案例演示和避坑清单", metrics: ["互动 -9%", "教程疲劳", "建议案例", "中信心"] },
      { title: "老板 IP 观点内容波动", state: "待复盘", body: "强观点有效，但需要更具体的行业场景", metrics: ["完播 38%", "争议高", "需补案例", "本周"] }
    ],
    模板表现: [
      { title: "小红书短段落模板转化更稳", state: "模板洞察", body: "同主题下，小红书短段落版互动率高于公众号长文拆条", metrics: ["互动 +18%", "模板复用 9 次", "建议测试", "中信心"] },
      { title: "案例拆解模板收藏高", state: "可沉淀", body: "带截图、问题、解决动作、结果的结构最稳", metrics: ["收藏 +42%", "复用 11 次", "可上架", "高信心"] },
      { title: "三段式模板风险高", state: "需淘汰", body: "过度工整会拉高 AI 痕迹评分", metrics: ["风险 +23", "跳出高", "建议替换", "高信心"] }
    ],
    素材复用: [
      { title: "客户评价截图提升收藏率", state: "建议行动", body: "最近 30 天带案例截图内容收藏率比纯观点内容高 42%", metrics: ["收藏 +42%", "建议 3 条", "素材库回流", "高信心"] },
      { title: "老板采访金句复用不足", state: "可挖掘", body: "录音摘要里有 16 条可转短视频开头", metrics: ["金句 16", "复用 2 次", "建议切片", "中信心"] },
      { title: "品牌图规范使用稳定", state: "正常", body: "统一封面后，系列内容识别度更高", metrics: ["使用 48 次", "点击 +8%", "品牌一致", "稳定"] }
    ],
    团队效率: [
      { title: "草稿到发布周期缩短", state: "效率提升", body: "Skill 固定动作减少重复沟通", metrics: ["周期 -28%", "返工 -17%", "团队 18 人", "稳定"] },
      { title: "法务审核仍是瓶颈", state: "需流程化", body: "承诺性表达和绝对化用语反复返工", metrics: ["返工 12 次", "高风险", "需规则", "本月"] },
      { title: "素材检索效率不足", state: "需优化", body: "素材标签不完整导致复用率偏低", metrics: ["检索 4m", "标签缺口", "复用低", "建议补"] }
    ],
    转化数据: [
      { title: "案例内容带来更多咨询", state: "建议加码", body: "真实案例和改稿前后对比更容易触发私信", metrics: ["咨询 +26%", "转化 3.8%", "客资高", "高信心"] },
      { title: "纯观点内容转化弱", state: "需补证据", body: "观点强但没有证据时收藏有、咨询少", metrics: ["咨询 -14%", "收藏正常", "需案例", "中信心"] },
      { title: "邮件版复用价值高", state: "可扩展", body: "长文拆成邮件后带来二次转化", metrics: ["打开 41%", "点击 9%", "复用 5 次", "稳定"] }
    ]
  };

  const generic = fallbackCards.map((card, index) => ({
    ...card,
    title: chip === fallbackCards[0]?.state ? card.title : `${chip} · ${card.title}`,
    state: index === 0 ? "当前筛选" : card.state,
    metrics: [chip, ...card.metrics.slice(1)]
  }));

  if (section === "assets") return assets[chip] ?? generic;
  if (section === "analytics") return analytics[chip] ?? generic;
  if (section === "inspiration") return fallbackCards;
  return generic;
}

function buildLibraryOperation(
  section: Exclude<SidebarKey, "workbench" | "admin">,
  view: typeof sidebarViews[Exclude<SidebarKey, "workbench" | "admin">],
  action: string,
  activeChip: string
): LibraryOperation {
  const sectionName = view.title;
  const actionTemplates: Record<string, string[]> = {
    "语义搜索素材": ["已按自然语言检索素材标题、摘要和标签", "优先返回可商用、团队可用、最近使用的资产", "下一步可接向量库和素材权限表"],
    "生成 AI 摘要": ["已生成素材用途摘要、适合平台和风险提示", "音频/视频先转写，再提炼可用片段", "摘要会回写到素材卡片字段"],
    "检查版权状态": ["已按已授权、需确认、仅内部参考分组", "高风险素材会提示不要直接发布", "下一步可接团队审批流"],
    "关联到项目": ["已列出可关联草稿、视频项目和内容计划", "关联后素材使用次数会自动增加", "后续复盘可看到素材复用效果"],
    "生成下周建议": ["已根据当前分类生成 3 条内容建议", "优先选择高信心、高转化、素材齐的方向", "建议会回流到灵感库和草稿"],
    "回流灵感库": ["已把有效主题变成新的订阅信号", "会关联表现最好的内容和素材", "下次扫描会优先匹配相关热点"],
    "复盘模板表现": ["已按使用次数、互动、转化和风险评分排序", "低效模板会建议淘汰或重写", "高效模板可复制到团队 Skill"],
    "分析素材复用": ["已统计素材使用次数、关联项目和转化表现", "识别出高复用资产和沉睡资产", "建议补齐标签和版权状态"],
    "新建 Skill": ["已打开个人 Skill 创建流程入口", "需要定义输入、固定动作、输出和默认模块", "保存后可在工作台板块里直接指定"],
    "组合 Skill": ["已列出可组合的个人 Skill", "组合时会按顺序运行，避免规则互相覆盖", "适合新闻转选题再转脚本这类流程"],
    "设为默认": ["已准备把当前分类下的 Skill 设为默认", "默认规则只影响对应模块，不会串到其他板块", "可随时在 Skill 选择器里修改"],
    "复制到团队": ["已生成团队共享副本草案", "需要补负责人、适用团队和权限范围", "提交后进入团队 Skill 审批"],
    "申请使用": ["已生成使用申请", "会带上适用团队、用途和预计调用次数", "审批通过后可设为团队默认"],
    "提交改版": ["已创建改版草案", "会保留原版本并记录修改原因", "通过后替换团队默认版本"],
    "查看权限": ["已列出谁可用、谁可改、谁可审批", "高风险 Skill 默认只允许负责人修改", "权限后续可接账号系统"],
    "复制为个人 Skill": ["已复制为个人草案", "团队规则会保留来源和版本", "你可以按个人口吻继续修改"],
    "安装 Skill": ["已准备安装到我的 Skill", "会先试用一次再设为默认", "商业授权范围会写入 Skill 信息"],
    "试用一次": ["已生成试用输入框", "试用不会改变默认 Skill", "满意后可安装或收藏"],
    "收藏": ["已加入收藏列表", "收藏后会出现在我的 Skill 快捷入口", "不占用团队默认规则"],
    "查看评价": ["已打开评价摘要", "优先看适用场景、差评原因和授权边界", "安装前建议先试用一次"]
  };

  return {
    title: action,
    eyebrow: `${sectionName} · ${activeChip}`,
    body: `这个动作已经绑定到「${sectionName}」的「${activeChip}」分类，不再是空按钮。MVP 阶段先展示操作结果和下一步，后续可以接真实数据库和任务队列。`,
    items: actionTemplates[action] ?? [
      `已读取当前模块：${sectionName}`,
      `已应用当前分类：${activeChip}`,
      "已生成可继续接后端的操作占位结果"
    ],
    primary: action.includes("生成") || action.includes("新建") || action.includes("安装") ? "生成结果" : "保存操作"
  };
}

function buildFieldOperation(
  view: typeof sidebarViews[Exclude<SidebarKey, "workbench" | "admin">],
  field: string,
  activeChip: string
): LibraryOperation {
  return {
    title: `${field} 字段`,
    eyebrow: `${view.title} · ${activeChip}`,
    body: `「${field}」是 ${view.title} 的管理字段。点击后会展示字段用途、当前分类和后续落库方式，避免只是静态标签。`,
    items: [
      `字段用途：用于筛选、排序、复用和权限判断`,
      `当前分类：${activeChip}`,
      "后端落库：后续可映射到 PostgreSQL 字段或搜索索引",
      "AI 使用：可作为 Prompt 上下文，帮助生成摘要、建议或风险提醒"
    ],
    primary: "知道了"
  };
}

function buildTrendRadarOperation(endpoint: string): LibraryOperation {
  return {
    title: "安装 TrendRadar 热点源",
    eyebrow: "灵感库 · 外部热点源",
    body: "TrendRadar 是独立 Python 热点聚合服务，本项目已预留到灵感库的 MCP 接入口。启动 TrendRadar 后，后台可以测试连接，后续就能把它作为更完整的热点来源。",
    items: [
      "仓库：https://github.com/sansan0/TrendRadar.git",
      "启动命令：cd ~/Documents && git clone https://github.com/sansan0/TrendRadar.git",
      "初始化：cd TrendRadar && ./setup-mac.sh",
      "启动 MCP HTTP：./start-http.sh",
      `灵感库 Endpoint：${endpoint || defaultTrendRadarEndpoint}`,
      "可用工具：get_latest_news、get_trending_topics、search_news、get_latest_rss、trigger_crawl"
    ],
    primary: "知道了"
  };
}

function SidebarModuleView({
  section,
  inspirationSignals,
  inspirationRules,
  inspirationScanMeta,
  inspirationLoading,
  trendRadarEndpoint,
  trendRadarStatus,
  trendRadarLoading,
  onTrendRadarEndpointChange,
  onScanInspiration,
  onTestTrendRadar
}: {
  section: Exclude<SidebarKey, "workbench" | "admin">;
  inspirationSignals: InspirationSignal[];
  inspirationRules: InspirationRule[];
  inspirationScanMeta: string;
  inspirationLoading: boolean;
  trendRadarEndpoint: string;
  trendRadarStatus: string;
  trendRadarLoading: boolean;
  onTrendRadarEndpointChange: (value: string) => void;
  onScanInspiration: () => void;
  onTestTrendRadar: () => void;
}) {
  const view = sidebarViews[section];
  const [activeChip, setActiveChip] = useState(view.chips[0] ?? "全部");
  const [selectedProject, setSelectedProject] = useState<LibraryCardData | null>(null);
  const [selectedHotspotPack, setSelectedHotspotPack] = useState<{ title: string; hotspots: InspirationSignal[]; sources: string } | null>(null);
  const [operation, setOperation] = useState<LibraryOperation | null>(null);
  const isInspiration = section === "inspiration";
  const cards = libraryChipCards(section, activeChip, view.cards);
  const inspirationGroups = chunkSignals(inspirationSignals, 10);
  const projectHotspots = selectedProject
    ? selectedProject.hotspots ?? projectHotspotsFor(selectedProject.title, selectedProject.body, inspirationSignals)
    : [];

  useEffect(() => {
    setActiveChip(view.chips[0] ?? "全部");
    setSelectedProject(null);
    setSelectedHotspotPack(null);
    setOperation(null);
  }, [section, view.chips]);

  return (
    <section className="library-page">
      <header className="library-hero">
        <div>
          <span>{view.mindset}</span>
          <h1>{view.title}</h1>
          <p>{view.subtitle}</p>
        </div>
        <aside>
          <strong>放什么</strong>
          <p>{view.stores}</p>
        </aside>
      </header>

      <div className="library-chips">
        {view.chips.map((chip) => (
          <button className={activeChip === chip ? "active" : ""} key={chip} onClick={() => setActiveChip(chip)} type="button">
            {chip}
          </button>
        ))}
      </div>

      {!isInspiration ? (
        <section className="library-context-strip">
          <div>
            <strong>{activeChip}</strong>
            <span>当前分类已启用，下面卡片、AI 动作和关键字段都会按这个分类处理。</span>
          </div>
          <button type="button" onClick={() => setOperation(buildLibraryOperation(section, view, view.actions[0] ?? "查看", activeChip))}>
            执行推荐动作
          </button>
        </section>
      ) : null}

      {isInspiration ? (
        <section className="inspiration-scan-panel">
          <div>
            <strong>全球热点扫描 API</strong>
            <span>{inspirationScanMeta || "/api/inspiration/scan · 扫描 Google Trends 全球热搜，并补充 Google News 关联报道。"}</span>
          </div>
          <button type="button" onClick={onScanInspiration} disabled={inspirationLoading}>
            {inspirationLoading ? <Loader2 className="spin" size={16} /> : <Activity size={16} />}
            扫描全球最新热点
          </button>
        </section>
      ) : null}

      {isInspiration ? (
        <section className="trendradar-panel">
          <div className="trendradar-title">
            <Github size={18} />
            <div>
              <strong>TrendRadar 热点源</strong>
              <span>已安装为灵感库外部 MCP 源入口，可接新闻热榜、RSS、趋势话题和手动爬取。</span>
            </div>
          </div>
          <label>
            <span>MCP Endpoint</span>
            <input value={trendRadarEndpoint} onChange={(event) => onTrendRadarEndpointChange(event.target.value)} placeholder={defaultTrendRadarEndpoint} />
          </label>
          <div className="trendradar-actions">
            <button type="button" onClick={() => setOperation(buildTrendRadarOperation(trendRadarEndpoint))}>
              安装说明
            </button>
            <button type="button" onClick={onTestTrendRadar} disabled={trendRadarLoading}>
              {trendRadarLoading ? <Loader2 className="spin" size={14} /> : <Activity size={15} />}
              测试连接
            </button>
          </div>
          <p>{trendRadarStatus || "默认端口：http://localhost:3333/mcp。TrendRadar 服务启动后点“测试连接”。"}</p>
        </section>
      ) : null}

      <section className="library-grid">
        {isInspiration
          ? inspirationGroups.map((group, index) => {
              const sources = Array.from(new Set(group.map((signal) => signal.source))).slice(0, 3).join(" / ");
              const title = index === 0 ? "全球最新热点" : `更多全球热点 ${index + 1}`;
              return (
                <article
                  className="library-card clickable inspiration-hotspot-card"
                  key={group.map((signal) => signal.id).join("-")}
                  onClick={() => setSelectedHotspotPack({ title, hotspots: group, sources: sources || "全球来源" })}
                >
                  <div>
                    <strong>{title}</strong>
                    <span>{group.length} 条</span>
                  </div>
                  <ul>
                    {group.slice(0, 3).map((signal) => (
                      <li key={signal.id}>
                        <strong>{signal.title}</strong>
                        <p>{signal.body}</p>
                        <div className="hotspot-source-row">
                          <small>{signal.source} · {signal.scannedAt}</small>
                          <a href={signalUrl(signal)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                            打开来源
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button
                    className="hotspot-more"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedHotspotPack({ title, hotspots: group, sources: sources || "全球来源" });
                    }}
                  >
                    查看全部 {group.length} 条热点
                  </button>
                  <dl>
                    {[
                      `热点 ${group.length} 条`,
                      sources || "全球来源",
                      "全球最新",
                      "需核实"
                    ].map((metric) => (
                      <div key={metric}>
                        <dt>{metric.split(" ")[0]}</dt>
                        <dd>{metric.replace(metric.split(" ")[0], "").trim() || metric}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              );
            })
          : cards.map((card) => (
            <article className="library-card clickable" key={card.title} onClick={() => setSelectedProject(card)}>
              <div>
                <strong>{card.title}</strong>
                <span>{card.state}</span>
              </div>
              <p>{card.body}</p>
              <dl>
                {card.metrics.map((metric) => (
                  <div key={metric}>
                    <dt>{metric.split(" ")[0]}</dt>
                    <dd>{metric.replace(metric.split(" ")[0], "").trim() || metric}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
      </section>

      <section className="library-split">
        <article className="library-panel">
          <h2>AI 动作</h2>
          <div className="library-action-list">
            {view.actions.map((action) => (
              <button key={action} onClick={() => setOperation(buildLibraryOperation(section, view, action, activeChip))} type="button">
                {action}
              </button>
            ))}
          </div>
        </article>

        <article className="library-panel">
          <h2>{isInspiration ? "扫描规则" : "关键字段"}</h2>
          <ul className={isInspiration ? "inspiration-rule-list" : ""}>
            {(isInspiration ? inspirationRules.map((rule) => rule.label) : view.fields).map((field) => (
              <li key={field}>
                <button className="library-field-button" type="button" onClick={() => setOperation(buildFieldOperation(view, field, activeChip))}>
                  {field}
                </button>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {isInspiration ? (
        <section className="inspiration-rule-board">
          {inspirationRules.map((rule) => (
            <article key={rule.id}>
              <strong>{rule.label}</strong>
              <span>{rule.scope}</span>
              <p>{rule.contentRule}</p>
              <small>保留：{rule.keepRule}</small>
              <small>过滤：{rule.rejectRule}</small>
            </article>
          ))}
        </section>
      ) : null}

      {selectedHotspotPack ? (
        <div className="modal-backdrop">
          <section className="modal-card project-hotspot-modal">
            <header>
              <div>
                <strong>{selectedHotspotPack.title}</strong>
                <span>{selectedHotspotPack.sources} · 共 {selectedHotspotPack.hotspots.length} 条热点，卡片只预览 3 条。</span>
              </div>
              <button onClick={() => setSelectedHotspotPack(null)}>关闭</button>
            </header>
            <div className="project-hotspot-list">
              {selectedHotspotPack.hotspots.map((signal, index) => (
                <article key={signal.id}>
                  <div>
                    <strong>{index + 1}. {signal.title}</strong>
                    <span>{signal.source}</span>
                  </div>
                  <p>{signal.body}</p>
                  <p>{signal.whyRelated}</p>
                  <ul>
                    {signal.angles.slice(0, 3).map((angle) => (
                      <li key={angle}>{angle}</li>
                    ))}
                  </ul>
                  <a className="hotspot-open-link" href={signalUrl(signal)} target="_blank" rel="noreferrer">
                    打开来源
                  </a>
                  <small>命中规则：{signal.ruleName}</small>
                  <small>风险：{signal.risks[0]}</small>
                </article>
              ))}
            </div>
            <footer>
              <span className="modal-count">当前显示全部 {selectedHotspotPack.hotspots.length} 条热点。</span>
              <button onClick={() => setSelectedHotspotPack(null)}>关闭</button>
            </footer>
          </section>
        </div>
      ) : null}

      {selectedProject ? (
        <div className="modal-backdrop">
          <section className="modal-card project-hotspot-modal">
            <header>
              <div>
                <strong>{selectedProject.title}</strong>
                <span>{view.title} · {activeChip} · {selectedProject.state}</span>
              </div>
              <button onClick={() => setSelectedProject(null)}>关闭</button>
            </header>
            <section className="library-detail-card">
              <p>{selectedProject.body}</p>
              <div className="library-detail-metrics">
                {selectedProject.metrics.map((metric) => (
                  <span key={metric}>{metric}</span>
                ))}
              </div>
              <div className="library-detail-actions">
                {view.actions.map((action) => (
                  <button key={action} type="button" onClick={() => setOperation(buildLibraryOperation(section, view, action, activeChip))}>
                    {action}
                  </button>
                ))}
              </div>
            </section>
            <div className="project-hotspot-list">
              {projectHotspots.map((signal) => (
                <article key={signal.id}>
                  <div>
                    <strong>{signal.title}</strong>
                    <span>{signal.source}</span>
                  </div>
                  <p>{signal.body}</p>
                  <p>{signal.whyRelated}</p>
                  <ul>
                    {signal.angles.slice(0, 3).map((angle) => (
                      <li key={angle}>{angle}</li>
                    ))}
                  </ul>
                  <a className="hotspot-open-link" href={signalUrl(signal)} target="_blank" rel="noreferrer">
                    打开来源
                  </a>
                  <small>命中规则：{signal.ruleName}</small>
                  <small>风险：{signal.risks[0]}</small>
                </article>
              ))}
            </div>
            <footer>
              <span className="modal-count">可继续执行上面的模块动作，或参考下方热点生成新草稿、视频脚本和选题卡。</span>
              <button onClick={() => setSelectedProject(null)}>关闭</button>
            </footer>
          </section>
        </div>
      ) : null}

      {operation ? (
        <div className="modal-backdrop">
          <section className="modal-card library-operation-modal">
            <header>
              <div>
                <strong>{operation.title}</strong>
                <span>{operation.eyebrow}</span>
              </div>
              <button onClick={() => setOperation(null)}>关闭</button>
            </header>
            <p>{operation.body}</p>
            <div className="library-operation-list">
              {operation.items.map((item) => (
                <article key={item}>
                  <CheckCircle2 size={16} />
                  <span>{item}</span>
                </article>
              ))}
            </div>
            <footer>
              <span className="modal-count">这一步现在已经有可见反馈，后续可接真实接口。</span>
              <button className="primary" onClick={() => setOperation(null)}>{operation.primary}</button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}

type AdminTab = "overview" | "users" | "models" | "jobs" | "skills" | "billing";
type AdminCapabilityId = "accounts" | "gateway" | "adapter" | "prompt" | "inspiration" | "queue" | "versions" | "metering" | "audit";
type AdminApiConfig = {
  baseUrl: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  targetModule: AdminTargetModule;
  apiKey: string;
  secret: string;
  enabled: boolean;
  savedAt?: string;
  testState?: string;
};

const ADMIN_API_CONFIG_STORAGE_KEY = "ai-content-workbench:admin-api-configs";
const adminCapabilityIds: AdminCapabilityId[] = ["accounts", "gateway", "adapter", "prompt", "inspiration", "queue", "versions", "metering", "audit"];

function createDefaultAdminApiConfigs(): Record<AdminCapabilityId, AdminApiConfig> {
  return {
    accounts: { baseUrl: "", path: "/admin/users", method: "POST", targetModule: "all", apiKey: "", secret: "", enabled: false },
    gateway: { baseUrl: "", path: "/admin/gateway/routes", method: "POST", targetModule: "all", apiKey: "", secret: "", enabled: false },
    adapter: { baseUrl: "", path: "/admin/models/adapters", method: "POST", targetModule: "write", apiKey: "", secret: "", enabled: false },
    prompt: { baseUrl: "", path: "/admin/prompts/templates", method: "POST", targetModule: "write", apiKey: "", secret: "", enabled: false },
    inspiration: { baseUrl: "http://localhost:3000", path: "/api/inspiration/scan", method: "POST", targetModule: "all", apiKey: "", secret: "", enabled: true },
    queue: { baseUrl: "", path: "/admin/jobs/queue", method: "POST", targetModule: "all", apiKey: "", secret: "", enabled: false },
    versions: { baseUrl: "", path: "/admin/documents/versions", method: "POST", targetModule: "all", apiKey: "", secret: "", enabled: false },
    metering: { baseUrl: "", path: "/admin/metering/usage", method: "POST", targetModule: "all", apiKey: "", secret: "", enabled: false },
    audit: { baseUrl: "", path: "/admin/security/audit", method: "POST", targetModule: "all", apiKey: "", secret: "", enabled: false }
  };
}

function mergeAdminApiConfigs(value: unknown): Record<AdminCapabilityId, AdminApiConfig> {
  const defaults = createDefaultAdminApiConfigs();
  if (!value || typeof value !== "object") return defaults;
  const raw = value as Partial<Record<AdminCapabilityId, Partial<AdminApiConfig>>>;
  return Object.fromEntries(
    adminCapabilityIds.map((id) => {
      const item = raw[id] ?? {};
      return [
        id,
        {
          ...defaults[id],
          ...item,
          method: ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(String(item.method)) ? item.method as AdminApiConfig["method"] : defaults[id].method,
          targetModule: item.targetModule === "all" || isWorkflowBlockId(item.targetModule) ? item.targetModule : defaults[id].targetModule,
          enabled: Boolean(item.enabled)
        }
      ];
    })
  ) as Record<AdminCapabilityId, AdminApiConfig>;
}

function AdminApiSettings({
  title,
  config,
  onChange,
  onSave,
  onTest
}: {
  title: string;
  config: AdminApiConfig;
  onChange: (next: AdminApiConfig) => void;
  onSave: () => void;
  onTest: () => void;
}) {
  return (
    <section className="admin-api-settings">
      <header>
        <div>
          <strong>{title} API 接口设置</strong>
          <span>给这个后台板块绑定真实接口；MVP 阶段先保存到当前浏览器。</span>
        </div>
        <label>
          <input type="checkbox" checked={config.enabled} onChange={(event) => onChange({ ...config, enabled: event.target.checked })} />
          启用
        </label>
      </header>
      <div className="admin-api-form">
        <label>
          <span>Base URL</span>
          <input value={config.baseUrl} onChange={(event) => onChange({ ...config, baseUrl: event.target.value })} placeholder="https://api.yourdomain.com" />
        </label>
        <label>
          <span>接口路径</span>
          <input value={config.path} onChange={(event) => onChange({ ...config, path: event.target.value })} placeholder="/admin/..." />
        </label>
        <label>
          <span>Method</span>
          <select value={config.method} onChange={(event) => onChange({ ...config, method: event.target.value as AdminApiConfig["method"] })}>
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => (
              <option key={method}>{method}</option>
            ))}
          </select>
        </label>
        <label>
          <span>适用模块 / 要加到哪个模块</span>
          <select value={config.targetModule} onChange={(event) => onChange({ ...config, targetModule: event.target.value === "all" ? "all" : event.target.value as WorkflowBlockId })}>
            <option value="all">全部模块</option>
            {workflowBlocks.map((block) => (
              <option key={block.id} value={block.id}>{block.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>API Key / Token</span>
          <input type="password" value={config.apiKey} onChange={(event) => onChange({ ...config, apiKey: event.target.value })} placeholder="填写后台接口 Key" autoComplete="off" />
        </label>
        <label>
          <span>Secret / 签名密钥</span>
          <input type="password" value={config.secret} onChange={(event) => onChange({ ...config, secret: event.target.value })} placeholder="可选" autoComplete="off" />
        </label>
      </div>
      <footer>
        <span>{config.savedAt ? `已保存：${config.savedAt}` : config.enabled ? "已启用，但还没有保存" : "未启用"}</span>
        {config.testState ? <b>{config.testState}</b> : null}
        <div>
          <button type="button" onClick={onTest}>测试接口</button>
          <button className="primary" type="button" onClick={onSave}>保存接口设置</button>
        </div>
      </footer>
    </section>
  );
}

function ModuleAdapterBuilder({
  target,
  modelId,
  message,
  onTargetChange,
  onModelChange,
  onSave,
  onOpenModels
}: {
  target: WorkflowBlockId;
  modelId: string;
  message: string;
  onTargetChange: (target: WorkflowBlockId) => void;
  onModelChange: (modelId: string) => void;
  onSave: () => void;
  onOpenModels: () => void;
}) {
  const selectedModel = findApiModel(modelId);

  return (
    <section className="admin-adapter-builder">
      <header>
        <div>
          <strong>添加模块适配</strong>
          <span>先选要加到哪个模块，再选模型；保存后这个模块就会使用该模型。</span>
        </div>
        <button type="button" onClick={onOpenModels}>填写模型 API</button>
      </header>
      <div className="admin-adapter-form">
        <label>
          <span>要加到哪个模块</span>
          <select value={target} onChange={(event) => onTargetChange(event.target.value as WorkflowBlockId)}>
            {workflowBlocks.map((block) => (
              <option key={block.id} value={block.id}>{block.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>选择适配模型</span>
          <select value={selectedModel.id} onChange={(event) => onModelChange(event.target.value)}>
            {apiModels.map((model) => (
              <option key={model.id} value={model.id}>{model.provider} · {model.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>模型 ID</span>
          <input value={selectedModel.modelId} readOnly />
        </label>
      </div>
      <footer>
        <span>{message || `准备把 ${selectedModel.name} 加到 ${workflowBlockLabel(target)}。`}</span>
        <button className="primary" type="button" onClick={onSave}>保存到这个模块</button>
      </footer>
    </section>
  );
}

function AdminPromptTools({
  target,
  onDefault,
  onImport,
  onManual,
  onDownload,
  onTargetChange
}: {
  target: WorkflowBlockId;
  onDefault: () => void;
  onImport: () => void;
  onManual: () => void;
  onDownload: () => void;
  onTargetChange: (target: WorkflowBlockId) => void;
}) {
  return (
    <section className="admin-prompt-tools">
      <label className="admin-prompt-target">
        <span>Prompt 要加到哪个板块</span>
        <select value={target} onChange={(event) => onTargetChange(event.target.value as WorkflowBlockId)}>
          {workflowBlocks.map((block) => (
            <option key={block.id} value={block.id}>{block.label}</option>
          ))}
        </select>
      </label>
      {[
        { title: "默认 Prompt", body: "选择系统内置规则", action: onDefault },
        { title: "导入 / 上传", body: "上传 .skill / .json / .md", action: onImport },
        { title: "GitHub 下载", body: "从 GitHub 仓库导入 Skill", action: onDownload },
        { title: "手动填写", body: "打开 Prompt 编辑框", action: onManual }
      ].map((item) => (
        <button key={item.title} type="button" onClick={item.action}>
          <strong>{item.title}</strong>
          <span>{item.body}</span>
        </button>
      ))}
    </section>
  );
}

function InspirationRuleAdmin({ rules }: { rules: InspirationRule[] }) {
  return (
    <section className="inspiration-rule-admin">
      <header>
        <div>
          <strong>灵感扫描规则</strong>
          <span>每条热点信息都必须命中一套规则，避免把全球新闻直接倒成垃圾场。</span>
        </div>
        <b>{rules.length} 套规则</b>
      </header>
      <div>
        {rules.map((rule) => (
          <article key={rule.id}>
            <strong>{rule.label}</strong>
            <span>{rule.scope}</span>
            <p>{rule.contentRule}</p>
            <small>关键词：{rule.keywords.slice(0, 5).join(" / ")}</small>
            <small>保留：{rule.keepRule}</small>
            <small>过滤：{rule.rejectRule}</small>
            <small>输出：{rule.outputRule}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminDashboard({
  activeTab,
  onTabChange,
  skills,
  activeSkills,
  activeBlockSkills,
  modelCredentials,
  activeApiModels,
  videoProjects,
  onOpenModels,
  onOpenSkillPicker,
  onOpenGithubSkillImport,
  onScanInspiration,
  onBindModuleModel,
  onPickWorkflowModel
}: {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  skills: Skill[];
  activeSkills: ActiveSkills;
  activeBlockSkills: ActiveBlockSkills;
  modelCredentials: Record<string, ApiModelCredential>;
  activeApiModels: ActiveApiModels;
  videoProjects: VideoRenderProject[];
  onOpenModels: () => void;
  onOpenSkillPicker: (target: WorkflowBlockId, source: SkillSource) => void;
  onOpenGithubSkillImport: (target: WorkflowBlockId) => void;
  onScanInspiration: () => void;
  onBindModuleModel: (target: WorkflowBlockId, modelId: string) => void;
  onPickWorkflowModel: (target: WorkflowBlockId) => void;
}) {
  const [activeCapability, setActiveCapability] = useState<AdminCapabilityId>("accounts");
  const [adminApiConfigs, setAdminApiConfigs] = useState<Record<AdminCapabilityId, AdminApiConfig>>(createDefaultAdminApiConfigs);
  const [adapterDraft, setAdapterDraft] = useState<{ target: WorkflowBlockId; modelId: string }>({ target: "write", modelId: defaultApiModelId });
  const [promptDraftTarget, setPromptDraftTarget] = useState<WorkflowBlockId>("write");
  const [adapterSavedMessage, setAdapterSavedMessage] = useState("");
  const [adminNotice, setAdminNotice] = useState<LibraryOperation | null>(null);
  const configuredModels = apiModels.filter((model) => modelCredentials[model.id]?.apiKey.trim()).length;
  const userSkills = skills.filter((skill) => skill.isUser);
  const activeWorkflowRows = workflowBlocks.map((block) => {
    const module = block.module;
    const currentSkill = skills.find((skill) => skill.id === activeBlockSkills[block.id])
      ?? skills.find((skill) => skill.id === activeSkills[module]);
    const currentModel = findApiModel(activeApiModels[block.id]);
    return {
      id: block.id,
      label: block.label,
      module,
      skill: currentSkill?.name ?? "未指定",
      model: currentModel.name,
      apiState: modelCredentials[currentModel.id]?.apiKey.trim() ? "自填 API" : "默认占位"
    };
  });
  const adminTabs: Array<{ id: AdminTab; label: string }> = [
    { id: "overview", label: "总览" },
    { id: "users", label: "用户与用量" },
    { id: "models", label: "模型/API" },
    { id: "jobs", label: "任务队列" },
    { id: "skills", label: "Skill 规则" },
    { id: "billing", label: "计费与风控" }
  ];
  const queueRows = [
    { name: "写稿生成", status: "正常", latency: "1.2s", success: "99.2%" },
    { name: "AI 痕迹评估", status: "正常", latency: "0.8s", success: "99.7%" },
    { name: "分镜图片提示词", status: "等待接入", latency: "-", success: "-" },
    { name: "成片素材包任务", status: "待接入真实 API", latency: "-", success: "-" }
  ];
  const capabilityOrder = adminCapabilityIds;
  const capabilityPanels: Record<AdminCapabilityId, {
    label: string;
    title: string;
    description: string;
    stats: string[];
    rows: string[][];
    rules: string[];
    primaryAction: string;
  }> = {
    accounts: {
      label: "用户账户",
      title: "用户账户管理",
      description: "管理用户、团队、角色、登录状态和账号权限。",
      stats: ["3 个用户", "1 个团队", "0 个异常登录"],
      rows: [
        ["写作达人", "专业版", "管理员", "正常"],
        ["团队账号", "内测席位", "成员 18 人", "正常"],
        ["新用户", "试用版", "待转化", "接近额度"]
      ],
      rules: ["支持个人 / 团队账号", "后续接登录、角色、邀请和禁用", "后台操作需要写审计日志"],
      primaryAction: "新增用户"
    },
    gateway: {
      label: "API 网关",
      title: "API 网关管理",
      description: "统一管理 /write、/humanize、/analyze、/format、/video 等调用入口。",
      stats: ["14 条路由", "10s 超时", "SSRF 防护开启"],
      rows: [
        ["/api/write", "写稿", "文本生成", "正常"],
        ["/api/model/test", "模型测试", "公网 HTTPS", "已加固"],
        ["/api/inspiration/scan", "灵感扫描", "全球热点 RSS", "可用"],
        ["/api/video/render", "视频任务", "异步预留", "待接入"]
      ],
      rules: ["统一鉴权与限流", "记录模型、耗时、错误码", "所有外部 Endpoint 先过安全校验"],
      primaryAction: "查看路由"
    },
    adapter: {
      label: "模型适配层",
      title: "模型适配层管理",
      description: "管理不同厂商模型、默认模型、能力标签和模块绑定。",
      stats: [`${apiModels.length} 个模型`, `${configuredModels} 个已配置`, "10 个板块绑定"],
      rows: activeWorkflowRows.map((row) => [row.label, row.model, row.apiState, row.skill]),
      rules: ["每个模块可单独选择模型", "文本、图片、视频能力分开标注", "生产环境 Key 应迁移到服务端环境变量"],
      primaryAction: "打开模型配置"
    },
    prompt: {
      label: "Prompt 模板",
      title: "Prompt 模板管理",
      description: "管理写稿、润色、评估、排版和短视频 Skill 规则包。",
      stats: [`${skills.length} 个 Skill`, `${userSkills.length} 个自建`, "10 个板块"],
      rows: activeWorkflowRows.map((row) => [row.label, row.skill, row.model, row.apiState]),
      rules: ["支持默认、上传、GitHub、自定义 Prompt", "Skill 可以复制、修改、删除和设为当前", "后续补版本、审核和团队共享"],
      primaryAction: "新建 Prompt Skill"
    },
    inspiration: {
      label: "灵感扫描",
      title: "灵感库 API / 全球热点扫描",
      description: "管理灵感库的热点源、订阅范围、内容规则和每条热点的规则命中。",
      stats: [`${defaultInspirationRules.length} 套规则`, "全球热点源", "/api/inspiration/scan"],
      rows: [
        ["/api/inspiration/scan", "扫描全球最新热点", "POST", "可用"],
        ["TrendRadar MCP", "本机热点聚合源", "http://localhost:3333/mcp", "可测试"],
        ["Google Trends RSS", "公开热搜源", "10 分钟缓存", "已接入"],
        ["Google News RSS", "关联报道源", "10 分钟缓存", "已接入"],
        ["规则命中", "每条内容绑定 ruleId", "可追溯", "已启用"],
        ["外部热点 API", "可填 Base URL / Key", "后台配置", "预留"]
      ],
      rules: [
        "先按账号关注范围订阅，不扫描无关新闻",
        "每条热点必须命中一套规则，显示 ruleId、规则名和风险提醒",
        "只输出为什么和我有关、可创作角度、建议形式、相关素材和风险提醒",
        "发布前必须核实原始来源，不能把灰度、传闻写成全面开放"
      ],
      primaryAction: "扫描热点"
    },
    queue: {
      label: "任务队列",
      title: "任务队列管理",
      description: "管理文本生成、评估、排版、短视频素材包和后期生成预留任务。",
      stats: ["4 类队列", "2 个同步任务", "2 个待异步"],
      rows: queueRows.map((row) => [row.name, row.status, row.latency, row.success]),
      rules: ["文本任务可同步返回", "视频任务进入 Redis 队列", "失败任务记录原因和重试次数"],
      primaryAction: "查看任务"
    },
    versions: {
      label: "版本管理",
      title: "文档版本管理",
      description: "管理草稿、润色稿、评估修改稿、排版稿和视频素材包版本。",
      stats: ["4 个版本类型", "本地保存", "待接数据库"],
      rows: [
        ["初稿", "write", "可回滚", "待落库"],
        ["润色稿", "humanize", "替换后续输入", "待落库"],
        ["排版稿", "format", "可导出", "待落库"]
      ],
      rules: ["每次关键保存生成版本", "支持对比、回滚、复制为新草稿", "记录来源模块和使用 Skill"],
      primaryAction: "创建版本"
    },
    metering: {
      label: "用量计费",
      title: "用量计费管理",
      description: "管理字数、模型调用、图片、视频任务和套餐额度。",
      stats: ["32,450 字", "剩余 67%", "计费待接入"],
      rows: [
        ["文本生成", "按字数", "32,450", "正常"],
        ["图片生成", "按张数", "0", "未启用"],
        ["成片素材包", "按任务", "0", "待接入"]
      ],
      rules: ["不同模型可配置单价倍率", "失败任务按策略退回额度", "到达阈值时暂停高成本任务"],
      primaryAction: "配置套餐"
    },
    audit: {
      label: "风控审计",
      title: "风控审计管理",
      description: "管理高危 API、外部 Endpoint、内容风险、后台操作审计。",
      stats: ["SSRF 防护开启", "0 个高危告警", "审计待落库"],
      rows: [
        ["Endpoint 校验", "只允许 HTTPS 公网", "已开启", "高优先级"],
        ["API Key 保存", "浏览器本地", "内测可用", "需服务端化"],
        ["后台操作", "审计日志", "待接入", "中优先级"]
      ],
      rules: ["拦截 localhost、内网、链路本地地址", "后台敏感操作写审计日志", "后续补内容合规和账号风控"],
      primaryAction: "查看审计"
    }
  };
  const activeCapabilityPanel = capabilityPanels[activeCapability];
  const activeApiConfig = adminApiConfigs[activeCapability];
  const configuredAdminApis = adminCapabilityIds.filter((id) => adminApiConfigs[id].enabled && adminApiConfigs[id].baseUrl.trim()).length;
  useEffect(() => {
    const parsedAdminApiConfigs = readJsonStorage(ADMIN_API_CONFIG_STORAGE_KEY);
    if (parsedAdminApiConfigs) {
      setAdminApiConfigs(mergeAdminApiConfigs(parsedAdminApiConfigs));
    }
  }, []);

  const updateAdminApiConfig = (id: AdminCapabilityId, next: AdminApiConfig) => {
    setAdminApiConfigs((current) => ({ ...current, [id]: next }));
  };

  const saveAdminApiConfig = (id: AdminCapabilityId) => {
    const nextConfigs = {
      ...adminApiConfigs,
      [id]: {
        ...adminApiConfigs[id],
        baseUrl: adminApiConfigs[id].baseUrl.trim(),
        path: adminApiConfigs[id].path.trim() || createDefaultAdminApiConfigs()[id].path,
        targetModule: adminApiConfigs[id].targetModule,
        apiKey: adminApiConfigs[id].apiKey.trim(),
        secret: adminApiConfigs[id].secret.trim(),
        savedAt: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
      }
    };
    setAdminApiConfigs(nextConfigs);
    localStorage.setItem(ADMIN_API_CONFIG_STORAGE_KEY, JSON.stringify(nextConfigs));
  };

  const testAdminApiConfig = async (id: AdminCapabilityId) => {
    const config = adminApiConfigs[id];
    if (id === "inspiration") {
      updateAdminApiConfig(id, {
        ...config,
        enabled: true,
        path: config.path.trim() || "/api/inspiration/scan",
        testState: "正在请求 /api/inspiration/scan ..."
      });
      try {
        const result = await postJson<InspirationScanResult>("/api/inspiration/scan", {
          rules: defaultInspirationRules,
          limit: 3,
          locale: "zh-CN"
        });
        updateAdminApiConfig(id, {
          ...config,
          enabled: true,
          baseUrl: config.baseUrl.trim() || "http://localhost:3000",
          path: config.path.trim() || "/api/inspiration/scan",
          method: "POST",
          testState: `接口跑通：${result.sourceMode === "fallback" ? "兜底数据" : result.sourceMode === "google-trends-rss" ? "Google 热搜源" : "实时热点源"}，返回 ${result.signals.length} 条热点`
        });
      } catch (error) {
        updateAdminApiConfig(id, {
          ...config,
          testState: error instanceof Error ? `接口测试失败：${error.message}` : "接口测试失败"
        });
      }
      return;
    }
    const ok = config.enabled && config.baseUrl.trim().startsWith("https://") && config.path.trim().startsWith("/");
    updateAdminApiConfig(id, {
      ...config,
      testState: ok ? "接口格式可用，等待接真实后端验证" : "请启用并填写 HTTPS Base URL 与 / 开头路径"
    });
  };

  const saveModuleAdapter = () => {
    const model = findApiModel(adapterDraft.modelId);
    onBindModuleModel(adapterDraft.target, model.id);
    setAdapterSavedMessage(`${workflowBlockLabel(adapterDraft.target)} 已绑定 ${model.provider} · ${model.name}`);
  };

  const runCapabilityAction = () => {
    if (activeCapability === "adapter" || activeCapability === "gateway") {
      onOpenModels();
      return;
    }
    if (activeCapability === "prompt") {
      onOpenSkillPicker("write", "prompt");
      return;
    }
    if (activeCapability === "inspiration") {
      onScanInspiration();
    }
  };

  const showAdminNotice = (title: string, items: string[]) => {
    setAdminNotice({
      title,
      eyebrow: "管理后台",
      body: "这个后台动作现在会给出明确反馈，后续接真实数据库或任务队列时可以直接替换成接口调用。",
      items,
      primary: "知道了"
    });
  };

  return (
    <section className="admin-page">
      <header className="admin-hero">
        <div>
          <span>系统管理</span>
          <h1>管理后台</h1>
          <p>集中管理模型 API、用户用量、任务队列、Skill 规则包、版本记录和计费风控。</p>
        </div>
        <div className="admin-health-card">
          <strong>当前状态</strong>
          <b>内测 MVP</b>
          <span>前端本地存储 · API 路由模拟生成 · 可继续接 PostgreSQL / Redis</span>
        </div>
      </header>

      <nav className="admin-tabs">
        {adminTabs.map((tab) => (
          <button className={activeTab === tab.id ? "active" : ""} key={tab.id} onClick={() => onTabChange(tab.id)} type="button">
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="admin-metrics">
        {[
          { label: "模型供应商", value: `${apiModels.length}`, note: `${configuredModels} 个已填 API` },
          { label: "Skill 规则包", value: `${skills.length}`, note: `${userSkills.length} 个用户自建` },
          { label: "后台接口", value: `${configuredAdminApis}`, note: "9 个板块可单独配置" },
          { label: "视频项目", value: `${videoProjects.length}`, note: videoProjects.length > 0 ? "已有素材包记录" : "等待生成项目" },
          { label: "今日用量", value: "32,450", note: "剩余 67%" }
        ].map((metric) => (
          <article className="admin-metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.note}</small>
          </article>
        ))}
      </section>

      {activeTab === "overview" ? (
        <section className="admin-grid">
          <article className="admin-panel wide">
            <div className="admin-panel-title">
              <div>
                <strong>后台能力地图</strong>
                <span>先把管理对象定清楚，后面接真实数据库时不会乱。</span>
              </div>
            </div>
            <div className="admin-flow">
              {capabilityOrder.map((id) => (
                <button className={activeCapability === id ? "active" : ""} key={id} onClick={() => setActiveCapability(id)} type="button">
                  {capabilityPanels[id].label}
                </button>
              ))}
            </div>
            <section className="admin-capability-panel">
              <header>
                <div>
                  <strong>{activeCapabilityPanel.title}</strong>
                  <span>{activeCapabilityPanel.description}</span>
                </div>
                <button type="button" onClick={runCapabilityAction}>{activeCapabilityPanel.primaryAction}</button>
              </header>
              <div className="admin-capability-stats">
                {activeCapabilityPanel.stats.map((stat) => (
                  <span key={stat}>{stat}</span>
                ))}
              </div>
              {activeCapability !== "prompt" ? (
                <AdminApiSettings
                  title={activeCapabilityPanel.label}
                  config={activeApiConfig}
                  onChange={(next) => updateAdminApiConfig(activeCapability, next)}
                  onSave={() => saveAdminApiConfig(activeCapability)}
                  onTest={() => testAdminApiConfig(activeCapability)}
                />
              ) : null}
              {activeCapability === "adapter" ? (
                <ModuleAdapterBuilder
                  target={adapterDraft.target}
                  modelId={adapterDraft.modelId}
                  message={adapterSavedMessage}
                  onTargetChange={(target) => setAdapterDraft((current) => ({ ...current, target }))}
                  onModelChange={(modelId) => setAdapterDraft((current) => ({ ...current, modelId }))}
                  onSave={saveModuleAdapter}
                  onOpenModels={onOpenModels}
                />
              ) : null}
              {activeCapability === "prompt" ? (
                <AdminPromptTools
                  target={promptDraftTarget}
                  onDefault={() => onOpenSkillPicker(promptDraftTarget, "default")}
                  onImport={() => onOpenSkillPicker(promptDraftTarget, "upload")}
                  onManual={() => onOpenSkillPicker(promptDraftTarget, "prompt")}
                  onDownload={() => onOpenGithubSkillImport(promptDraftTarget)}
                  onTargetChange={setPromptDraftTarget}
                />
              ) : null}
              {activeCapability === "inspiration" ? (
                <InspirationRuleAdmin rules={defaultInspirationRules} />
              ) : null}
              {activeCapability === "adapter" ? (
                <div className="admin-table capability-admin-table">
                  {activeWorkflowRows.map((row) => (
                    <div key={row.id}>
                      <span>{row.label}</span>
                      <button className="admin-model-cell" type="button" onClick={() => onPickWorkflowModel(row.id)}>{row.model}</button>
                      <span>{row.apiState}</span>
                      <span>{row.skill}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="admin-table capability-admin-table">
                  {activeCapabilityPanel.rows.map((row) => (
                    <div key={row.join("-")}>
                      {row.map((cell) => <span key={cell}>{cell}</span>)}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </article>
          <article className="admin-panel">
            <div className="admin-panel-title">
              <strong>{activeCapabilityPanel.label}规则</strong>
            </div>
            <ul className="admin-check-list">
              {activeCapabilityPanel.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}

      {activeTab === "users" ? (
        <section className="admin-grid">
          <article className="admin-panel wide">
            <div className="admin-panel-title">
              <strong>用户与用量</strong>
              <button
                type="button"
                onClick={() => showAdminNotice("导出用量", ["已汇总用户、套餐、今日用量和最近活跃时间", "MVP 阶段可复制表格，后续接 CSV / Excel 导出", "导出操作需要写入后台审计日志"])}
              >
                导出用量
              </button>
            </div>
            <div className="admin-table">
              {[
                ["写作达人", "专业版", "28,500 / 50,000 字", "正常", "今天 10:32"],
                ["团队账号", "内测席位", "86,200 / 200,000 字", "正常", "昨天 21:18"],
                ["新用户", "试用版", "4,120 / 10,000 字", "接近阈值", "今天 09:06"]
              ].map((row) => (
                <div key={row.join("-")}>
                  {row.map((cell) => <span key={cell}>{cell}</span>)}
                </div>
              ))}
            </div>
          </article>
          <article className="admin-panel">
            <div className="admin-panel-title">
              <strong>用量规则</strong>
            </div>
            <ul className="admin-check-list">
              <li>按字数、图片、视频任务分别计量</li>
              <li>失败任务不扣除或按重试策略扣除</li>
              <li>超过阈值时暂停高成本成片任务</li>
            </ul>
          </article>
        </section>
      ) : null}

      {activeTab === "models" ? (
        <section className="admin-grid">
          <article className="admin-panel wide">
            <div className="admin-panel-title">
              <div>
                <strong>模型/API 配置</strong>
                <span>这里看全局接入情况；具体 Key 仍在模型弹窗里填写和测试。</span>
              </div>
              <button type="button" onClick={onOpenModels}>打开模型配置</button>
            </div>
            <ModuleAdapterBuilder
              target={adapterDraft.target}
              modelId={adapterDraft.modelId}
              message={adapterSavedMessage}
              onTargetChange={(target) => setAdapterDraft((current) => ({ ...current, target }))}
              onModelChange={(modelId) => setAdapterDraft((current) => ({ ...current, modelId }))}
              onSave={saveModuleAdapter}
              onOpenModels={onOpenModels}
            />
            <div className="admin-table model-admin-table">
              {apiModels.map((model) => (
                <div key={model.id}>
                  <span>{model.provider}</span>
                  <span>{model.name}</span>
                  <span>{model.envKey}</span>
                  <b>{modelCredentials[model.id]?.apiKey.trim() ? "已保存" : model.status}</b>
                </div>
              ))}
            </div>
          </article>
          <article className="admin-panel">
            <div className="admin-panel-title">
              <strong>模块默认模型</strong>
            </div>
            <div className="admin-stack-list">
              {activeWorkflowRows.map((row) => (
                <div key={row.id}>
                  <b>{row.label}</b>
                  <button className="admin-model-cell" type="button" onClick={() => onPickWorkflowModel(row.id)}>{row.model}</button>
                  <span>{row.apiState}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "jobs" ? (
        <section className="admin-grid">
          <article className="admin-panel wide">
            <div className="admin-panel-title">
              <strong>任务队列</strong>
              <button
                type="button"
                onClick={() => showAdminNotice("暂停低优先级任务", ["已标记分镜图片和成片素材包为低优先级队列", "文本写稿、润色和评估任务继续同步返回", "后续接 Redis 队列后会真正暂停待执行任务"])}
              >
                暂停低优先级任务
              </button>
            </div>
            <div className="admin-table">
              {queueRows.map((row) => (
                <div key={row.name}>
                  <span>{row.name}</span>
                  <span>{row.status}</span>
                  <span>{row.latency}</span>
                  <b>{row.success}</b>
                </div>
              ))}
            </div>
          </article>
          <article className="admin-panel">
            <div className="admin-panel-title">
              <strong>队列策略</strong>
            </div>
            <ul className="admin-check-list">
              <li>文本任务同步返回，视频任务异步排队</li>
              <li>同一用户限制并发任务数</li>
              <li>失败任务保留错误原因和重试次数</li>
            </ul>
          </article>
        </section>
      ) : null}

      {activeTab === "skills" ? (
        <section className="admin-grid">
          <article className="admin-panel wide">
            <div className="admin-panel-title">
              <strong>Skill 规则包</strong>
              <button type="button" onClick={() => onOpenSkillPicker("write", "prompt")}>新建 Prompt Skill</button>
            </div>
            <AdminPromptTools
              target={promptDraftTarget}
              onDefault={() => onOpenSkillPicker(promptDraftTarget, "default")}
              onImport={() => onOpenSkillPicker(promptDraftTarget, "upload")}
              onManual={() => onOpenSkillPicker(promptDraftTarget, "prompt")}
              onDownload={() => onOpenGithubSkillImport(promptDraftTarget)}
              onTargetChange={setPromptDraftTarget}
            />
            <div className="admin-table skill-admin-table">
              {activeWorkflowRows.map((row) => (
                <div key={row.id}>
                  <span>{row.label}</span>
                  <span>{row.skill}</span>
                  <span>{row.model}</span>
                  <b>{row.apiState}</b>
                </div>
              ))}
            </div>
          </article>
          <article className="admin-panel">
            <div className="admin-panel-title">
              <strong>规则来源</strong>
            </div>
            <div className="admin-stack-list">
              <div><b>默认 Skill</b><span>{skills.filter((skill) => !skill.isUser).length} 个</span></div>
              <div><b>上传 / Prompt</b><span>{userSkills.length} 个</span></div>
              <div><b>团队共享</b><span>待接权限系统</span></div>
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "billing" ? (
        <section className="admin-grid">
          <article className="admin-panel wide">
            <div className="admin-panel-title">
              <strong>计费与风控</strong>
              <button
                type="button"
                onClick={() => showAdminNotice("查看账单", ["已按文本、图片、视频任务拆分计费项", "当前是内测 MVP 估算口径，不会真实扣费", "后续可接 Stripe、微信支付或企业对公账单"])}
              >
                查看账单
              </button>
            </div>
            <div className="admin-billing-grid">
              {[
                ["文本生成", "0.8 元 / 万字", "按模型成本折算"],
                ["图片生成", "0.12 元 / 张", "分镜图片任务"],
                ["成片素材包", "按供应商任务计费", "后续接可灵 / Veo / Runway"],
                ["风控", "SSRF 防护已开启", "Endpoint 只允许公网 HTTPS"]
              ].map((row) => (
                <article key={row[0]}>
                  <strong>{row[0]}</strong>
                  <span>{row[1]}</span>
                  <small>{row[2]}</small>
                </article>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {adminNotice ? (
        <div className="modal-backdrop">
          <section className="modal-card library-operation-modal">
            <header>
              <div>
                <strong>{adminNotice.title}</strong>
                <span>{adminNotice.eyebrow}</span>
              </div>
              <button type="button" onClick={() => setAdminNotice(null)}>关闭</button>
            </header>
            <p>{adminNotice.body}</p>
            <div className="library-operation-list">
              {adminNotice.items.map((item) => (
                <article key={item}>
                  <CheckCircle2 size={16} />
                  <span>{item}</span>
                </article>
              ))}
            </div>
            <footer>
              <span className="modal-count">后台空按钮已改成可见动作。</span>
              <button className="primary" type="button" onClick={() => setAdminNotice(null)}>{adminNotice.primary}</button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export function Workbench() {
  const [activeSection, setActiveSection] = useState<SidebarKey>("workbench");
  const [adminTab, setAdminTab] = useState<AdminTab>("overview");
  const [skills, setSkills] = useState<Skill[]>(builtinSkills);
  const [activeSkills, setActiveSkills] = useState<ActiveSkills>(defaultSkills);
  const [activeBlockSkills, setActiveBlockSkills] = useState<ActiveBlockSkills>(defaultActiveBlockSkills);
  const [loading, setLoading] = useState<LoadingKey>(null);
  const [projectTitle, setProjectTitle] = useState("个人IP打造方法论");
  const [topic, setTopic] = useState("AI 写作的本质与未来趋势");
  const [style, setStyle] = useState("有判断、有细节、不过度包装");
  const [platform, setPlatform] = useState("公众号");
  const [length, setLength] = useState(1200);
  const [writePrompt, setWritePrompt] = useState("写一篇讲 AI 写作为什么会显得假的内容，要有具体场景、判断和反常识观点。");
  const [articleContent, setArticleContent] = useState("");
  const [workingContent, setWorkingContent] = useState("");
  const [writeDialogOpen, setWriteDialogOpen] = useState(false);
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [humanized, setHumanized] = useState<HumanizeResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [formatted, setFormatted] = useState<FormatResult | null>(null);
  const [videoPlatform, setVideoPlatform] = useState("抖音");
  const [videoType, setVideoType] = useState("真人口播");
  const [duration, setDuration] = useState("60 秒");
  const [selectedProvider, setSelectedProvider] = useState<VideoRenderProvider>("可灵");
  const [formatType, setFormatType] = useState("微信公众号版");
  const [formatFontSize, setFormatFontSize] = useState(16);
  const [formatColor, setFormatColor] = useState("#14213d");
  const [formatEditorOpen, setFormatEditorOpen] = useState(false);
  const [formatTitle, setFormatTitle] = useState("放弃公有云AI方案，就在今天！");
  const [formatEditorBody, setFormatEditorBody] = useState("");
  const [formatImageSrc, setFormatImageSrc] = useState<string | null>(null);
  const [core, setCore] = useState<CoreExtract | null>(null);
  const [script, setScript] = useState<VideoScript | null>(null);
  const [storyboard, setStoryboard] = useState<StoryboardRow[]>([]);
  const [storyboardImages, setStoryboardImages] = useState<StoryboardImageAsset[]>([]);
  const [imageStyle, setImageStyle] = useState("写实商业短视频，干净桌面，移动端竖屏构图");
  const [subtitles, setSubtitles] = useState<string[]>([]);
  const [assets, setAssets] = useState<VideoAssets | null>(null);
  const [videoProjects, setVideoProjects] = useState<VideoRenderProject[]>([]);
  const [inspirationSignals, setInspirationSignals] = useState<InspirationSignal[]>(fallbackInspirationSignals);
  const [inspirationScanMeta, setInspirationScanMeta] = useState("");
  const [trendRadarEndpoint, setTrendRadarEndpoint] = useState(defaultTrendRadarEndpoint);
  const [trendRadarStatus, setTrendRadarStatus] = useState("");
  const [moduleResults, setModuleResults] = useState<Record<string, ModuleResult>>({});
  const [activeResultId, setActiveResultId] = useState("write");
  const [viewer, setViewer] = useState<ResultViewer>(null);
  const [viewerBody, setViewerBody] = useState("");
  const [promptSkillDraft, setPromptSkillDraft] = useState<PromptSkillDraft>(null);
  const [githubSkillDraft, setGithubSkillDraft] = useState<GithubSkillDraft>(null);
  const [githubSkillLoading, setGithubSkillLoading] = useState(false);
  const [skillPicker, setSkillPicker] = useState<SkillPicker>(null);
  const [selectedModelId, setSelectedModelId] = useState(defaultApiModelId);
  const [activeApiModels, setActiveApiModels] = useState<ActiveApiModels>(defaultActiveApiModels);
  const [modelPickerModule, setModelPickerModule] = useState<WorkflowBlockId | null>(null);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [modelCapability, setModelCapability] = useState<ApiModelCapability | "all">("all");
  const [modelCredentials, setModelCredentials] = useState<Record<string, ApiModelCredential>>({});
  const [credentialDraft, setCredentialDraft] = useState<ApiModelCredential>(() => defaultCredentialFor(findApiModel(defaultApiModelId)));
  const [modelTestLoading, setModelTestLoading] = useState(false);
  const [modelTestResult, setModelTestResult] = useState<ModelTestResult>(null);
  const [storageReady, setStorageReady] = useState(false);
  const formatEditorRef = useRef<HTMLTextAreaElement | null>(null);

  const upstreamContent = useMemo(
    () => workingContent || moduleResults.humanize?.body || articleContent || moduleResults.write?.body || humanized?.content || draft?.content || "",
    [workingContent, moduleResults, articleContent, humanized, draft]
  );
  const currentContent = useMemo(() => formatted?.content || upstreamContent, [formatted, upstreamContent]);
  const humanizeInput = upstreamContent;
  const analyzeInput = upstreamContent;
  const formatInput = upstreamContent;
  const videoInput = useMemo(() => formatted?.content || upstreamContent, [formatted, upstreamContent]);
  const selectedApiModel = useMemo(() => findApiModel(selectedModelId), [selectedModelId]);
  const filteredApiModels = useMemo(() => {
    const keyword = modelSearch.trim().toLowerCase();
    return apiModels.filter((model) => {
      const capabilityMatched = modelCapability === "all" || model.capabilities.includes(modelCapability);
      const keywordMatched =
        keyword.length === 0 ||
        [model.provider, model.name, model.modelId, model.description, model.envKey]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      return capabilityMatched && keywordMatched;
    });
  }, [modelCapability, modelSearch]);
  const githubSkillSourcePreview = useMemo(
    () => githubSkillDraft ? parseGithubSkillSource(githubSkillDraft.repo, githubSkillDraft.branch, githubSkillDraft.path) : null,
    [githubSkillDraft]
  );
  const selectedCredential = modelCredentials[selectedApiModel.id];
  const modelConfigured = Boolean(selectedCredential?.apiKey.trim());
  const modelByBlock = (block: WorkflowBlockId) => findApiModel(activeApiModels[block] ?? defaultApiModelId);
  const modelConfiguredByBlock = (block: WorkflowBlockId) => Boolean(modelCredentials[modelByBlock(block).id]?.apiKey.trim());
  const modelRequestFor = (block: WorkflowBlockId) => {
    const model = modelByBlock(block);
    return {
      ...model,
      credential: modelCredentials[model.id]
    };
  };

  useEffect(() => {
    const parsedSkills = readJsonStorage(USER_SKILLS_STORAGE_KEY);
    const parsedActiveSkills = readJsonStorage(ACTIVE_SKILLS_STORAGE_KEY);
    const parsedActiveBlockSkills = readJsonStorage(ACTIVE_BLOCK_SKILLS_STORAGE_KEY);
    const rawModelId = localStorage.getItem(API_MODEL_STORAGE_KEY);
    const parsedActiveApiModels = readJsonStorage(ACTIVE_API_MODELS_STORAGE_KEY);
    const parsedModelCredentials = readJsonStorage(API_MODEL_CREDENTIALS_STORAGE_KEY);
    const storedTrendRadarEndpoint = localStorage.getItem(TRENDRADAR_ENDPOINT_STORAGE_KEY);

    if (Array.isArray(parsedSkills)) {
      const userSkills = parsedSkills.filter((skill) => isRecord(skill) && skill.id && isSkillModule(skill.module) && skill.name) as Skill[];
      setSkills([...builtinSkills, ...userSkills.filter((skill) => !builtinSkills.some((builtin) => builtin.id === skill.id))]);
    }

    if (isRecord(parsedActiveSkills)) {
      setActiveSkills(
        Object.fromEntries(
          skillModules.map((module) => [
            module,
            typeof parsedActiveSkills[module] === "string" ? parsedActiveSkills[module] : defaultSkills[module]
          ])
        ) as ActiveSkills
      );
    }

    if (isRecord(parsedActiveBlockSkills)) {
      const validActiveBlockSkills = Object.fromEntries(
        workflowBlocks.map((block) => [
          block.id,
          typeof parsedActiveBlockSkills[block.id] === "string" ? parsedActiveBlockSkills[block.id] : defaultSkills[block.module]
        ])
      ) as ActiveBlockSkills;
      setActiveBlockSkills(validActiveBlockSkills);
    } else if (isRecord(parsedActiveSkills)) {
      setActiveBlockSkills(
        Object.fromEntries(
          workflowBlocks.map((block) => {
            const storedSkillId = parsedActiveSkills[block.module];
            return [block.id, typeof storedSkillId === "string" ? storedSkillId : defaultSkills[block.module]];
          })
        ) as ActiveBlockSkills
      );
    }

    if (rawModelId) {
      setSelectedModelId(normalizeApiModelId(rawModelId));
    }

    if (isRecord(parsedActiveApiModels)) {
      const validActiveModels = Object.fromEntries(
        workflowBlocks.map((block) => {
          const legacyModuleModel = parsedActiveApiModels[block.module];
          const storedModelId = parsedActiveApiModels[block.id] ?? legacyModuleModel;
          return [block.id, normalizeApiModelId(typeof storedModelId === "string" ? storedModelId : undefined)];
        })
      ) as ActiveApiModels;
      setActiveApiModels(validActiveModels);
    }

    if (isRecord(parsedModelCredentials)) {
      setModelCredentials(parsedModelCredentials as Record<string, ApiModelCredential>);
    }

    if (storedTrendRadarEndpoint?.trim()) {
      setTrendRadarEndpoint(storedTrendRadarEndpoint.trim());
    }

    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(USER_SKILLS_STORAGE_KEY, JSON.stringify(skills.filter((skill) => skill.isUser)));
  }, [skills, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(ACTIVE_SKILLS_STORAGE_KEY, JSON.stringify(activeSkills));
  }, [activeSkills, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(ACTIVE_BLOCK_SKILLS_STORAGE_KEY, JSON.stringify(activeBlockSkills));
  }, [activeBlockSkills, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(API_MODEL_STORAGE_KEY, selectedApiModel.id);
  }, [selectedApiModel.id, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(ACTIVE_API_MODELS_STORAGE_KEY, JSON.stringify(activeApiModels));
  }, [activeApiModels, storageReady]);

  useEffect(() => {
    setCredentialDraft(modelCredentials[selectedApiModel.id] ?? defaultCredentialFor(selectedApiModel));
  }, [modelCredentials, selectedApiModel]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(API_MODEL_CREDENTIALS_STORAGE_KEY, JSON.stringify(modelCredentials));
  }, [modelCredentials, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(TRENDRADAR_ENDPOINT_STORAGE_KEY, trendRadarEndpoint.trim() || defaultTrendRadarEndpoint);
  }, [trendRadarEndpoint, storageReady]);

  const skillsForModule = (module: SkillModule) => skills.filter((skill) => skill.module === module);

  const skillsForSource = (module: SkillModule, source: SkillSource) =>
    skillsForModule(module).filter((skill) => skillSource(skill) === source);

  const selectedSkillByModule = (module: SkillModule) => {
    const id = activeSkills[module as keyof ActiveSkills];
    const moduleSkills = skillsForModule(module);
    return moduleSkills.find((skill) => skill.id === id) ?? moduleSkills[0];
  };

  const selectedSkillByBlock = (block: WorkflowBlockId) => {
    const module = workflowBlockModule(block);
    const moduleSkills = skillsForModule(module);
    const blockSkill = moduleSkills.find((skill) => skill.id === activeBlockSkills[block]);
    return blockSkill ?? selectedSkillByModule(module);
  };

  const skillRequest = (module: SkillModule, block: WorkflowBlockId = module === "video" ? "video" : module) => {
    const skill = selectedSkillByBlock(block);
    return { skillId: skill?.id, skill, model: modelRequestFor(block) };
  };

  const selectApiModel = (id: string) => {
    const model = findApiModel(id);
    setSelectedModelId(model.id);
    setCredentialDraft(modelCredentials[model.id] ?? defaultCredentialFor(model));
    setModelTestResult(null);
  };

  const openModuleModelPicker = (block: WorkflowBlockId | null) => {
    setModelPickerModule(block);
    const modelId = block ? activeApiModels[block] : selectedModelId;
    selectApiModel(modelId);
    setModelDialogOpen(true);
  };

  const useCurrentModel = () => {
    if (modelPickerModule) {
      setActiveApiModels((current) => ({ ...current, [modelPickerModule]: selectedApiModel.id }));
    }
    setModelDialogOpen(false);
  };

  const saveModelCredential = () => {
    setModelCredentials((current) => ({
      ...current,
      [selectedApiModel.id]: {
        apiKey: credentialDraft.apiKey.trim(),
        endpoint: credentialDraft.endpoint.trim() || selectedApiModel.endpoint,
        modelId: credentialDraft.modelId.trim() || selectedApiModel.modelId,
        secretId: credentialDraft.secretId.trim(),
        organization: credentialDraft.organization.trim()
      }
    }));
    setModelTestResult({ ok: true, message: "API 配置已保存，点击“测试连接”可验证是否连通。" });
  };

  const clearModelCredential = () => {
    setModelCredentials((current) => {
      const next = { ...current };
      delete next[selectedApiModel.id];
      return next;
    });
    setCredentialDraft(defaultCredentialFor(selectedApiModel));
    setModelTestResult(null);
  };

  const testModelConnection = async () => {
    setModelTestLoading(true);
    setModelTestResult(null);
    try {
      const response = await fetch("/api/model/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: {
            ...selectedApiModel,
            credential: credentialDraft
          }
        })
      });
      const result = (await response.json()) as NonNullable<ModelTestResult>;
      setModelTestResult(result);
    } catch (error) {
      setModelTestResult({
        ok: false,
        message: error instanceof Error ? error.message : "连接测试失败"
      });
    } finally {
      setModelTestLoading(false);
    }
  };

  const scanInspiration = async () => {
    setLoading("inspiration");
    try {
      const result = await postJson<InspirationScanResult>("/api/inspiration/scan", {
        scope: "全球最新热点信息",
        rules: defaultInspirationRules,
        limit: 20,
        locale: "zh-CN"
      });
      setInspirationSignals(result.signals);
      setInspirationScanMeta(`${result.summary} · ${result.scannedAt}`);
    } catch (error) {
      setInspirationSignals(fallbackInspirationSignals);
      setInspirationScanMeta(error instanceof Error ? error.message : "热点扫描失败，已显示兜底灵感卡片");
    } finally {
      setLoading(null);
    }
  };

  const testTrendRadar = async () => {
    setLoading("trendradar");
    setTrendRadarStatus("正在测试 TrendRadar MCP ...");
    try {
      const result = await postJson<{ ok: boolean; message: string; endpoint?: string; tools?: string[] }>("/api/inspiration/trendradar", {
        endpoint: trendRadarEndpoint
      });
      setTrendRadarStatus(
        result.ok
          ? `${result.message} 已识别工具：${(result.tools ?? []).slice(0, 4).join("、")}`
          : result.message
      );
    } catch (error) {
      setTrendRadarStatus(error instanceof Error ? error.message : "TrendRadar 测试失败");
    } finally {
      setLoading(null);
    }
  };

  const getUpstreamContent = () =>
    workingContent || moduleResults.humanize?.body || articleContent || moduleResults.write?.body || humanized?.content || draft?.content || "";

  const setBlockSkill = (target: WorkflowBlockId, id: string) => {
    const module = workflowBlockModule(target);
    if (!skills.some((skill) => skill.module === module && skill.id === id)) return;
    setActiveBlockSkills((current) => ({ ...current, [target]: id }));
    setActiveSkills((current) => ({ ...current, [module]: id }));
  };

  const chooseSkill = (target: WorkflowBlockId, id: string) => {
    setBlockSkill(target, id);
    setSkillPicker(null);
  };

  const editSkill = (skill: Skill) => {
    setSkillPicker(null);
    setPromptSkillDraft({
      id: skill.isUser ? skill.id : undefined,
      target: skillPicker?.target ?? defaultWorkflowBlockForModule(skill.module),
      module: skill.module,
      name: skill.isUser ? skill.name : `${skill.name} 副本`,
      description: skill.isUser ? skill.description : `基于「${skill.name}」复制修改`,
      prompt: skill.prompt
    });
  };

  const deleteSkill = (skill: Skill) => {
    if (!skill.isUser) return;
    const confirmed = window.confirm(`确定删除「${skill.name}」吗？删除后无法从当前浏览器本地恢复。`);
    if (!confirmed) return;
    const nextSkills = skills.filter((item) => item.id !== skill.id);
    const fallbackSkill = nextSkills.find((item) => item.module === skill.module && !item.isUser) ?? nextSkills.find((item) => item.module === skill.module);
    const nextActiveSkills = activeSkills[skill.module] === skill.id && fallbackSkill
      ? { ...activeSkills, [skill.module]: fallbackSkill.id }
      : activeSkills;
    const nextActiveBlockSkills = Object.fromEntries(
      workflowBlocks.map((block) => [
        block.id,
        activeBlockSkills[block.id] === skill.id && fallbackSkill && block.module === skill.module
          ? fallbackSkill.id
          : activeBlockSkills[block.id]
      ])
    ) as ActiveBlockSkills;
    setSkills(nextSkills);
    setActiveSkills(nextActiveSkills);
    setActiveBlockSkills(nextActiveBlockSkills);
    localStorage.setItem(USER_SKILLS_STORAGE_KEY, JSON.stringify(nextSkills.filter((item) => item.isUser)));
    localStorage.setItem(ACTIVE_SKILLS_STORAGE_KEY, JSON.stringify(nextActiveSkills));
    localStorage.setItem(ACTIVE_BLOCK_SKILLS_STORAGE_KEY, JSON.stringify(nextActiveBlockSkills));
  };

  const recordResult = (id: string, result: ModuleResult) => {
    setModuleResults((current) => ({ ...current, [id]: result }));
    setActiveResultId(id);
  };

  const recordError = (id: string, error: unknown) => {
    recordResult(id, {
      title: "运行失败",
      body: error instanceof Error ? error.message : "未知错误",
      meta: "请确认本地服务和 API 路由正常"
    });
  };

  const resetGeneratedAfterWrite = () => {
    setHumanized(null);
    setAnalysis(null);
    setFormatted(null);
    setFormatEditorOpen(false);
    setCore(null);
    setScript(null);
    setStoryboard([]);
    setStoryboardImages([]);
    setSubtitles([]);
    setAssets(null);
    setVideoProjects([]);
    setModuleResults({});
  };

  const resetGeneratedAfterHumanize = () => {
    setAnalysis(null);
    setFormatted(null);
    setFormatEditorOpen(false);
    setCore(null);
    setScript(null);
    setStoryboard([]);
    setStoryboardImages([]);
    setSubtitles([]);
    setAssets(null);
    setVideoProjects([]);
    setModuleResults((current) => ({ write: current.write }));
  };

  const openResultViewer = (id: string, editable = false) => {
    const result = moduleResults[id];
    if (!result) return;
    const isAnalyze = id === "analyze";
    setActiveResultId(id);
    setViewer({ id, title: result.title, body: result.body, editable: isAnalyze || editable });
    setViewerBody(isAnalyze ? getUpstreamContent() : result.body);
  };

  const setFormatDraftContent = (content: string, title = projectTitle) => {
    const lines = content.split("\n");
    const firstLine = lines.find((line) => line.trim().length > 0) ?? title;
    const firstIsHeading = /^#+\s/.test(firstLine.trim());
    const cleanTitle = firstIsHeading ? firstLine.replace(/^#+\s*/, "").trim() || title : title;
    const body = firstIsHeading
      ? lines
          .filter((line, index) => index !== lines.indexOf(firstLine))
          .join("\n")
          .trim()
      : content;
    setFormatTitle(cleanTitle);
    setFormatEditorBody(body || content);
  };

  const replaceFormatWithContent = (content: string, reason: string) => {
    const result: FormatResult = {
      content,
      format: formatType,
      notes: [reason, `字号 ${formatFontSize}px`, `颜色 ${formatColor}`]
    };
    setFormatted(result);
    setFormatDraftContent(content, projectTitle);
    setModuleResults((current) => ({
      ...current,
      format: {
        title: `${formatType} 已同步修改`,
        body: content,
        meta: result.notes.join(" · ")
      }
    }));
  };

  const saveViewerBody = () => {
    if (!viewer) return;
    if (viewer.id === "script" && script) {
      const nextScript = { ...script, selected: viewerBody };
      setScript(nextScript);
      recordResult("script", {
        title: script.title,
        body: viewerBody,
        meta: "已手动修改脚本"
      });
    } else if (viewer.id === "analyze") {
      setArticleContent(viewerBody);
      setWorkingContent(viewerBody);
      setHumanized(null);
      setAnalysis(null);
      replaceFormatWithContent(viewerBody, "来自 AI 痕迹评估修改");
      recordResult("analyze", {
        title: "评估标注修改已保存",
        body: viewerBody,
        meta: "已同步替换排版内容，可重新开始评估"
      });
    } else if (viewer.id === "manual" || viewer.id === "humanize" || viewer.id === "write") {
      setArticleContent(viewerBody);
      setWorkingContent(viewerBody);
      setHumanized(null);
      setAnalysis(null);
      setFormatted(null);
      setFormatEditorOpen(false);
      recordResult(viewer.id === "manual" ? "humanize" : viewer.id, {
        title: "手动改写内容",
        body: viewerBody,
        meta: "已保存为后续流程输入"
      });
    } else {
      recordResult(viewer.id, {
        title: viewer.title,
        body: viewerBody,
        meta: "已手动修改"
      });
    }
    setViewer(null);
  };

  const openFormatEditor = (content: string, title = projectTitle) => {
    setFormatDraftContent(content, title);
    setFormatEditorOpen(true);
  };

  const wrapEditorSelection = (prefix: string, suffix = prefix) => {
    const editor = formatEditorRef.current;
    if (!editor) {
      setFormatEditorBody((current) => `${current}${prefix}${suffix}`);
      return;
    }

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = formatEditorBody.slice(start, end);
    const next = `${formatEditorBody.slice(0, start)}${prefix}${selected || "文字"}${suffix}${formatEditorBody.slice(end)}`;
    setFormatEditorBody(next);
    window.setTimeout(() => {
      editor.focus();
      editor.setSelectionRange(start + prefix.length, start + prefix.length + (selected || "文字").length);
    }, 0);
  };

  const insertEditorLine = (prefix: string) => {
    const editor = formatEditorRef.current;
    if (!editor) {
      setFormatEditorBody((current) => `${current}\n${prefix}`);
      return;
    }
    const start = editor.selectionStart;
    const next = `${formatEditorBody.slice(0, start)}\n${prefix}${formatEditorBody.slice(start)}`;
    setFormatEditorBody(next);
    window.setTimeout(() => {
      editor.focus();
      editor.setSelectionRange(start + prefix.length + 1, start + prefix.length + 1);
    }, 0);
  };

  const saveFormatEditor = () => {
    const content = `# ${formatTitle}\n\n${formatEditorBody}`.trim();
    const result: FormatResult = {
      content,
      format: formatType,
      notes: [`字号 ${formatFontSize}px`, `颜色 ${formatColor}`, formatImageSrc ? "已插入图片" : "无插图"]
    };
    setFormatted(result);
    recordResult("format", {
      title: `${formatType} 已保存`,
      body: content,
      meta: result.notes.join(" · ")
    });
    setActiveResultId("format");
  };

  const copyFormatEditor = async () => {
    const imageText = formatImageSrc ? "\n\n[已插入图片]\n" : "";
    await navigator.clipboard.writeText(`# ${formatTitle}\n\n${formatEditorBody}${imageText}`);
  };

  const handleFormatImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFormatImageSrc(URL.createObjectURL(file));
    insertEditorLine(`![${file.name}](插入图片)`);
    event.target.value = "";
  };

  const addSkill = (skill: Skill, target = defaultWorkflowBlockForModule(skill.module)) => {
    const nextSkills = [...skills.filter((item) => item.id !== skill.id), skill];
    const nextActiveSkills = { ...activeSkills, [skill.module]: skill.id };
    const nextActiveBlockSkills = { ...activeBlockSkills, [target]: skill.id };
    setSkills(nextSkills);
    setActiveSkills(nextActiveSkills);
    setActiveBlockSkills(nextActiveBlockSkills);
    localStorage.setItem(USER_SKILLS_STORAGE_KEY, JSON.stringify(nextSkills.filter((item) => item.isUser)));
    localStorage.setItem(ACTIVE_SKILLS_STORAGE_KEY, JSON.stringify(nextActiveSkills));
    localStorage.setItem(ACTIVE_BLOCK_SKILLS_STORAGE_KEY, JSON.stringify(nextActiveBlockSkills));
  };

  const handleSkillFile = async (event: ChangeEvent<HTMLInputElement>, target: WorkflowBlockId) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const module = workflowBlockModule(target);

    try {
      const parsed = JSON.parse(text) as Partial<Skill>;
      const parsedModule = isSkillModule(parsed.module) ? parsed.module : module;
      const parsedTarget = parsedModule === module ? target : defaultWorkflowBlockForModule(parsedModule);
      addSkill({
        id: parsed.id || `user-${module}-${Date.now()}`,
        name: parsed.name || file.name.replace(/\.(skill|json|yaml|yml|md)$/i, ""),
        module: parsedModule,
        description: parsed.description || "用户上传 Skill",
        rules: Array.isArray(parsed.rules) ? parsed.rules : [],
        prompt: parsed.prompt || text,
        isUser: true
      }, parsedTarget);
    } catch {
      const lines = text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
      addSkill({
        id: `user-${module}-${Date.now()}`,
        name: file.name.replace(/\.(skill|json|yaml|yml|md)$/i, ""),
        module,
        description: "用户上传 Skill",
        rules: lines.slice(0, 8),
        prompt: text,
        isUser: true
      }, target);
    }

    event.target.value = "";
    setSkillPicker(null);
  };

  const addPromptSkill = (target: WorkflowBlockId) => {
    const module = workflowBlockModule(target);
    setSkillPicker(null);
    setPromptSkillDraft({
      target,
      module,
      name: "自定义Prompt Skill",
      description: "从自定义 Prompt 创建",
      prompt: ""
    });
  };

  const openGithubSkillImport = (target: WorkflowBlockId) => {
    const module = workflowBlockModule(target);
    setSkillPicker(null);
    setGithubSkillLoading(false);
    setGithubSkillDraft({
      module,
      target,
      repo: "",
      branch: "main",
      path: "SKILL.md",
      name: "",
      description: "从 GitHub 仓库下载导入",
      status: ""
    });
  };

  const saveGithubSkill = async () => {
    if (!githubSkillDraft) return;
    const source = parseGithubSkillSource(githubSkillDraft.repo, githubSkillDraft.branch, githubSkillDraft.path);
    if (!source) {
      setGithubSkillDraft({ ...githubSkillDraft, status: "请填写正确的 GitHub 仓库和 Skill 路径，例如 owner/repo + SKILL.md。" });
      return;
    }

    setGithubSkillLoading(true);
    setGithubSkillDraft({ ...githubSkillDraft, status: "正在从 GitHub 读取 Skill 文件..." });
    try {
      const response = await fetch(source.rawUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`GitHub 返回 ${response.status}，请确认仓库公开、分支和路径正确。`);
      }
      const text = await response.text();
      const lines = text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
      let parsed: Partial<Skill> | null = null;
      if (source.path.endsWith(".json") || text.trim().startsWith("{")) {
        try {
          parsed = JSON.parse(text) as Partial<Skill>;
        } catch {
          parsed = null;
        }
      }
      const headingName = lines.find((line) => line.startsWith("#"))?.replace(/^#+\s*/, "").trim();
      const fileName = source.path.split("/").pop()?.replace(/\.(skill|json|yaml|yml|md)$/i, "");
      const parsedRules = Array.isArray(parsed?.rules) ? parsed.rules.filter((rule): rule is string => typeof rule === "string") : [];
      const prompt = typeof parsed?.prompt === "string" && parsed.prompt.trim() ? parsed.prompt : text;
      addSkill({
        id: `github-${githubSkillDraft.target}-${Date.now()}`,
        name: githubSkillDraft.name.trim() || parsed?.name || headingName || fileName || "GitHub Skill",
        module: githubSkillDraft.module,
        description: githubSkillDraft.description.trim() || parsed?.description || `从 ${source.repo} 下载导入`,
        rules: [
          `GitHub: ${source.repo}`,
          `路径: ${source.path}`,
          `分支: ${source.branch}`,
          ...parsedRules,
          ...lines.filter((line) => !line.startsWith("#")).slice(0, 8)
        ].slice(0, 10),
        prompt,
        isUser: true
      }, githubSkillDraft.target);
      setGithubSkillDraft(null);
    } catch (error) {
      setGithubSkillDraft({
        ...githubSkillDraft,
        repo: source.repo,
        branch: source.branch,
        path: source.path,
        status: error instanceof Error ? error.message : "GitHub Skill 下载失败"
      });
    } finally {
      setGithubSkillLoading(false);
    }
  };

  const savePromptSkill = () => {
    if (!promptSkillDraft?.prompt.trim()) return;
    const text = promptSkillDraft.prompt;
    const fallbackName = text
      .split(/\n+/)
      .map((line) => line.trim())
      .find(Boolean)
      ?.slice(0, 18);
    addSkill({
      id: promptSkillDraft.id ?? `prompt-${promptSkillDraft.target}-${Date.now()}`,
      name: promptSkillDraft.name.trim() || fallbackName || "自定义Prompt Skill",
      module: promptSkillDraft.module,
      description: promptSkillDraft.description.trim() || "从自定义 Prompt 创建",
      rules: text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 8),
      prompt: text,
      isUser: true
    }, promptSkillDraft.target);
    setPromptSkillDraft(null);
  };

  const runWrite = async () => {
    setLoading("write");
    try {
      const result = await postJson<DraftResult>("/api/write", {
        topic,
        style,
        platform,
        length,
        brief: writePrompt,
        ...skillRequest("write", "write")
      });
      setDraft(result);
      setArticleContent(result.content);
      setWorkingContent(result.content);
      resetGeneratedAfterWrite();
      recordResult("write", {
        title: result.title,
        body: result.content,
        meta: `${result.wordCount} 字 · ${result.usedSkill}`
      });
      setWriteDialogOpen(false);
    } catch (error) {
      recordError("write", error);
    } finally {
      setLoading(null);
    }
  };

  const runHumanize = async () => {
    const input = getUpstreamContent();
    setLoading("humanize");
    try {
      const result = await postJson<HumanizeResult>("/api/humanize", {
        content: input,
        ...skillRequest("humanize", "humanize")
      });
      setHumanized(result);
      setWorkingContent(result.content);
      resetGeneratedAfterHumanize();
      recordResult("humanize", {
        title: "反AI润色完成",
        body: result.content,
        meta: result.changes.join(" · ")
      });
    } catch (error) {
      recordError("humanize", error);
    } finally {
      setLoading(null);
    }
  };

  const runAnalyze = async () => {
    const input = getUpstreamContent();
    setLoading("analyze");
    try {
      const result = await postJson<AnalysisResult>("/api/analyze", {
        content: input,
        platform,
        ...skillRequest("analyze", "analyze")
      });
      setAnalysis(result);
      recordResult("analyze", {
        title: `${result.level} · ${result.overall}%`,
        body: `${result.summary}\n\n已评估正文预览：${input.slice(0, 160)}${input.length > 160 ? "..." : ""}`,
        meta: `读取 ${Array.from(input.replace(/\s/g, "")).length} 字 · ${result.items
          .slice(0, 4)
          .map((item) => `${item.label} ${item.score}`)
          .join(" · ")}`
      });
    } catch (error) {
      recordError("analyze", error);
    } finally {
      setLoading(null);
    }
  };

  const generateFormatFor = async (target: string) => {
    const input = getUpstreamContent();
    setFormatType(target);
    setLoading("format");
    try {
      const result = await postJson<FormatResult>("/api/format", {
        content: input,
        format: target,
        ...skillRequest("format", "format")
      });
      setFormatted(result);
      recordResult("format", {
        title: `${result.format} 已生成`,
        body: result.content,
        meta: result.notes.join(" · ")
      });
      openFormatEditor(result.content, projectTitle);
    } catch (error) {
      recordError("format", error);
    } finally {
      setLoading(null);
    }
  };

  const runFormat = async () => {
    await generateFormatFor(formatType);
  };

  const runCore = async () => {
    setLoading("core");
    try {
      const result = await postJson<CoreExtract>("/api/article/extract-core", {
        content: videoInput,
        platform: videoPlatform,
        videoType,
        duration,
        ...skillRequest("video", "core")
      });
      setCore(result);
      recordResult("core", {
        title: result.hook,
        body: result.coreViewpoint,
        meta: `${result.bestFormat} · ${result.recommendedDuration}`
      });
    } catch (error) {
      recordError("core", error);
    } finally {
      setLoading(null);
    }
  };

  const ensureCore = async () => {
    if (core) return core;
    const result = await postJson<CoreExtract>("/api/article/extract-core", {
      content: videoInput,
      platform: videoPlatform,
      videoType,
      duration,
      ...skillRequest("video", "core")
    });
    setCore(result);
    return result;
  };

  const ensureScript = async () => {
    if (script) return script;
    const nextCore = await ensureCore();
    const result = await postJson<VideoScript>("/api/video/script", {
      core: nextCore,
      platform: videoPlatform,
      videoType,
      duration,
      ...skillRequest("video", "script")
    });
    setScript(result);
    return result;
  };

  const runScript = async () => {
    setLoading("script");
    try {
      const result = await ensureScript();
      recordResult("script", {
        title: result.title,
        body: result.selected,
        meta: result.duration
      });
    } catch (error) {
      recordError("script", error);
    } finally {
      setLoading(null);
    }
  };

  const runStoryboard = async () => {
    setLoading("storyboard");
    try {
      const nextCore = await ensureCore();
      const nextScript = await ensureScript();
      const result = await postJson<StoryboardRow[]>("/api/video/storyboard", {
        script: nextScript,
        core: nextCore,
        ...skillRequest("video", "storyboard")
      });
      setStoryboard(result);
      recordResult("storyboard", {
        title: `分镜表 · ${result.length} 个镜头`,
        body: result.map((row) => `镜头 ${row.shot}：${row.visual}（${row.seconds}s）`).join("\n"),
        meta: "画面描述 · 字幕 · 时长"
      });
    } catch (error) {
      recordError("storyboard", error);
    } finally {
      setLoading(null);
    }
  };

  const runStoryboardImages = async () => {
    setLoading("images");
    try {
      let nextStoryboard = storyboard;
      if (nextStoryboard.length === 0) {
        const nextCore = await ensureCore();
        const nextScript = await ensureScript();
        nextStoryboard = await postJson<StoryboardRow[]>("/api/video/storyboard", {
          script: nextScript,
          core: nextCore,
          ...skillRequest("video", "storyboard")
        });
        setStoryboard(nextStoryboard);
      }
      const result = await postJson<StoryboardImageAsset[]>("/api/video/storyboard-images", {
        storyboard: nextStoryboard,
        style: imageStyle,
        model: modelRequestFor("storyboard")
      });
      setStoryboardImages(result);
      recordResult("storyboard", {
        title: `分镜图片提示词 · ${result.length} 张`,
        body: result.map((item) => `镜头 ${item.shot}\n${item.prompt}`).join("\n\n"),
        meta: "已生成图片 API 请求内容，等待接入真实图像模型"
      });
    } catch (error) {
      recordError("storyboard", error);
    } finally {
      setLoading(null);
    }
  };

  const runSubtitle = async () => {
    setLoading("subtitle");
    try {
      const nextScript = await ensureScript();
      const result = await postJson<string[]>("/api/video/subtitle", {
        script: nextScript,
        speed: "normal",
        model: modelRequestFor("subtitle")
      });
      setSubtitles(result);
      recordResult("subtitle", {
        title: `字幕已生成 · ${result.length} 条`,
        body: result.join("\n"),
        meta: "可继续进入配音和剪辑"
      });
    } catch (error) {
      recordError("subtitle", error);
    } finally {
      setLoading(null);
    }
  };

  const runAssets = async () => {
    setLoading("assets");
    try {
      const nextCore = await ensureCore();
      const result = await postJson<VideoAssets>("/api/video/assets", {
        core: nextCore,
        platform: videoPlatform,
        videoType,
        model: modelRequestFor("cover")
      });
      setAssets(result);
      recordResult("cover", {
        title: result.coverTitles[0] ?? "封面标题已生成",
        body: `${result.platformTitles.join("\n")}\n\n${result.publishCopy}`,
        meta: result.tags.map((tag) => `#${tag}`).join(" ")
      });
    } catch (error) {
      recordError("cover", error);
    } finally {
      setLoading(null);
    }
  };

  const createVideoProject = async () => {
    setLoading("render");
    try {
      const nextCore = await ensureCore();
      const nextScript = await ensureScript();
      const [nextStoryboard, nextSubtitles, nextAssets] = await Promise.all([
        storyboard.length > 0
          ? Promise.resolve(storyboard)
          : postJson<StoryboardRow[]>("/api/video/storyboard", { script: nextScript, core: nextCore, ...skillRequest("video", "storyboard") }),
        subtitles.length > 0 ? Promise.resolve(subtitles) : postJson<string[]>("/api/video/subtitle", { script: nextScript, speed: "normal", model: modelRequestFor("subtitle") }),
        assets ? Promise.resolve(assets) : postJson<VideoAssets>("/api/video/assets", { core: nextCore, platform: videoPlatform, videoType, model: modelRequestFor("cover") })
      ]);
      setStoryboard(nextStoryboard);
      setSubtitles(nextSubtitles);
      setAssets(nextAssets);
      const project = await postJson<VideoRenderProject>("/api/video/render", {
        core: nextCore,
        script: nextScript,
        storyboard: nextStoryboard,
        subtitles: nextSubtitles,
        assets: nextAssets,
        platform: videoPlatform,
        videoType,
        duration,
        provider: selectedProvider,
        model: modelRequestFor("video")
      });
      setVideoProjects((current) => [project, ...current]);
      recordResult("video", {
        title: project.name,
        body: `${project.provider} · ${project.status}\n${project.inputs.join(" / ")}`,
        meta: `项目进度 ${project.progress}%`
      });
    } catch (error) {
      recordError("video", error);
    } finally {
      setLoading(null);
    }
  };

  const runFullWorkflow = async () => {
    setLoading("pipeline");
    try {
      const nextDraft = await postJson<DraftResult>("/api/write", {
        topic,
        style,
        platform,
        length,
        brief: writePrompt,
        ...skillRequest("write", "write")
      });
      setDraft(nextDraft);
      setArticleContent(nextDraft.content);
      setWorkingContent(nextDraft.content);
      recordResult("write", {
        title: nextDraft.title,
        body: nextDraft.content,
        meta: `${nextDraft.wordCount} 字 · ${nextDraft.usedSkill}`
      });

      const nextHumanized = await postJson<HumanizeResult>("/api/humanize", {
        content: nextDraft.content,
        ...skillRequest("humanize", "humanize")
      });
      setHumanized(nextHumanized);
      setWorkingContent(nextHumanized.content);
      recordResult("humanize", {
        title: "反AI润色完成",
        body: nextHumanized.content,
        meta: nextHumanized.changes.join(" · ")
      });

      const [nextAnalysis, nextFormatted, nextCore] = await Promise.all([
        postJson<AnalysisResult>("/api/analyze", {
          content: nextHumanized.content,
          platform,
          ...skillRequest("analyze", "analyze")
        }),
        postJson<FormatResult>("/api/format", {
          content: nextHumanized.content,
          format: formatType,
          ...skillRequest("format", "format")
        }),
        postJson<CoreExtract>("/api/article/extract-core", {
          content: nextHumanized.content,
          platform: videoPlatform,
          videoType,
          duration,
          ...skillRequest("video", "core")
        })
      ]);
      setAnalysis(nextAnalysis);
      setFormatted(nextFormatted);
      setCore(nextCore);
      recordResult("analyze", {
        title: `${nextAnalysis.level} · ${nextAnalysis.overall}%`,
        body: `${nextAnalysis.summary}\n\n已评估正文预览：${nextHumanized.content.slice(0, 160)}${nextHumanized.content.length > 160 ? "..." : ""}`,
        meta: `读取 ${Array.from(nextHumanized.content.replace(/\s/g, "")).length} 字 · ${nextAnalysis.items
          .slice(0, 4)
          .map((item) => `${item.label} ${item.score}`)
          .join(" · ")}`
      });
      recordResult("format", {
        title: `${nextFormatted.format} 已生成`,
        body: nextFormatted.content,
        meta: nextFormatted.notes.join(" · ")
      });
      recordResult("core", {
        title: nextCore.hook,
        body: nextCore.coreViewpoint,
        meta: `${nextCore.bestFormat} · ${nextCore.recommendedDuration}`
      });

      const nextScript = await postJson<VideoScript>("/api/video/script", {
        core: nextCore,
        platform: videoPlatform,
        videoType,
        duration,
        ...skillRequest("video", "script")
      });
      setScript(nextScript);
      recordResult("script", {
        title: nextScript.title,
        body: nextScript.selected,
        meta: nextScript.duration
      });

      const [nextStoryboard, nextSubtitles, nextAssets] = await Promise.all([
        postJson<StoryboardRow[]>("/api/video/storyboard", { script: nextScript, core: nextCore, ...skillRequest("video", "storyboard") }),
        postJson<string[]>("/api/video/subtitle", { script: nextScript, speed: "normal", model: modelRequestFor("subtitle") }),
        postJson<VideoAssets>("/api/video/assets", { core: nextCore, platform: videoPlatform, videoType, model: modelRequestFor("cover") })
      ]);
      setStoryboard(nextStoryboard);
      setSubtitles(nextSubtitles);
      setAssets(nextAssets);
      recordResult("storyboard", {
        title: `分镜表 · ${nextStoryboard.length} 个镜头`,
        body: nextStoryboard.map((row) => `镜头 ${row.shot}：${row.visual}（${row.seconds}s）`).join("\n"),
        meta: "画面描述 · 字幕 · 时长"
      });
      recordResult("subtitle", {
        title: `字幕已生成 · ${nextSubtitles.length} 条`,
        body: nextSubtitles.join("\n"),
        meta: "可继续进入配音和剪辑"
      });
      recordResult("cover", {
        title: nextAssets.coverTitles[0] ?? "封面标题已生成",
        body: `${nextAssets.platformTitles.join("\n")}\n\n${nextAssets.publishCopy}`,
        meta: nextAssets.tags.map((tag) => `#${tag}`).join(" ")
      });

      const project = await postJson<VideoRenderProject>("/api/video/render", {
        core: nextCore,
        script: nextScript,
        storyboard: nextStoryboard,
        subtitles: nextSubtitles,
        assets: nextAssets,
        platform: videoPlatform,
        videoType,
        duration,
        provider: selectedProvider,
        model: modelRequestFor("video")
      });
      setVideoProjects((current) => [project, ...current]);
      recordResult("video", {
        title: project.name,
        body: `${project.provider} · ${project.status}\n${project.inputs.join(" / ")}`,
        meta: `项目进度 ${project.progress}%`
      });
    } catch (error) {
      recordError("video", error);
    } finally {
      setLoading(null);
    }
  };

  const saveProject = () => {
    localStorage.setItem(
      "ai-content-workbench:last-project",
      JSON.stringify({
        projectTitle,
        articleContent,
        workingContent,
        draft,
        humanized,
        analysis,
        formatted,
        core,
        script,
        storyboard,
        subtitles,
        assets,
        videoProjects,
        activeSkills,
        activeBlockSkills
      })
    );
  };

  const handleExport = async () => {
    setLoading("export");
    try {
      const result = await postJson<{ filename: string; mime: string; content: string }>("/api/export", {
        content: currentContent,
        format: "markdown",
        filename: projectTitle
      });
      const blob = new Blob([result.content], { type: result.mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(null);
    }
  };

  const copyShareText = async () => {
    await navigator.clipboard.writeText(currentContent || projectTitle);
  };

  const moduleCards: ModuleCardConfig[] = [
    {
      id: "write",
      title: "写稿",
      description: "生成高质量内容，支持多种文体和平台",
      buttonLabel: "开始写稿",
      module: "write",
      accent: "violet",
      icon: PenLine,
      action: async () => {
        setWriteDialogOpen(true);
      },
      loadingKey: "write",
      defaultSkillName: "通用写作大师",
      defaultSkillDesc: "适用于大多数写作场景"
    },
    {
      id: "humanize",
      title: "反AI润色",
      description: "去除AI痕迹，增强人味和真实感",
      buttonLabel: "开始润色",
      module: "humanize",
      accent: "blue",
      icon: Wand2,
      action: runHumanize,
      loadingKey: "humanize",
      defaultSkillName: "去AI味 · 自然表达",
      defaultSkillDesc: "让文章更像真人写的"
    },
    {
      id: "analyze",
      title: "AI痕迹评估",
      description: "评估AI腔风险，提供优化建议",
      buttonLabel: "开始评估",
      module: "analyze",
      accent: "green",
      icon: ShieldCheck,
      action: runAnalyze,
      loadingKey: "analyze",
      defaultSkillName: "AI痕迹检测 v2.1",
      defaultSkillDesc: "多维度检测AI痕迹风险"
    },
    {
      id: "format",
      index: 4,
      title: "排版",
      description: "一键排版到各大平台格式",
      buttonLabel: "开始排版",
      module: "format",
      accent: "orange",
      icon: LayoutDashboard,
      action: runFormat,
      loadingKey: "format",
      defaultSkillName: "公众号排版大师",
      defaultSkillDesc: "适配公众号排版规范"
    },
    {
      id: "core",
      title: "核心提炼",
      description: "提炼核心观点、金句、案例和传播点",
      buttonLabel: "开始提炼",
      module: "video",
      accent: "violet",
      icon: Sparkles,
      action: runCore,
      loadingKey: "core",
      defaultSkillName: "核心提炼专家",
      defaultSkillDesc: "提炼文章核心价值点"
    },
    {
      id: "script",
      title: "短视频脚本",
      description: "生成短视频脚本、开头钩子和口播稿",
      buttonLabel: "生成脚本",
      module: "video",
      accent: "blue",
      icon: Play,
      action: runScript,
      loadingKey: "script",
      defaultSkillName: "短视频脚本大师",
      defaultSkillDesc: "爆款脚本结构化生成"
    },
    {
      id: "storyboard",
      title: "分镜设计",
      description: "生成详细分镜脚本和画面描述",
      buttonLabel: "生成分镜",
      module: "video",
      accent: "green",
      icon: LayoutDashboard,
      action: runStoryboard,
      loadingKey: "storyboard",
      defaultSkillName: "分镜脚本专家",
      defaultSkillDesc: "专业分镜组织与表达"
    },
    {
      id: "subtitle",
      title: "字幕与口播稿",
      description: "生成字幕文案和口播稿",
      buttonLabel: "生成字幕",
      module: "video",
      accent: "violet",
      icon: Code2,
      action: runSubtitle,
      loadingKey: "subtitle",
      defaultSkillName: "字幕生成专家",
      defaultSkillDesc: "精准字幕与口播稿生成"
    },
    {
      id: "cover",
      title: "封面与标题",
      description: "生成吸引眼球的封面和标题",
      buttonLabel: "生成封面",
      module: "video",
      accent: "orange",
      icon: ImageIcon,
      action: runAssets,
      loadingKey: "assets",
      defaultSkillName: "封面标题大师",
      defaultSkillDesc: "高点击率封面标题生成"
    },
    {
      id: "video",
      title: "成片素材包",
      description: "打包脚本、分镜、字幕、封面和发布文案",
      buttonLabel: "生成素材包",
      module: "video",
      accent: "red",
      icon: Film,
      action: createVideoProject,
      loadingKey: "render",
      defaultSkillName: "视频素材包大师",
      defaultSkillDesc: "短视频生产资料打包"
    }
  ];

  return (
    <main className="template-shell">
      <aside className="template-sidebar">
        <div className="template-brand">
          <div className="brand-logo">
            <Sparkles size={22} />
          </div>
          <div>
            <strong>AI内容工作台</strong>
            <span>从写作到发布，一站式内容生产</span>
          </div>
        </div>

        <button
          className="new-project"
          type="button"
          onClick={() => {
            setActiveSection("workbench");
            setWriteDialogOpen(true);
          }}
        >
          <PenLine size={18} />
          新建项目
        </button>

        <nav className="template-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={activeSection === item.id ? "active" : ""} key={item.label} onClick={() => setActiveSection(item.id)}>
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-divider" />

        <div className="skill-center">
          <span>技能中心</span>
          {skillCenterItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={activeSection === item.id ? "active" : ""} key={item.label} onClick={() => setActiveSection(item.id)}>
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="usage-card">
          <span>今日使用</span>
          <strong>32,450 / 100,000 字</strong>
          <p>剩余 67%</p>
          <div>
            <i />
          </div>
        </div>
      </aside>

      <section className="template-main">
        <header className="template-topbar">
          <div className="project-switcher">
            <span>当前项目：</span>
            <input value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} />
            <ChevronDown size={16} />
          </div>

          <div className="save-state">
            <CheckCircle2 size={16} />
            已自动保存
            <span>10:32:45</span>
          </div>

          <div className="topbar-actions">
            <span>API模型设置</span>
            <button className="select-button model-select-button" onClick={() => openModuleModelPicker(null)}>
              <span>{selectedApiModel.name}</span>
              <small>{selectedApiModel.provider} · {modelConfigured ? "已配置" : "未配置"}</small>
              <ChevronDown size={16} />
            </button>
            <button onClick={saveProject}>
              <Save size={16} />
              保存
            </button>
            <button onClick={handleExport} disabled={loading === "export"}>
              {loading === "export" ? <Loader2 className="spin" size={16} /> : <Download size={16} />}
              导出
            </button>
            <button className="share" onClick={copyShareText}>
              <Share2 size={16} />
              分享
            </button>
            <div className="top-avatar">写</div>
          </div>
        </header>

        <div className="template-content">
          {activeSection === "workbench" ? (
            <>
              <section className="module-grid">
                {moduleCards.map((config) => (
                  <ModuleCard
                    key={config.id}
                    config={config}
                    loading={loading}
                    selectedSkill={selectedSkillByBlock(config.id)}
                    selectedModel={modelByBlock(config.id)}
                    selectedModelConfigured={modelConfiguredByBlock(config.id)}
                    moduleSkills={skillsForModule(config.module)}
                    result={moduleResults[config.id]}
                    active={activeResultId === config.id}
                    onFocusResult={() => setActiveResultId(config.id)}
                    onViewResult={() => openResultViewer(config.id, config.id === "script" || config.id === "humanize" || config.id === "write")}
                    onSecondaryResult={config.id === "storyboard" && moduleResults.storyboard ? runStoryboardImages : undefined}
                    secondaryResultLabel={config.id === "storyboard" ? "生成分镜图片" : undefined}
                    secondaryResultLoading={loading === "images"}
                    onPickSkillSource={(target, module, source) => setSkillPicker({ target, module, source })}
                    onPromptSkill={addPromptSkill}
                    onPickModel={openModuleModelPicker}
                  />
                ))}
              </section>

              <section className="project-controls">
                <div>
                  <h2>视频项目设置</h2>
                  <p>成片素材包会把脚本、分镜、字幕、封面和发布文案打包为一个项目。</p>
                </div>
                <label>
                  <span>平台</span>
                  <select value={videoPlatform} onChange={(event) => setVideoPlatform(event.target.value)}>
                    {videoPlatforms.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>类型</span>
                  <select value={videoType} onChange={(event) => setVideoType(event.target.value)}>
                    {videoTypes.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>时长</span>
                  <select value={duration} onChange={(event) => setDuration(event.target.value)}>
                    {durations.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>引擎</span>
                  <select value={selectedProvider} onChange={(event) => setSelectedProvider(event.target.value as VideoRenderProvider)}>
                    {renderProviders.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>分镜图片风格</span>
                  <input value={imageStyle} onChange={(event) => setImageStyle(event.target.value)} />
                </label>
              </section>

              {videoProjects.length > 0 ? (
                <section className="video-project-list">
                  <h2>视频项目</h2>
                  <div>
                    {videoProjects.slice(0, 3).map((project) => (
                      <article key={project.id}>
                        <Film size={20} />
                        <strong>{project.name}</strong>
                        <span>{project.provider} · {project.status}</span>
                        <b>{project.progress}%</b>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="my-skill-panel">
                <div className="panel-title">
                  <strong>我的Skill</strong>
                  <span>快速访问常用Skill</span>
                </div>
                <div className="quick-skill-grid">
                  {[
                    { icon: ShieldCheck, title: "我的自定义Skill", count: "12 个", action: "查看全部", accent: "orange", target: "mySkill" as const },
                    { icon: UsersRound, title: "团队共享Skill", count: "8 个", action: "查看全部", accent: "blue", target: "teamSkill" as const },
                    { icon: Star, title: "收藏的Skill", count: "15 个", action: "查看全部", accent: "violet", target: "mySkill" as const },
                    { icon: Clock3, title: "最近使用的Skill", count: "", action: "查看历史", accent: "blue", target: "mySkill" as const },
                    { icon: Boxes, title: "Skill市场", count: "发现更多优质Skill", action: "去探索", accent: "blue", target: "skillMarket" as const }
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button className={`quick-skill ${item.accent}`} key={item.title} type="button" onClick={() => setActiveSection(item.target)}>
                        <Icon size={22} />
                        <span>{item.title}</span>
                        <small>{item.count}</small>
                        <b>{item.action} →</b>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          ) : activeSection === "admin" ? (
            <AdminDashboard
              activeTab={adminTab}
              onTabChange={setAdminTab}
              skills={skills}
              activeSkills={activeSkills}
              activeBlockSkills={activeBlockSkills}
              modelCredentials={modelCredentials}
              activeApiModels={activeApiModels}
              videoProjects={videoProjects}
              onOpenModels={() => openModuleModelPicker(null)}
              onOpenSkillPicker={(target, source) => setSkillPicker({ target, module: workflowBlockModule(target), source })}
              onOpenGithubSkillImport={openGithubSkillImport}
              onScanInspiration={scanInspiration}
              onBindModuleModel={(target, modelId) => setActiveApiModels((current) => ({ ...current, [target]: modelId }))}
              onPickWorkflowModel={openModuleModelPicker}
            />
          ) : (
            <SidebarModuleView
              section={activeSection as Exclude<SidebarKey, "workbench" | "admin">}
              inspirationSignals={inspirationSignals}
              inspirationRules={defaultInspirationRules}
              inspirationScanMeta={inspirationScanMeta}
              inspirationLoading={loading === "inspiration"}
              trendRadarEndpoint={trendRadarEndpoint}
              trendRadarStatus={trendRadarStatus}
              trendRadarLoading={loading === "trendradar"}
              onTrendRadarEndpointChange={setTrendRadarEndpoint}
              onScanInspiration={scanInspiration}
              onTestTrendRadar={testTrendRadar}
            />
          )}
        </div>
      </section>

      {modelDialogOpen ? (
        <div className="modal-backdrop model-backdrop">
          <section className="modal-card model-modal">
            <header className="model-modal-head">
              <div>
                <strong>API 调用模型</strong>
                <span>
                  {modelPickerModule ? `${workflowBlockLabel(modelPickerModule)} · ` : "全局默认 · "}
                  默认使用 GPT-5.5，也可以自选模型并填写 API Key。Key 只保存在当前浏览器本地。
                </span>
              </div>
              <button className="model-close-button" onClick={() => setModelDialogOpen(false)}>
                <X size={18} />
                关闭
              </button>
            </header>

            <div className="model-control-row">
              <label className="model-search">
                <span>搜索模型 / 厂商 / 环境变量</span>
                <div className="model-search-box">
                  <Search size={22} />
                  <input value={modelSearch} onChange={(event) => setModelSearch(event.target.value)} placeholder="例如 DeepSeek、可灵、Veo、OPENAI_API_KEY" />
                </div>
              </label>
              <button
                className="model-default-button"
                type="button"
                onClick={() => {
                  setSelectedModelId(defaultApiModelId);
                  if (modelPickerModule) {
                    setActiveApiModels((current) => ({ ...current, [modelPickerModule]: defaultApiModelId }));
                  }
                  setModelCapability("all");
                  setModelSearch("");
                }}
              >
                <RotateCcw size={16} />
                恢复默认
              </button>
            </div>

            <section className="model-api-panel">
              <div className="model-api-head">
                <div className={`model-provider-icon ${modelLogoClass(selectedApiModel.provider)}`}>
                  {modelLogoUrl(selectedApiModel.provider) ? (
                    <img
                      src={modelLogoUrl(selectedApiModel.provider)}
                      data-fallback={modelLogoFallbackUrl(selectedApiModel.provider)}
                      alt={`${selectedApiModel.provider} Logo`}
                      onError={(event) => {
                        const fallback = event.currentTarget.dataset.fallback;
                        if (fallback && event.currentTarget.src !== fallback) {
                          event.currentTarget.src = fallback;
                        } else {
                          event.currentTarget.hidden = true;
                          event.currentTarget.nextElementSibling?.classList.add("show");
                        }
                      }}
                    />
                  ) : null}
                  <span>{modelLogoText(selectedApiModel.provider)}</span>
                </div>
                <div>
                  <strong>{selectedApiModel.provider} · {selectedApiModel.name}</strong>
                  <span>{modelConfigured ? "API 已保存，可用于后续调用" : "还没有保存 API Key，当前只是模型占位配置"}</span>
                </div>
                <b>{selectedApiModel.envKey}</b>
              </div>
              <div className="model-api-form">
                <label>
                  <span>API Key / Token</span>
                  <div className="model-input-box">
                    <KeyRound size={19} />
                    <input
                      type="password"
                      value={credentialDraft.apiKey}
                      onChange={(event) => setCredentialDraft({ ...credentialDraft, apiKey: event.target.value })}
                      placeholder={`填写 ${selectedApiModel.envKey}`}
                      autoComplete="off"
                    />
                    <Eye size={18} />
                  </div>
                </label>
                <label>
                  <span>Base URL / Endpoint</span>
                  <div className="model-input-box">
                    <Globe2 size={19} />
                    <input
                      value={credentialDraft.endpoint}
                      onChange={(event) => setCredentialDraft({ ...credentialDraft, endpoint: event.target.value })}
                      placeholder={selectedApiModel.endpoint}
                    />
                  </div>
                </label>
                <label>
                  <span>模型 ID</span>
                  <div className="model-input-box">
                    <Code2 size={19} />
                    <input
                      value={credentialDraft.modelId}
                      onChange={(event) => setCredentialDraft({ ...credentialDraft, modelId: event.target.value })}
                      placeholder={selectedApiModel.modelId}
                    />
                  </div>
                </label>
                <label>
                  <span>Secret ID / AK（可选）</span>
                  <div className="model-input-box">
                    <ShieldCheck size={19} />
                    <input
                      type="password"
                      value={credentialDraft.secretId}
                      onChange={(event) => setCredentialDraft({ ...credentialDraft, secretId: event.target.value })}
                      placeholder="腾讯云、火山等双字段鉴权可填这里"
                      autoComplete="off"
                    />
                  </div>
                </label>
                <label>
                  <span>组织 / 备注（可选）</span>
                  <div className="model-input-box">
                    <FileText size={19} />
                    <input
                      value={credentialDraft.organization}
                      onChange={(event) => setCredentialDraft({ ...credentialDraft, organization: event.target.value })}
                      placeholder="OpenAI Org、项目名、账号备注"
                    />
                  </div>
                </label>
              </div>
              <div className="model-api-actions">
                <small>
                  <span>正式部署建议改为服务端环境变量。</span>
                  <span>本地 MVP 先允许浏览器保存，方便测试。</span>
                </small>
                <div>
                  <button type="button" onClick={clearModelCredential}>
                    <Trash2 size={16} />
                    清除配置
                  </button>
                  <button type="button" onClick={testModelConnection} disabled={modelTestLoading}>
                    {modelTestLoading ? <Loader2 className="spin" size={14} /> : <Activity size={16} />}
                    测试连接
                  </button>
                  <button className="primary" type="button" onClick={saveModelCredential}>
                    <Save size={16} />
                    保存 API 配置
                  </button>
                  <button className="primary muted" type="button" onClick={useCurrentModel}>
                    <PlayCircle size={16} />
                    使用当前模型
                  </button>
                </div>
              </div>
              {modelTestResult ? (
                <div className={`model-test-result ${modelTestResult.ok ? "success" : "error"}`}>
                  <strong>{modelTestResult.ok ? "连接正常" : "连接失败"}</strong>
                  <span>{modelTestResult.message}</span>
                  {modelTestResult.status ? <small>HTTP {modelTestResult.status}</small> : null}
                  {modelTestResult.endpoint ? <small>{modelTestResult.endpoint}</small> : null}
                </div>
              ) : null}
            </section>

            <div className="model-filter-row">
              {apiModelCapabilities.map((item) => (
                <button
                  className={modelCapability === item.id ? "selected" : ""}
                  key={item.id}
                  type="button"
                  onClick={() => setModelCapability(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="model-grid">
              {filteredApiModels.map((model) => (
                <button
                  className={`model-card ${selectedApiModel.id === model.id ? "selected" : ""}`}
                  key={model.id}
                  type="button"
                  onClick={() => selectApiModel(model.id)}
                >
                  <div className="model-card-top">
                    <div className="model-card-brand">
                      <i className={`model-logo ${modelLogoClass(model.provider)}`}>
                        {modelLogoUrl(model.provider) ? (
                          <img
                            src={modelLogoUrl(model.provider)}
                            data-fallback={modelLogoFallbackUrl(model.provider)}
                            alt={`${model.provider} Logo`}
                            onError={(event) => {
                              const fallback = event.currentTarget.dataset.fallback;
                              if (fallback && event.currentTarget.src !== fallback) {
                                event.currentTarget.src = fallback;
                              } else {
                                event.currentTarget.hidden = true;
                                event.currentTarget.nextElementSibling?.classList.add("show");
                              }
                            }}
                          />
                        ) : null}
                        <span>{modelLogoText(model.provider)}</span>
                      </i>
                      <span>{model.provider}</span>
                    </div>
                    <b>{model.status}</b>
                  </div>
                  <strong>{model.name}</strong>
                  <small>{model.modelId}</small>
                  <p>{model.description}</p>
                  <ul>
                    {model.capabilities.map((capability) => (
                      <li key={capability}>{apiModelCapabilities.find((item) => item.id === capability)?.label ?? capability}</li>
                    ))}
                  </ul>
                  <em>Key：{model.envKey}</em>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {writeDialogOpen ? (
        <div className="modal-backdrop">
          <section className="modal-card write-modal">
            <header>
              <div>
                <strong>写稿提示</strong>
                <span>先写几句你想要的方向，再开始生成指定内容。</span>
              </div>
              <button onClick={() => setWriteDialogOpen(false)}>关闭</button>
            </header>
            <label>
              <span>内容提示</span>
              <textarea value={writePrompt} onChange={(event) => setWritePrompt(event.target.value)} />
            </label>
            <div className="modal-grid">
              <label>
                <span>风格</span>
                <input value={style} onChange={(event) => setStyle(event.target.value)} />
              </label>
              <label>
                <span>字数</span>
                <input type="number" min={300} max={5000} value={length} onChange={(event) => setLength(Number(event.target.value))} />
              </label>
            </div>
            <footer>
              <button onClick={() => setWriteDialogOpen(false)}>取消</button>
              <button className="primary" onClick={runWrite} disabled={loading === "write" || !writePrompt.trim()}>
                {loading === "write" ? <Loader2 className="spin" size={16} /> : null}
                开始生成
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {skillPicker
        ? (() => {
            const availableSkills = skillsForSource(skillPicker.module, skillPicker.source);
            const currentSkill = selectedSkillByBlock(skillPicker.target);
            return (
              <div className="modal-backdrop">
                <section className="modal-card skill-picker-modal">
                  <header>
                    <div>
                      <strong>选择 {sourceLabel(skillPicker.source)}</strong>
                      <span>{workflowBlockLabel(skillPicker.target)} · 点击任意 Skill 即可指定为当前规则。</span>
                    </div>
                    <button onClick={() => setSkillPicker(null)}>关闭</button>
                  </header>

                  <div className="skill-picker-list">
                    {availableSkills.length > 0 ? (
                      availableSkills.map((skill) => (
                        <article className={currentSkill?.id === skill.id ? "selected" : ""} key={skill.id}>
                          <button type="button" onClick={() => chooseSkill(skillPicker.target, skill.id)}>
                            <div>
                              <strong>{skill.name}</strong>
                              <span>{skill.description}</span>
                            </div>
                            <small>{skill.rules.slice(0, 3).join(" / ") || "无额外规则"}</small>
                          </button>
                          <div className="skill-picker-actions">
                            <button type="button" onClick={() => editSkill(skill)}>
                              {skill.isUser ? "修改" : "复制修改"}
                            </button>
                            {skill.isUser ? (
                              <button className="danger" type="button" onClick={() => deleteSkill(skill)}>
                                删除
                              </button>
                            ) : null}
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="skill-picker-empty">
                        <strong>这里还没有可选 Skill</strong>
                        <span>可以先新增一个，保存后会自动成为当前 Skill。</span>
                      </div>
                    )}
                  </div>

                  {skillPicker.source === "upload" ? (
                    <label className="skill-picker-upload">
                      <Upload size={16} />
                      上传新的 Skill
                      <input type="file" accept=".skill,.json,.yaml,.yml,.md,text/plain" onChange={(event) => handleSkillFile(event, skillPicker.target)} />
                    </label>
                  ) : null}

                  {skillPicker.source === "prompt" ? (
                    <button className="primary skill-picker-create" onClick={() => addPromptSkill(skillPicker.target)}>
                      <PenLine size={16} />
                      新建自定义 Prompt
                    </button>
                  ) : null}

                  {skillPicker.source === "github" ? (
                    <button className="primary skill-picker-create" onClick={() => openGithubSkillImport(skillPicker.target)}>
                      <Github size={16} />
                      从 GitHub 仓库下载 Skill
                    </button>
                  ) : null}
                </section>
              </div>
            );
          })()
        : null}

      {githubSkillDraft ? (
        <div className="modal-backdrop">
          <section className="modal-card github-skill-modal">
            <header>
              <div>
                <strong>从 GitHub 下载 Skill</strong>
                <span>读取 GitHub 仓库里的 SKILL.md、.skill、.json 或 Markdown 文件，导入后会进入对应板块的 Skill 列表。</span>
              </div>
              <button onClick={() => setGithubSkillDraft(null)}>关闭</button>
            </header>

            <div className="modal-grid">
              <label>
                <span>指定板块</span>
                <select
                  value={githubSkillDraft.target}
                  onChange={(event) => {
                    const target = event.target.value as WorkflowBlockId;
                    setGithubSkillDraft({
                      ...githubSkillDraft,
                      target,
                      module: workflowBlockModule(target),
                      status: ""
                    });
                  }}
                >
                  {workflowBlocks.map((block) => (
                    <option key={block.id} value={block.id}>{block.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>GitHub 仓库 / 文件链接</span>
                <input
                  value={githubSkillDraft.repo}
                  onChange={(event) => setGithubSkillDraft({ ...githubSkillDraft, repo: event.target.value, status: "" })}
                  placeholder="owner/repo 或 https://github.com/owner/repo/blob/main/SKILL.md"
                />
              </label>
              <label>
                <span>分支</span>
                <input
                  value={githubSkillDraft.branch}
                  onChange={(event) => setGithubSkillDraft({ ...githubSkillDraft, branch: event.target.value, status: "" })}
                  placeholder="main"
                />
              </label>
              <label>
                <span>Skill 文件路径</span>
                <input
                  value={githubSkillDraft.path}
                  onChange={(event) => setGithubSkillDraft({ ...githubSkillDraft, path: event.target.value, status: "" })}
                  placeholder="SKILL.md 或 skills/my-style.skill.json"
                />
              </label>
              <label>
                <span>Skill 名称</span>
                <input
                  value={githubSkillDraft.name}
                  onChange={(event) => setGithubSkillDraft({ ...githubSkillDraft, name: event.target.value })}
                  placeholder="导入后的 Skill 名称"
                />
              </label>
              <label>
                <span>说明</span>
                <input
                  value={githubSkillDraft.description}
                  onChange={(event) => setGithubSkillDraft({ ...githubSkillDraft, description: event.target.value })}
                  placeholder="从 GitHub 仓库下载导入"
                />
              </label>
            </div>

            <div className="github-skill-preview">
              <strong>下载来源</strong>
              <span>{githubSkillSourcePreview ? githubSkillSourcePreview.rawUrl : "填写仓库和路径后，会从 raw.githubusercontent.com 读取文件内容。"}</span>
              {githubSkillDraft.status ? <b>{githubSkillDraft.status}</b> : null}
            </div>

            <footer>
              <span className="modal-count">支持公开 GitHub 仓库；私有仓库后续接 GitHub Token。</span>
              <div>
                <button onClick={() => setGithubSkillDraft(null)}>取消</button>
                <button className="primary" onClick={saveGithubSkill} disabled={githubSkillLoading || !githubSkillDraft.repo.trim() || !githubSkillDraft.path.trim()}>
                  {githubSkillLoading ? <Loader2 className="spin" size={16} /> : <Github size={16} />}
                  下载并导入
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}

      {promptSkillDraft ? (
        <div className="modal-backdrop">
          <section className="modal-card skill-prompt-modal">
            <header>
              <div>
                <strong>自定义 Skill Prompt / 规则</strong>
                <span>输入框可直接看到约 600 字内容，输入长度不限。</span>
              </div>
              <button onClick={() => setPromptSkillDraft(null)}>关闭</button>
            </header>
            <div className="modal-grid">
              <label>
                <span>Skill 名称</span>
                <input value={promptSkillDraft.name} onChange={(event) => setPromptSkillDraft({ ...promptSkillDraft, name: event.target.value })} />
              </label>
              <label>
                <span>说明</span>
                <input value={promptSkillDraft.description} onChange={(event) => setPromptSkillDraft({ ...promptSkillDraft, description: event.target.value })} />
              </label>
              <label>
                <span>指定板块</span>
                <select
                  value={promptSkillDraft.target}
                  onChange={(event) => {
                    const target = event.target.value as WorkflowBlockId;
                    setPromptSkillDraft({ ...promptSkillDraft, target, module: workflowBlockModule(target) });
                  }}
                >
                  {workflowBlocks.map((block) => (
                    <option key={block.id} value={block.id}>{block.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span>Prompt / 规则内容</span>
              <textarea
                value={promptSkillDraft.prompt}
                onChange={(event) => setPromptSkillDraft({ ...promptSkillDraft, prompt: event.target.value })}
                placeholder="例如：保留原观点，只调整表达；减少模板腔；增加真实场景；不要过度总结；每段要有作者判断..."
              />
            </label>
            <footer>
              <span className="modal-count">{promptSkillDraft.prompt.length} 字</span>
              <div>
                <button onClick={() => setPromptSkillDraft(null)}>取消</button>
                <button className="primary" onClick={savePromptSkill} disabled={!promptSkillDraft.prompt.trim()}>
                  保存 Skill
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}

      {formatEditorOpen ? (
        <div className="modal-backdrop format-backdrop">
          <section className="article-editor article-editor-modal">
            <header className="article-editor-top">
              <div className="editor-window-controls">
                <button
                  title="上一版式"
                  type="button"
                  onClick={() => {
                    const currentIndex = formatTargets.indexOf(formatType);
                    setFormatType(formatTargets[(currentIndex + formatTargets.length - 1) % formatTargets.length]);
                  }}
                >
                  ‹ ›
                </button>
                <button
                  title="预览"
                  type="button"
                  onClick={() => setViewer({ id: "format-preview", title: `${formatType}预览`, body: `# ${formatTitle}\n\n${formatEditorBody}`, editable: false })}
                >
                  <Eye size={16} />
                </button>
                <button title="移动预览" type="button" onClick={() => setFormatType("小红书版")}>
                  <FileText size={16} />
                </button>
                <button title="桌面预览" type="button" onClick={() => setFormatType("微信公众号版")}>
                  <LayoutDashboard size={16} />
                </button>
              </div>
              <div className="editor-top-actions">
                <button title="编辑区聚焦" type="button" onClick={() => formatEditorRef.current?.focus()}>
                  <LayoutDashboard size={16} />
                </button>
                <button title="复制" type="button" onClick={copyFormatEditor}>
                  <Copy size={16} />
                </button>
                <label title="插入图片">
                  <ImagePlus size={16} />
                  <input type="file" accept="image/*" onChange={handleFormatImage} />
                </label>
                <button onClick={copyFormatEditor}>导出</button>
                <button onClick={saveFormatEditor}>保存</button>
                <button onClick={() => setFormatEditorOpen(false)}>关闭</button>
              </div>
            </header>

            <div className="editor-toolbar">
              <button title="撤销" onClick={() => insertEditorLine("")}>
                <Undo2 size={17} />
              </button>
              <button title="重做" onClick={() => insertEditorLine("")}>
                <Redo2 size={17} />
              </button>
              <button title="加粗" onClick={() => wrapEditorSelection("**")}>
                <Bold size={17} />
              </button>
              <button title="斜体" onClick={() => wrapEditorSelection("*")}>
                <Italic size={17} />
              </button>
              <button title="下划线" onClick={() => wrapEditorSelection("<u>", "</u>")}>
                <Underline size={17} />
              </button>
              <button title="删除线" onClick={() => wrapEditorSelection("~~")}>
                <Strikethrough size={17} />
              </button>
              <button title="代码" onClick={() => wrapEditorSelection("`")}>
                <Code2 size={17} />
              </button>
              <button className="active" title="一级标题" onClick={() => insertEditorLine("# ")}>
                <Heading1 size={17} />
              </button>
              <button title="二级标题" onClick={() => insertEditorLine("## ")}>
                <Heading2 size={17} />
              </button>
              <button title="三级标题" onClick={() => insertEditorLine("### ")}>
                <Heading3 size={17} />
              </button>
              <button title="无序列表" onClick={() => insertEditorLine("- ")}>
                <List size={17} />
              </button>
              <button title="有序列表" onClick={() => insertEditorLine("1. ")}>
                <ListOrdered size={17} />
              </button>
              <button title="任务列表" onClick={() => insertEditorLine("- [ ] ")}>
                <ListChecks size={17} />
              </button>
              <button title="引用" onClick={() => insertEditorLine("> ")}>
                <Quote size={17} />
              </button>
              <button title="链接" onClick={() => wrapEditorSelection("[", "](https://)")}>
                <Link size={17} />
              </button>
              <button title="表格" onClick={() => insertEditorLine("| 标题 | 内容 |\n| --- | --- |\n|  |  |")}>
                <Table2 size={17} />
              </button>
              <label title="插入图片">
                <ImagePlus size={17} />
                <input type="file" accept="image/*" onChange={handleFormatImage} />
              </label>
            </div>

            <section className="format-dialog-settings">
              <div>
                <h3>排版目标</h3>
                <span>在弹窗内切换，下面预览会立即更新。</span>
              </div>
              <div className="format-targets">
                {formatTargets.map((target) => (
                  <button
                    className={formatType === target ? "selected" : ""}
                    type="button"
                    key={target}
                    onClick={() => void generateFormatFor(target)}
                    disabled={loading === "format"}
                  >
                    {loading === "format" && formatType === target ? <Loader2 className="spin" size={14} /> : null}
                    {target}
                  </button>
                ))}
              </div>
              <div className="format-mini-controls">
                <label>
                  <span>字号</span>
                  <input type="range" min={13} max={22} value={formatFontSize} onChange={(event) => setFormatFontSize(Number(event.target.value))} />
                  <b>{formatFontSize}px</b>
                </label>
                <label>
                  <span>文字颜色</span>
                  <input type="color" value={formatColor} onChange={(event) => setFormatColor(event.target.value)} />
                </label>
              </div>
            </section>

            <div className="article-paper">
              <input className="article-title-input" value={formatTitle} onChange={(event) => setFormatTitle(event.target.value)} placeholder="输入文章标题" />
              {formatImageSrc ? <img className="article-image" src={formatImageSrc} alt="插入图片预览" /> : null}
              <textarea
                ref={formatEditorRef}
                value={formatEditorBody}
                onChange={(event) => setFormatEditorBody(event.target.value)}
                style={{ fontSize: `${formatFontSize}px`, color: formatColor }}
              />
            </div>
          </section>
        </div>
      ) : null}

      {viewer ? (
        <div className="modal-backdrop">
          <section className="modal-card viewer-modal">
            <header>
              <div>
                <strong>{viewer.title}</strong>
                <span>
                  {viewer.id === "analyze"
                    ? "在原文段落上标注风险，直接修改后可保存为后续流程输入。"
                    : viewer.editable
                      ? "可以手动修改，保存后会作为后续流程输入。"
                      : "查看生成内容，可一键复制。"}
                </span>
              </div>
              <button onClick={() => setViewer(null)}>关闭</button>
            </header>
            {viewer.id === "analyze" && analysis ? (
              <AnalysisEditor analysis={analysis} value={viewerBody} onChange={setViewerBody} />
            ) : viewer.editable ? (
              <textarea value={viewerBody} onChange={(event) => setViewerBody(event.target.value)} />
            ) : (
              <pre>{viewer.body}</pre>
            )}
            {viewer.id === "storyboard" && storyboardImages.length > 0 ? (
              <div className="image-prompt-list">
                {storyboardImages.map((item) => (
                  <article key={item.shot}>
                    <div>{item.preview}</div>
                    <strong>镜头 {item.shot}</strong>
                    <span>{item.prompt}</span>
                  </article>
                ))}
              </div>
            ) : null}
            <footer>
              <button onClick={() => void navigator.clipboard.writeText(viewer.editable ? viewerBody : viewer.body)}>一键复制</button>
              {viewer.editable ? (
                <button className="primary" onClick={saveViewerBody}>
                  保存修改
                </button>
              ) : null}
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}
