export type SkillModule =
  | "write"
  | "humanize"
  | "analyze"
  | "format"
  | "video";

export type Skill = {
  id: string;
  name: string;
  module: SkillModule;
  description: string;
  rules: string[];
  prompt: string;
  isUser?: boolean;
};

export type ActiveSkills = {
  write: string;
  humanize: string;
  analyze: string;
  format: string;
  video: string;
};

export type ApiModelCapability = "text" | "reasoning" | "image" | "video" | "audio" | "multimodal";

export type ApiModelConfig = {
  id: string;
  provider: string;
  name: string;
  modelId: string;
  capabilities: ApiModelCapability[];
  endpoint: string;
  envKey: string;
  status: "默认" | "可接入" | "待接入";
  description: string;
};

export type WritePayload = {
  topic: string;
  style: string;
  platform: string;
  length: number;
  brief?: string;
  skillId?: string;
  skill?: Skill;
  model?: ApiModelConfig;
};

export type HumanizePayload = {
  content: string;
  skillId?: string;
  skill?: Skill;
  model?: ApiModelConfig;
};

export type AnalyzePayload = {
  content: string;
  platform: string;
  skillId?: string;
  skill?: Skill;
  model?: ApiModelConfig;
};

export type FormatPayload = {
  content: string;
  format: string;
  skillId?: string;
  skill?: Skill;
  model?: ApiModelConfig;
};

export type ExportPayload = {
  content: string;
  format: "markdown" | "html" | "txt";
  filename?: string;
};

export type ExtractCorePayload = {
  content: string;
  platform: string;
  videoType: string;
  duration: string;
  skillId?: string;
  skill?: Skill;
  model?: ApiModelConfig;
};

export type VideoScriptPayload = {
  core: CoreExtract;
  platform: string;
  videoType: string;
  duration: string;
  skillId?: string;
  skill?: Skill;
  model?: ApiModelConfig;
};

export type StoryboardPayload = {
  script: VideoScript;
  core: CoreExtract;
  skillId?: string;
  skill?: Skill;
  model?: ApiModelConfig;
};

export type SubtitlePayload = {
  script: VideoScript;
  speed?: "slow" | "normal" | "fast";
  model?: ApiModelConfig;
};

export type VideoAssetsPayload = {
  core: CoreExtract;
  platform: string;
  videoType: string;
  model?: ApiModelConfig;
};

export type VideoRenderProvider =
  | "火山方舟"
  | "火山引擎"
  | "Google Veo"
  | "Kling 可灵"
  | "Runway"
  | "Runway Gen"
  | "MiniMax"
  | "Midjourney"
  | "Flux"
  | "Stable Diffusion"
  | "Pika"
  | "可灵"
  | "豆包 Doubao / Seed"
  | "剪映"
  | "CapCut"
  | "数字人 API"
  | "TTS";

export type VideoRenderPayload = {
  core: CoreExtract;
  script: VideoScript;
  storyboard: StoryboardRow[];
  subtitles: string[];
  assets: VideoAssets;
  platform: string;
  videoType: string;
  duration: string;
  provider: VideoRenderProvider;
  model?: ApiModelConfig;
};

export type RiskItem = {
  id: string;
  label: string;
  score: number;
  detail: string;
};

export type RiskParagraph = {
  index: number;
  text: string;
  score: number;
  level: "低风险" | "中风险" | "高风险";
  reasons: string[];
  suggestion: string;
};

export type AnalysisResult = {
  overall: number;
  level: "低风险" | "中风险" | "高风险";
  summary: string;
  items: RiskItem[];
  paragraphs: RiskParagraph[];
};

export type DraftResult = {
  title: string;
  content: string;
  wordCount: number;
  usedSkill: string;
};

export type HumanizeResult = {
  content: string;
  changes: string[];
  usedSkill: string;
};

export type FormatResult = {
  content: string;
  format: string;
  notes: string[];
};

export type CoreExtract = {
  title: string;
  hook: string;
  coreViewpoint: string;
  keep: string[];
  cut: string[];
  tensionPoints: string[];
  goldenLines: string[];
  recommendedDuration: string;
  bestFormat: string;
};

export type VideoScript = {
  title: string;
  opening: string;
  thirtySecond: string;
  sixtySecond: string;
  threeMinute: string;
  selected: string;
  duration: string;
};

export type StoryboardRow = {
  shot: number;
  visual: string;
  subtitle: string;
  seconds: number;
};

export type StoryboardImageAsset = {
  shot: number;
  prompt: string;
  status: "ready" | "pending";
  preview: string;
};

export type VideoAssets = {
  coverTitles: string[];
  platformTitles: string[];
  publishCopy: string;
  tags: string[];
  visualPrompts: string[];
};

export type VideoRenderProject = {
  id: string;
  name: string;
  provider: VideoRenderProvider;
  platform: string;
  videoType: string;
  duration: string;
  status: "素材待确认" | "等待接入" | "可进入生成";
  progress: number;
  createdAt: string;
  previewTitle: string;
  inputs: string[];
  outputs: Array<{
    label: string;
    status: "ready" | "pending";
  }>;
  nextSteps: string[];
};

export type InspirationRule = {
  id: string;
  label: string;
  scope: string;
  keywords: string[];
  contentRule: string;
  keepRule: string;
  rejectRule: string;
  outputRule: string;
  channels: string[];
};

export type InspirationSignal = {
  id: string;
  title: string;
  state: string;
  body: string;
  metrics: string[];
  source: string;
  region: string;
  url?: string;
  ruleId: string;
  ruleName: string;
  whyRelated: string;
  angles: string[];
  formats: string[];
  risks: string[];
  relatedMaterials: string[];
  scannedAt: string;
};

export type InspirationScanPayload = {
  scope?: string;
  rules?: InspirationRule[];
  limit?: number;
  locale?: string;
  sourceApi?: {
    baseUrl?: string;
    apiKey?: string;
    enabled?: boolean;
  };
};

export type InspirationScanResult = {
  scannedAt: string;
  sourceMode: "google-trends-rss" | "live-rss" | "fallback";
  summary: string;
  rules: InspirationRule[];
  signals: InspirationSignal[];
};
