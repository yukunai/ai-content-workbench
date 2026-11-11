import type { ApiModelCapability, ApiModelConfig } from "./types";

export const defaultApiModelId = "openai-gpt-5.5";

export const apiModelCapabilities: Array<{ id: ApiModelCapability | "all"; label: string }> = [
  { id: "all", label: "全部" },
  { id: "text", label: "文本" },
  { id: "reasoning", label: "推理" },
  { id: "multimodal", label: "多模态" },
  { id: "image", label: "图片" },
  { id: "video", label: "视频" },
  { id: "audio", label: "音频" }
];

export const apiModels: ApiModelConfig[] = [
  {
    id: "volcengine-ark",
    provider: "火山方舟",
    name: "火山方舟 Ark",
    modelId: "doubao-seed-latest / ark endpoint",
    capabilities: ["text", "reasoning", "multimodal"],
    endpoint: "https://ark.cn-beijing.volces.com/api/v3",
    envKey: "VOLCENGINE_ARK_API_KEY",
    status: "可接入",
    description: "适合国内文本、多模态和企业工作流接入。"
  },
  {
    id: "baidu-ernie",
    provider: "文心 ERNIE",
    name: "文心 ERNIE",
    modelId: "ernie-latest / ernie-x1",
    capabilities: ["text", "reasoning", "multimodal"],
    endpoint: "https://qianfan.baidubce.com",
    envKey: "BAIDU_QIANFAN_API_KEY",
    status: "可接入",
    description: "适合中文长文、知识问答和企业内容场景。"
  },
  {
    id: "aliyun-qwen",
    provider: "通义千问 Qwen",
    name: "Qwen Latest / Max",
    modelId: "qwen-latest / qwen-max",
    capabilities: ["text", "reasoning", "multimodal"],
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    envKey: "DASHSCOPE_API_KEY",
    status: "可接入",
    description: "中文写作、分析、结构化输出和多模型适配常用。"
  },
  {
    id: "deepseek-chat",
    provider: "DeepSeek",
    name: "DeepSeek V4",
    modelId: "deepseek-v4 / deepseek-reasoner-v4 / deepseek-chat",
    capabilities: ["text", "reasoning"],
    endpoint: "https://api.deepseek.com",
    envKey: "DEEPSEEK_API_KEY",
    status: "可接入",
    description: "适合推理、改写、代码和长文本分析；模型 ID 可按实际 API 名称覆盖。"
  },
  {
    id: "moonshot-kimi",
    provider: "Kimi",
    name: "Kimi Latest / Moonshot",
    modelId: "kimi-latest / kimi-k2",
    capabilities: ["text", "reasoning"],
    endpoint: "https://api.moonshot.cn/v1",
    envKey: "MOONSHOT_API_KEY",
    status: "可接入",
    description: "适合长上下文、资料分析和中文内容处理。"
  },
  {
    id: "kling-video",
    provider: "可灵",
    name: "可灵 Kling",
    modelId: "kling-video / kling-image",
    capabilities: ["image", "video"],
    endpoint: "https://api.klingai.com",
    envKey: "KLING_API_KEY",
    status: "可接入",
    description: "适合图生视频、文生视频和分镜画面生成。"
  },
  {
    id: "zhipu-glm",
    provider: "智谱 GLM",
    name: "GLM Latest",
    modelId: "glm-latest / glm-4.5",
    capabilities: ["text", "reasoning", "multimodal"],
    endpoint: "https://open.bigmodel.cn/api/paas/v4",
    envKey: "ZHIPU_API_KEY",
    status: "可接入",
    description: "适合中文写作、知识处理和多模态任务。"
  },
  {
    id: "doubao-seed",
    provider: "豆包 Doubao / Seed",
    name: "Doubao / Seed",
    modelId: "doubao-seed-latest / doubao-seed-1.6",
    capabilities: ["text", "reasoning", "multimodal"],
    endpoint: "https://ark.cn-beijing.volces.com/api/v3",
    envKey: "DOUBAO_API_KEY",
    status: "可接入",
    description: "适合中文内容生成、短视频脚本和多模态理解。"
  },
  {
    id: "tencent-hunyuan",
    provider: "腾讯混元 Hunyuan",
    name: "Hunyuan Latest",
    modelId: "hunyuan-latest / hunyuan-turbo",
    capabilities: ["text", "reasoning", "multimodal"],
    endpoint: "https://hunyuan.tencentcloudapi.com",
    envKey: "TENCENT_HUNYUAN_SECRET",
    status: "可接入",
    description: "适合中文企业内容、知识问答和多模态扩展。"
  },
  {
    id: "xiaomi-mimo",
    provider: "小米 MiMo",
    name: "MiMo",
    modelId: "mimo",
    capabilities: ["text", "reasoning"],
    endpoint: "配置后填写小米开放平台 endpoint",
    envKey: "XIAOMI_MIMO_API_KEY",
    status: "待接入",
    description: "预留小米模型适配位，可补 endpoint 和鉴权。"
  },
  {
    id: "stepfun-step",
    provider: "阶跃星辰 Step",
    name: "Step Latest",
    modelId: "step-latest / step-2",
    capabilities: ["text", "reasoning", "multimodal"],
    endpoint: "https://api.stepfun.com/v1",
    envKey: "STEPFUN_API_KEY",
    status: "可接入",
    description: "适合中文内容生成、多模态和长内容理解。"
  },
  {
    id: "volcengine",
    provider: "火山引擎",
    name: "火山引擎 AI 服务",
    modelId: "volcengine ai service",
    capabilities: ["text", "image", "video", "audio"],
    endpoint: "https://open.volcengineapi.com",
    envKey: "VOLCENGINE_API_KEY",
    status: "可接入",
    description: "作为火山系图像、视频、语音和模型 API 的聚合入口。"
  },
  {
    id: "google-veo",
    provider: "Google Veo",
    name: "Veo",
    modelId: "veo-latest / veo",
    capabilities: ["video"],
    endpoint: "https://generativelanguage.googleapis.com",
    envKey: "GOOGLE_API_KEY",
    status: "可接入",
    description: "适合高质量文生视频、图生视频和镜头生成。"
  },
  {
    id: "kling-global",
    provider: "Kling 可灵",
    name: "Kling 可灵",
    modelId: "kling-latest / kling-v2",
    capabilities: ["image", "video"],
    endpoint: "https://api.klingai.com",
    envKey: "KLING_API_KEY",
    status: "可接入",
    description: "国际/国内可灵接口别名，方便视频模块选择。"
  },
  {
    id: "runway-gen",
    provider: "Runway Gen",
    name: "Runway Gen",
    modelId: "gen-latest / gen-4",
    capabilities: ["video"],
    endpoint: "https://api.runwayml.com/v1",
    envKey: "RUNWAY_API_KEY",
    status: "可接入",
    description: "适合商业短视频镜头、动态画面和素材生成。"
  },
  {
    id: "minimax",
    provider: "MiniMax",
    name: "MiniMax",
    modelId: "minimax-latest / hailuo",
    capabilities: ["text", "audio", "video", "multimodal"],
    endpoint: "https://api.minimax.chat/v1",
    envKey: "MINIMAX_API_KEY",
    status: "可接入",
    description: "适合文本、语音、海螺视频和多模态内容生产。"
  },
  {
    id: "openai-gpt-5.5",
    provider: "ChatGPT / OpenAI",
    name: "GPT-5.5",
    modelId: "gpt-5.5",
    capabilities: ["text", "reasoning", "image", "multimodal"],
    endpoint: "https://api.openai.com/v1",
    envKey: "OPENAI_API_KEY",
    status: "默认",
    description: "默认主力模型，适合写稿、润色、评估、结构化输出和复杂内容工作流。"
  },
  {
    id: "openai-gpt-5.4",
    provider: "ChatGPT / OpenAI",
    name: "GPT-5.4",
    modelId: "gpt-5.4",
    capabilities: ["text", "reasoning", "image", "multimodal"],
    endpoint: "https://api.openai.com/v1",
    envKey: "OPENAI_API_KEY",
    status: "可接入",
    description: "通用高质量模型，适合日常写作、编辑、分析和多模态任务。"
  },
  {
    id: "openai-gpt-5.3-codex",
    provider: "ChatGPT / OpenAI",
    name: "GPT-5.3 Codex",
    modelId: "gpt-5.3-codex",
    capabilities: ["text", "reasoning"],
    endpoint: "https://api.openai.com/v1",
    envKey: "OPENAI_API_KEY",
    status: "可接入",
    description: "偏代码和工程任务，也可以用于复杂工作流规则生成。"
  },
  {
    id: "openai-gpt-5.2",
    provider: "ChatGPT / OpenAI",
    name: "GPT-5.2",
    modelId: "gpt-5.2",
    capabilities: ["text", "reasoning", "multimodal"],
    endpoint: "https://api.openai.com/v1",
    envKey: "OPENAI_API_KEY",
    status: "可接入",
    description: "稳定通用模型，适合保守生产环境和长任务。"
  },
  {
    id: "openai-gpt-4o",
    provider: "ChatGPT / OpenAI",
    name: "GPT-4o（兼容）",
    modelId: "gpt-4o",
    capabilities: ["text", "reasoning", "image", "multimodal"],
    endpoint: "https://api.openai.com/v1",
    envKey: "OPENAI_API_KEY",
    status: "可接入",
    description: "旧项目兼容项，不再作为默认模型。"
  },
  {
    id: "anthropic-claude",
    provider: "Claude",
    name: "Claude Latest",
    modelId: "claude-latest / claude-sonnet / claude-opus",
    capabilities: ["text", "reasoning", "multimodal"],
    endpoint: "https://api.anthropic.com/v1",
    envKey: "ANTHROPIC_API_KEY",
    status: "可接入",
    description: "适合长文编辑、复杂判断、文风控制和深度分析。"
  },
  {
    id: "google-gemini",
    provider: "Gemini",
    name: "Gemini Latest",
    modelId: "gemini-latest / gemini-pro / gemini-flash",
    capabilities: ["text", "reasoning", "image", "video", "multimodal"],
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    envKey: "GOOGLE_API_KEY",
    status: "可接入",
    description: "适合多模态理解、长上下文和 Google 生态模型调用。"
  },
  {
    id: "meta-llama",
    provider: "Llama",
    name: "Llama Latest",
    modelId: "llama-latest / llama-4",
    capabilities: ["text", "reasoning"],
    endpoint: "OpenAI-compatible endpoint",
    envKey: "LLAMA_API_KEY",
    status: "可接入",
    description: "适合自部署或第三方兼容接口。"
  },
  {
    id: "xai-grok",
    provider: "Grok",
    name: "Grok Latest",
    modelId: "grok-latest / grok",
    capabilities: ["text", "reasoning", "multimodal"],
    endpoint: "https://api.x.ai/v1",
    envKey: "XAI_API_KEY",
    status: "可接入",
    description: "适合热点、社交平台语境和实时性内容扩展。"
  },
  {
    id: "midjourney",
    provider: "Midjourney",
    name: "Midjourney",
    modelId: "midjourney",
    capabilities: ["image"],
    endpoint: "配置第三方 Midjourney API endpoint",
    envKey: "MIDJOURNEY_API_KEY",
    status: "待接入",
    description: "适合封面、视觉风格图和创意图像生成。"
  },
  {
    id: "black-forest-flux",
    provider: "Flux",
    name: "Flux",
    modelId: "flux-pro / flux-schnell",
    capabilities: ["image"],
    endpoint: "https://api.bfl.ai/v1",
    envKey: "FLUX_API_KEY",
    status: "可接入",
    description: "适合高质量图片、封面和分镜关键帧。"
  },
  {
    id: "stable-diffusion",
    provider: "Stable Diffusion",
    name: "Stable Diffusion",
    modelId: "sdxl / sd3",
    capabilities: ["image"],
    endpoint: "配置自部署或第三方 Stable Diffusion endpoint",
    envKey: "STABLE_DIFFUSION_API_KEY",
    status: "可接入",
    description: "适合自部署图片生成、风格化封面和素材图。"
  }
];

export function findApiModel(id: string | undefined): ApiModelConfig {
  return apiModels.find((model) => model.id === id) ?? apiModels.find((model) => model.id === defaultApiModelId) ?? apiModels[0]!;
}
