import type { ActiveSkills, Skill, SkillModule } from "./types";

export const builtinSkills: Skill[] = [
  {
    id: "write-wechat-depth",
    name: "公众号深度稿",
    module: "write",
    description: "适合观点型长文，强调判断、案例和清晰结构。",
    rules: ["先给判断", "每节保留一个具体场景", "避免空泛宏大词", "结尾落到行动或反思"],
    prompt: "写成公众号深度稿，观点要明确，案例要贴近真实工作场景。"
  },
  {
    id: "write-xhs-seeding",
    name: "小红书种草文",
    module: "write",
    description: "适合短段落、个人体验、轻种草表达。",
    rules: ["短段落", "用第一人称", "先说使用前后的差异", "少用官方词"],
    prompt: "写成小红书种草文，语气自然，保留个人判断和具体细节。"
  },
  {
    id: "write-zhihu-answer",
    name: "知乎回答",
    module: "write",
    description: "适合先结论后分析，兼顾可信度和可读性。",
    rules: ["开头直接回答", "用反例拆问题", "分点但不机械", "结尾补充边界条件"],
    prompt: "写成知乎回答，先给结论，再解释为什么。"
  },
  {
    id: "humanize-natural",
    name: "去 AI 味自然表达",
    module: "humanize",
    description: "保留原观点，降低模板腔、总结腔和过度顺滑的连接。",
    rules: ["保留原观点", "加入犹豫和取舍", "增加真实场景", "减少机械排比"],
    prompt: "只改表达，不改立场。让文字更像真实作者在组织观点。"
  },
  {
    id: "humanize-personal",
    name: "改成个人口吻",
    module: "humanize",
    description: "强化第一人称、现场感和判断痕迹。",
    rules: ["增加第一人称", "保留不完美停顿", "压低官样词", "用具体经历支撑观点"],
    prompt: "改成个人口吻，像作者自己写出来的。"
  },
  {
    id: "analyze-ai-tone",
    name: "AI 腔风险评分",
    module: "analyze",
    description: "从模板感、抽象词、句长均匀度等维度给风险参考。",
    rules: ["不承诺检测准确", "只给风险参考", "解释每个扣分项", "给可执行建议"],
    prompt: "评估文本 AI 腔风险，输出参考评分和具体原因。"
  },
  {
    id: "format-xhs",
    name: "小红书排版",
    module: "format",
    description: "短段落、强停顿、适合移动端扫描。",
    rules: ["每段不超过三行", "标题直接", "保留换行呼吸感", "末尾放互动句"],
    prompt: "排成小红书笔记，短段落，适合手机阅读。"
  },
  {
    id: "format-wechat",
    name: "公众号排版",
    module: "format",
    description: "标题层级清楚，适合长文阅读。",
    rules: ["保留小标题", "段落长度稳定", "重点句独立成段", "结尾收束"],
    prompt: "排成公众号长文，层级清晰，节奏稳。"
  },
  {
    id: "video-douyin-talk",
    name: "抖音口播 Skill",
    module: "video",
    description: "强钩子、短句、适合真人口播。",
    rules: ["前三秒抛问题", "每 10 秒有转折", "口语句优先", "结尾给关注或讨论点"],
    prompt: "生成抖音真人口播素材包，信息密度高但不端着。"
  },
  {
    id: "video-bilibili-knowledge",
    name: "B站知识视频 Skill",
    module: "video",
    description: "适合知识科普和观点解释，结构完整。",
    rules: ["先定义问题", "中段讲机制", "用例子解释", "结尾给延伸问题"],
    prompt: "生成 B 站知识视频素材包，有解释链路和示例。"
  },
  {
    id: "video-boss-ip",
    name: "视频号老板 IP Skill",
    module: "video",
    description: "适合老板 IP、行业观点和经营判断。",
    rules: ["观点要稳", "少夸张", "保留经营场景", "强调取舍和判断"],
    prompt: "生成视频号老板 IP 素材包，像一个经营者在讲自己的判断。"
  },
  {
    id: "video-happyhorse-prompt",
    name: "HappyHorse 视频 Prompt Skill",
    module: "video",
    description: "把选题、脚本或分镜整理成可复制到 HappyHorse 的视频提示词。",
    rules: ["不调用 API", "输出镜头运动", "标明画幅和时长", "补充声音、口型和字幕要求"],
    prompt: "生成 HappyHorse 视频提示词素材包，只输出可复制的 prompt、画幅、时长、镜头运动、声音和字幕要求，不调用任何 API。"
  }
];

export const defaultSkills: ActiveSkills = {
  write: "write-wechat-depth",
  humanize: "humanize-natural",
  analyze: "analyze-ai-tone",
  format: "format-xhs",
  video: "video-douyin-talk"
};

export function skillsByModule(module: SkillModule, skills = builtinSkills) {
  return skills.filter((skill) => skill.module === module);
}

export function findSkill(id: string | undefined, fallbackModule: SkillModule) {
  const fallbackId = defaultSkills[fallbackModule as keyof ActiveSkills];
  return builtinSkills.find((skill) => skill.id === id) ?? builtinSkills.find((skill) => skill.id === fallbackId) ?? builtinSkills[0];
}
