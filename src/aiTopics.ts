import type { DailyReport, FeedItem, FeedQuery, SourceFacet, Topic, TopicCount } from "./types";

export const AI_ALL_TOPIC_ID = "ai-all";

export const aiTopics: Topic[] = [
  {
    id: "ai-industry",
    title: "AI 行业进展",
    sourceKind: "topic_watcher",
    sourceTopicId: "ai",
    enabled: true,
    displayOrder: 1,
    ui: { icon: "Newspaper", accent: "#8b5cf6" }
  },
  {
    id: "ai-papers",
    title: "AI 论文前沿",
    sourceKind: "topic_watcher",
    sourceTopicId: "ai-papers",
    enabled: true,
    displayOrder: 2,
    ui: { icon: "FileText", accent: "#0f9f7f" }
  },
  {
    id: "ai-applications",
    title: "AI 应用案例",
    sourceKind: "topic_watcher",
    sourceTopicId: "ai-applications",
    enabled: true,
    displayOrder: 3,
    ui: { icon: "Sparkles", accent: "#f97316" }
  },
  {
    id: "ai-github",
    title: "GitHub AI 热榜",
    sourceKind: "topic_watcher",
    sourceTopicId: "ai-github-disabled",
    enabled: false,
    displayOrder: 4,
    ui: { icon: "Github", accent: "#38bdf8" }
  },
  {
    id: "ai-big-tech",
    title: "大厂 AI 日报",
    sourceKind: "topic_watcher",
    sourceTopicId: "big-tech-daily",
    enabled: true,
    displayOrder: 5,
    ui: { icon: "Building2", accent: "#2563eb" }
  }
];

const topicSourceNotes: Record<string, string> = {
  "ai-industry": "优先跟踪 CPT/SFT/RAG/RL/GRPO、推理上限、评测、模型基础设施与多市场 AI 落地信号。",
  "ai-papers": "优先收录大模型训练/后训练、Agent、工具调用、RAG、评测、推荐排序与地理智能相关论文。",
  "ai-applications": "聚焦 Agent Skill、Auto-Research、Agent Harness、AI Native 开发、深度研究和自动验证闭环。",
  "ai-github": "聚焦 Agent Coding、RAG、评测、数据闭环、召回排序、地理编码和自动化研究相关开源项目。",
  "ai-big-tech": "聚焦国内外大厂的大模型、Agent、AI Native、物流轨迹、地址理解、召排与多市场工程实践。"
};

// Curated local source catalog for the static collector.
// Add future sources here first; matching and source filters read from this catalog.
export const aiTopicSourceCatalog = {
  "ai-industry": [
    "Hugging Face",
    "OpenAI",
    "Anthropic",
    "Google DeepMind",
    "xAI",
    "Qwen：Blog Retrieval（API）",
    "Qwen：Research（API）",
    "字节 Seed：Research Feed（网页内嵌数据）",
    "NVIDIA AI Blog",
    "NVIDIA Technical Blog（开发者技术博客 · RSS）",
    "X：Rohan Paul (@rohanpaul_ai)",
    "X：Nathan Lambert (@natolambert)",
    "X：Noam Brown (@polynoamial)",
    "X：Ilya Sutskever (@ilyasut)",
    "X：Demis Hassabis (@demishassabis)",
    "X：Dario Amodei (@DarioAmodei)",
    "X：Artificial Analysis (@ArtificialAnlys)",
    "Claude",
    "The Decoder：AI News（RSS）",
    "X：阿易 AI Notes (@AYi_AInotes)",
    "X：Claude (@claudeai)",
    "X：Perplexity (@perplexity_ai)",
    "Nathan Lambert：Interconnects（RSS）",
    "Google Research：Blog（网页）",
    "X：Microsoft Research (@MSFTResearch)",
    "X：硅基流动 SiliconFlow (@SiliconFlowAI)",
    "X：Sundar Pichai (@sundarpichai)",
    "X：谢赛宁 (@sainingxie)",
    "X：Elvis Saravia (@omarsar0, DAIR.AI)",
    "X：SemiAnalysis (@SemiAnalysis_)",
    "X：swyx (@swyx)",
    "公众号：卡尔的AI沃茨",
    "公众号：数字生命卡兹克",
    "公众号：机器之心",
    "公众号：量子位",
    "公众号：新智元",
    "公众号：AI科技评论",
    "公众号：PaperWeekly",
    "公众号：机器学习实验室",
    "公众号：智能涌现",
    "公众号：夕小瑶科技说",
    "公众号：AINLP",
    "公众号：DataFunTalk",
    "公众号：AI科技大本营",
    "公众号：微软亚洲研究院",
    "公众号：阿里云开发者",
    "Artificial Intelligence News（RSS）",
    "Thinking Machines Lab：官方博客（RSS）",
    "公众号：小红书技术（dots.llm）",
    "X：Deedy Das (@deedydas)",
    "X：Eric Mitchell (@ericmitchellai)"
  ],
  "ai-papers": [
    "HuggingFace Daily Papers（社区热门论文）",
    "arXiv：Agent Harness / Auto-Research",
    "Anthropic：Transformer Circuits（可解释性研究）",
    "智谱：研究（网页内嵌数据）",
    "Qwen：Research（API）",
    "X：Andrej Karpathy (@karpathy)",
    "X：Sky Computing Lab (@haoailab)",
    "字节 Seed：Research Feed（网页内嵌数据）",
    "Berkeley RDI：Blog（AI 安全与评测）",
    "Lilian Weng：Lil'Log（RSS）",
    "X：Epoch AI (@EpochAIResearch)",
    "Google Research：Blog（网页）",
    "X：Microsoft Research (@MSFTResearch)",
    "X：Nathan Lambert (@natolambert)",
    "X：Noam Brown (@polynoamial)",
    "X：Jeff Dean (@JeffDean)",
    "X：Yann LeCun (@ylecun)",
    "X：Jason Liu (@jxnlco)",
    "Andrej Karpathy：Blog（网页）",
    "CMU：Machine Learning Blog",
    "公众号：PaperWeekly",
    "公众号：机器学习实验室",
    "公众号：智能涌现",
    "公众号：微软亚洲研究院",
    "X：Lilian Weng (@lilianweng)",
    "BAIR：Berkeley AI Research Blog"
  ],
  "ai-applications": [
    "OpenRouter",
    "arXiv：Agent Harness / Auto-Research",
    "X：OpenRouter (@OpenRouter)",
    "X：OpenAI Developers (@OpenAIDevs)",
    "Cursor",
    "X：Claude Devs (@ClaudeDevs)",
    "X：Replit (@Replit)",
    "Simon Willison 博客",
    "Steve Yegge：Medium（RSS）",
    "X：Boris Cherny (@bcherny)",
    "X：opencode (@opencode)",
    "X：Jason Liu (@jxnlco)",
    "X：邵猛 (@shao__meng)",
    "X：小互 (@xiaohu)",
    "Google Developers",
    "蚂蚁百灵：Developer Blog（网页）",
    "X：Google AI for Developers (@googleaidevs)",
    "NVIDIA Technical Blog（开发者技术博客 · RSS）",
    "X：阶跃星辰 StepFun (@StepFun_ai)",
    "公众号：月之暗面（Kimi）",
    "公众号：DeepSeek（深度求索）",
    "公众号：千问APP（阿里）",
    "公众号：智谱（GLM）",
    "公众号：面壁智能（MiniCPM）",
    "公众号：蚂蚁百灵（Ling）",
    "公众号：阶跃星辰（Step）",
    "公众号：昆仑万维（天工）",
    "公众号：生数科技（Vidu·视频）",
    "公众号：可灵AI（快手·视频）",
    "公众号：数字生命卡兹克",
    "公众号：机器之心",
    "公众号：量子位",
    "公众号：新智元",
    "公众号：AI科技评论",
    "公众号：AI科技大本营",
    "公众号：InfoQ",
    "公众号：PaperWeekly",
    "公众号：DataFunTalk",
    "公众号：智能涌现",
    "公众号：高德技术",
    "公众号：阿里技术",
    "公众号：阿里云开发者",
    "公众号：机器学习实验室",
    "公众号：微软亚洲研究院",
    "X：DeepSeek (@deepseek_ai)",
    "MiniMax：Blog（网页）",
    "NVIDIA Blog：Agentic AI（网页）",
    "X：Kimi.ai (@Kimi_Moonshot)",
    "MiniMax：News（网页）",
    "Moonshot AI：Kimi Blog（VitePress）",
    "公众号：京东JoyAI",
    "公众号：MiniMax（稀宇科技）",
    "公众号：豆包（字节）",
    "公众号：生数科技（Vidu·视频）",
    "公众号：可灵AI（快手·视频）",
    "公众号：腾讯元宝",
    "公众号：小红书技术（dots.llm）"
  ],
  "ai-github": [],
  "ai-big-tech": [
    "OpenAI",
    "Anthropic",
    "X：阿里云 / Alibaba Cloud (@alibaba_cloud)",
    "Google DeepMind",
    "xAI",
    "X：OpenAI Developers (@OpenAIDevs)",
    "大厂日爆",
    "X：OpenAI (@OpenAI)",
    "Anthropic：Transformer Circuits（可解释性研究）",
    "X：Anthropic (@AnthropicAI)",
    "X：Google AI for Developers (@googleaidevs)",
    "NVIDIA Technical Blog（开发者技术博客 · RSS）",
    "Google Blog：AI（RSS）",
    "X：xAI (@xai)",
    "X：Google DeepMind (@GoogleDeepMind)",
    "NVIDIA AI Blog",
    "X：腾讯混元 (@TencentHunyuan)",
    "X：阶跃星辰 StepFun (@StepFun_ai)",
    "智谱：研究（网页内嵌数据）",
    "Qwen：Blog Retrieval（API）",
    "Qwen：Research（API）",
    "X：百度 Baidu (@Baidu_Inc)",
    "X：Google AI (@GoogleAI)",
    "X：NVIDIA AI (@NVIDIAAI)",
    "公众号：月之暗面（Kimi）",
    "公众号：DeepSeek（深度求索）",
    "X：DeepSeek (@deepseek_ai)",
    "X：NVIDIA (@nvidia)",
    "公众号：千问APP（阿里）",
    "MiniMax：Blog（网页）",
    "NVIDIA Blog：Agentic AI（网页）",
    "NVIDIA Blog：Generative AI（网页）",
    "公众号：智谱（GLM）",
    "公众号：面壁智能（MiniCPM）",
    "公众号：蚂蚁百灵（Ling）",
    "公众号：阶跃星辰（Step）",
    "公众号：昆仑万维（天工）",
    "公众号：数字生命卡兹克",
    "公众号：机器之心",
    "公众号：量子位",
    "公众号：新智元",
    "公众号：AI科技评论",
    "公众号：AI科技大本营",
    "公众号：InfoQ",
    "公众号：PaperWeekly",
    "公众号：AINLP",
    "公众号：DataFunTalk",
    "公众号：机器学习实验室",
    "公众号：智能涌现",
    "公众号：微软亚洲研究院",
    "字节 Seed：Research Feed（网页内嵌数据）",
    "X：智谱 Z.ai (@Zai_org)",
    "X：Kimi.ai (@Kimi_Moonshot)",
    "公众号：百度智能云（文心）",
    "公众号：腾讯混元",
    "MiniMax：News（网页）",
    "Moonshot AI：Kimi Blog（VitePress）",
    "公众号：京东JoyAI",
    "公众号：MiniMax（稀宇科技）",
    "X：AI at Meta (@AIatMeta)",
    "公众号：豆包（字节）",
    "公众号：腾讯元宝",
    "X：华为云 (@HuaweiCloud1)",
    "Google Developers",
    "Meta",
    "Meta Engineering Blog（RSS）",
    "X：通义千问 / Qwen (@Alibaba_Qwen)",
    "X：蚂蚁百灵 (@AntLingAGI)",
    "X：小米 MiMo (@XiaomiMiMo)",
    "公众号：龙猫LongCat（美团）",
    "公众号：蚂蚁百灵（Ling）",
    "公众号：面壁智能（MiniCPM）",
    "公众号：小米 MiMo",
    "公众号：阶跃星辰（Step）",
    "公众号：字节跳动技术团队",
    "公众号：阿里技术",
    "公众号：阿里云开发者",
    "公众号：高德技术",
    "公众号：腾讯技术工程",
    "公众号：腾讯云开发者",
    "公众号：美团技术团队",
    "公众号：百度Geek说",
    "公众号：百度智能云技术",
    "公众号：快手技术",
    "公众号：京东云开发者",
    "公众号：华为云开发者联盟",
    "公众号：蚂蚁技术AntTech",
    "公众号：小红书技术",
    "公众号：小红书技术（dots.llm）",
    "公众号：携程技术",
    "公众号：网易云音乐技术团队",
    "公众号：网易数帆",
    "公众号：得物技术",
    "公众号：vivo互联网技术",
    "公众号：OPPO数智技术",
    "公众号：哔哩哔哩技术"
  ]
} as const satisfies Record<string, readonly string[]>;

const aiOnlyWeixinTechSources = [
  "公众号：字节跳动技术团队",
  "公众号：阿里技术",
  "公众号：阿里云开发者",
  "公众号：腾讯技术工程",
  "公众号：腾讯云开发者",
  "公众号：美团技术团队",
  "公众号：百度Geek说",
  "公众号：百度智能云技术",
  "公众号：快手技术",
  "公众号：京东云开发者",
  "公众号：华为云开发者联盟",
  "公众号：蚂蚁技术AntTech",
  "公众号：小红书技术",
  "公众号：小红书技术（dots.llm）",
  "公众号：携程技术",
  "公众号：网易云音乐技术团队",
  "公众号：网易数帆",
  "公众号：得物技术",
  "公众号：vivo互联网技术",
  "公众号：OPPO数智技术",
  "公众号：哔哩哔哩技术",
  "公众号：龙猫LongCat（美团）",
  "公众号：蚂蚁百灵（Ling）",
  "公众号：面壁智能（MiniCPM）",
  "公众号：小米 MiMo",
  "公众号：阶跃星辰（Step）",
  "公众号：昆仑万维（天工）",
  "公众号：生数科技（Vidu·视频）",
  "公众号：数字生命卡兹克",
  "公众号：机器之心",
  "公众号：量子位",
  "公众号：新智元",
  "公众号：AI科技评论",
  "公众号：AI科技大本营",
  "公众号：InfoQ",
  "公众号：PaperWeekly",
  "公众号：机器学习实验室",
  "公众号：智能涌现",
  "公众号：夕小瑶科技说",
  "公众号：AINLP",
  "公众号：DataFunTalk",
  "公众号：微软亚洲研究院",
  "公众号：高德技术",
  "公众号：大模型技术前沿",
  "公众号：AIGC开放社区"
];

const okrFilteredTechnicalSources = [
  ...aiOnlyWeixinTechSources,
  "Hacker News 热门（buzzing.cc 中文翻译）",
  "Hacker News",
  "Google Developers",
  "Apple",
  "Meta Engineering Blog（RSS）",
  "NVIDIA Technical Blog（开发者技术博客 · RSS）",
  "蚂蚁百灵：Developer Blog（网页）",
  "Simon Willison 博客",
  "Steve Yegge：Medium（RSS）"
];

const aiSourceTerms = [
  " ai ",
  "：ai",
  " ai（",
  "openai",
  "anthropic",
  "claude",
  "deepmind",
  "gemini",
  "xai",
  "grok",
  "hugging",
  "cursor",
  "replit",
  "minimax",
  "kimi",
  "moonshot",
  "deepseek",
  "智谱",
  "腾讯",
  "豆包",
  "字节",
  "百度",
  "华为",
  "阿里",
  "nvidia",
  "agent",
  "agent harness",
  "harness engineering",
  "harness engineer",
  "llm",
  "paper",
  "论文",
  "大厂"
];

const aiArticleTerms = [
  ...aiSourceTerms,
  "大模型",
  "模型",
  "智能体",
  "智能助手",
  "生成式",
  "多模态",
  "视觉语言",
  "推理",
  "训练",
  "微调",
  "rag",
  "mcp",
  "embedding",
  "向量",
  "transformer",
  "diffusion",
  "aigc",
  "机器学习",
  "深度学习",
  "推荐模型",
  "算法模型",
  "cpt",
  "sft",
  "rlhf",
  "grpo",
  "dpo",
  "强化学习",
  "后训练",
  "预训练",
  "持续训练",
  "推理上限",
  "上下文工程",
  "prompt",
  "评测",
  "benchmark",
  "eval",
  "tool use",
  "tools",
  "工具调用",
  "function calling",
  "skill",
  "skills",
  "skill library",
  "skill registry",
  "skill ecosystem",
  "技能",
  "技能库",
  "技能注册",
  "coding agent",
  "agent coding",
  "claude code",
  "cursor",
  "opencode",
  "auto-research",
  "autonomous research",
  "deep research",
  "research harness",
  "agent harness",
  "harness",
  "loop engineer",
  "loop engineering",
  "design engineer",
  "harness optimization",
  "retrospective harness optimization",
  "rho",
  "trajectory rollout",
  "rollout",
  "trajectory",
  "claim audit",
  "claim ledger",
  "evidence ledger",
  "self-improvement loop",
  "self improvement loop",
  "feedback loop",
  "closed loop",
  "verification loop",
  "evaluation harness",
  "自动研究",
  "深度研究",
  "自动开发",
  "自动验证",
  "研究脚手架",
  "智能体脚手架",
  "轨迹回放",
  "轨迹优化",
  "证据链",
  "声明审计",
  "闭环优化",
  "自我改进",
  "数据闭环",
  "物流",
  "轨迹",
  "包裹",
  "履约",
  "配送",
  "异常识别",
  "eta",
  "下一站",
  "ai summary",
  "地址",
  "地理编码",
  "geocode",
  "geocoder",
  "poi",
  "地址纠错",
  "地址修正",
  "地址补全",
  "autocomplete",
  "召回",
  "排序",
  "rerank",
  "ranking",
  "auc",
  "多市场",
  "localization"
];

const modelTrainingTerms = [
  "cpt",
  "sft",
  "rl",
  "rlhf",
  "grpo",
  "dpo",
  "rag",
  "pretrain",
  "post-training",
  "reasoning",
  "inference",
  "eval",
  "benchmark",
  "预训练",
  "后训练",
  "推理",
  "评测",
  "模型训练",
  "模型推理"
];

const agentSkillTerms = [
  "agent",
  "skill",
  "mcp",
  "tool use",
  "tools as skills",
  "function calling",
  "claude code",
  "cursor",
  "replit",
  "opencode",
  "coding agent",
  "design engineer",
  "loop engineer",
  "harness engineer",
  "workflow engineer",
  "智能体",
  "工具调用",
  "技能",
  "设计工程师",
  "循环工程师",
  "技能工程",
  "研发提效",
  "ai native"
];

const autoResearchTerms = [
  "auto-research",
  "autonomous research",
  "deep research",
  "research harness",
  "agent harness",
  "harness",
  "harness optimization",
  "retrospective harness optimization",
  "rho",
  "trajectory",
  "trajectory rollout",
  "rollout",
  "long-horizon",
  "long horizon",
  "claim audit",
  "claim ledger",
  "evidence ledger",
  "assurance layer",
  "self-improvement loop",
  "self improvement loop",
  "feedback loop",
  "closed loop",
  "verification loop",
  "evaluation harness",
  "自动研究",
  "深度研究",
  "自动开发",
  "自动验证",
  "研究脚手架",
  "智能体脚手架",
  "长程任务",
  "长时域",
  "轨迹回放",
  "轨迹优化",
  "声明审计",
  "证据链",
  "保障层",
  "闭环优化",
  "自我改进",
  "问题诊断",
  "效果验证",
  "数据闭环",
  "自进化"
];

const logisticsAddressTerms = [
  "物流",
  "轨迹",
  "包裹",
  "履约",
  "eta",
  "下一站",
  "异常识别",
  "地址",
  "地理编码",
  "geocode",
  "poi",
  "地址纠错",
  "地址修正",
  "地址补全",
  "autocomplete",
  "召回",
  "排序",
  "rerank",
  "ranking",
  "auc",
  "多市场"
];

const okrCoreTerms = [
  ...modelTrainingTerms,
  ...agentSkillTerms,
  ...autoResearchTerms,
  ...logisticsAddressTerms,
  "llm",
  "large language model",
  "foundation model",
  "language model",
  "moe",
  "transformer",
  "attention",
  "long context",
  "context window",
  "speculative decoding",
  "serving",
  "latency",
  "throughput",
  "token",
  "tokens",
  "gpu",
  "h100",
  "h200",
  "infrastructure",
  "training infrastructure",
  "inference infrastructure",
  "data flywheel",
  "retrieval",
  "reranker",
  "reranking",
  "ranking model",
  "recommendation",
  "recommendation model",
  "address parsing",
  "address normalization",
  "route",
  "routing",
  "last mile",
  "delivery",
  "shipment",
  "fulfillment",
  "大模型",
  "基础模型",
  "语言模型",
  "模型架构",
  "混合专家",
  "稀疏注意力",
  "长上下文",
  "投机解码",
  "解码",
  "吞吐",
  "延迟",
  "算力",
  "训练架构",
  "推理架构",
  "训练平台",
  "推理平台",
  "模型服务",
  "数据飞轮",
  "检索增强",
  "重排",
  "召排",
  "推荐排序",
  "地址解析",
  "地址标准化",
  "路径规划",
  "末端配送",
  "履约链路",
  "消费者体验",
  "代码生成",
  "代码智能体"
];

const paperTerms = [
  "arxiv",
  "iclr",
  "icml",
  "neurips",
  "cvpr",
  "acl",
  "agent harness",
  "research harness",
  "harness optimization",
  "retrospective harness optimization",
  "autonomous research",
  "trajectory rollout",
  "claim audit",
  "huggingface daily papers",
  "bair",
  "cmu",
  "berkeley",
  "google research",
  "microsoft research",
  "transformer circuits",
  "lilian weng"
];

const applicationTerms = [
  "agent",
  "harness",
  "agent harness",
  "loop engineer",
  "design engineer",
  "workflow engineer",
  "auto-research",
  "deep research",
  "research workflow",
  "self-improvement loop",
  "trajectory",
  "builder",
  "app",
  "developers",
  "cursor",
  "replit",
  "testing catalog",
  "kimi",
  "minimax",
  "元宝",
  "豆包",
  "可灵",
  "vidu",
  "应用",
  "工具",
  "产品",
  "开发者",
  "设计工程师",
  "循环工程师",
  "工作流工程",
  "研究工作流",
  "闭环优化",
  "自我改进",
  "编程",
  "办公",
  "语音",
  "视频"
];

const bigTechTerms = [
  "openai",
  "anthropic",
  "google",
  "deepmind",
  "gemini",
  "meta",
  "xai",
  "microsoft",
  "apple",
  "nvidia",
  "alibaba",
  "阿里",
  "腾讯",
  "字节",
  "豆包",
  "百度",
  "华为",
  "小米",
  "京东",
  "美团",
  "moonshot",
  "kimi",
  "minimax",
  "deepseek",
  "智谱",
  "大厂"
];

const topicArticleTerms: Record<string, readonly string[]> = {
  "ai-industry": [...okrCoreTerms],
  "ai-papers": [...okrCoreTerms, ...paperTerms],
  "ai-applications": [...agentSkillTerms, ...autoResearchTerms, ...modelTrainingTerms, "workflow", "developer", "开发者", "工作流"],
  "ai-github": [...agentSkillTerms, ...autoResearchTerms, ...logisticsAddressTerms, "library", "framework", "repo", "仓库", "框架"],
  "ai-big-tech": [
    ...okrCoreTerms,
    "ai native",
    "研发提效",
    "组织提效",
    "模型团队",
    "基础模型",
    "算法",
    "工程实践"
  ]
};

const lowRelevanceArticleTerms = [
  "输入法",
  "广告本地化",
  "meme",
  "mpv",
  "尊界",
  "汽车",
  "智驾芯片",
  "电池",
  "风电",
  "航天",
  "火箭",
  "融资",
  "估值",
  "股价",
  "财报",
  "利润",
  "客户公司",
  "驻场工程师",
  "云市场",
  "算力变现",
  "过剩ai算力",
  "裁员",
  "涨薪",
  "实习生",
  "换帅",
  "庭审",
  "商标",
  "跳槽",
  "人事",
  "组织调整",
  "消费电子",
  "机器人马拉松"
];

const dailyTechnicalSignalTerms = [
  ...modelTrainingTerms,
  ...agentSkillTerms,
  ...autoResearchTerms,
  ...logisticsAddressTerms,
  "architecture",
  "benchmark",
  "developer",
  "framework",
  "infrastructure",
  "latency",
  "throughput",
  "serving",
  "代码",
  "开发者",
  "工程",
  "架构",
  "框架",
  "平台",
  "基础设施",
  "性能",
  "吞吐",
  "延迟",
  "开源",
  "开放权重",
  "训练",
  "推理",
  "工具",
  "工作流",
  "评测"
];

const dailyBusinessOnlyTerms = [
  "商业化",
  "市场",
  "客户公司",
  "驻场工程师",
  "云市场",
  "算力变现",
  "数据中心所有权",
  "收入",
  "成本",
  "美元",
  "估值",
  "融资"
];

export function getAiTopicTooltip(topic: Topic) {
  return topicSourceNotes[topic.id] ?? `${topic.title} / AI 聚合主题`;
}

export function toBackendFeedQuery(query: FeedQuery): FeedQuery {
  const { topicId, ...rest } = query;
  const backendQuery = rest.sourceHostname ? { ...rest, sourceName: undefined } : rest;
  if (topicId === "ai-github") return backendQuery;
  if (topicId === "ai-big-tech") return { ...backendQuery, topicId: "big-tech-daily" };
  if (topicId === "ai-industry" || topicId === "ai-papers" || topicId === "ai-applications") {
    return { ...backendQuery, topicId: "ai" };
  }
  return backendQuery;
}

export function filterAiFeedItems(items: FeedItem[], topicId?: string) {
  return items.filter((item) => matchesAiTopic(item, topicId));
}

export function filterAiSourceFacets(facets: SourceFacet[], topicId?: string) {
  return facets.filter((facet) => matchesAiSource(facet, topicId));
}

export function getAiSourceCatalogTotal(topicId?: string) {
  if (topicId && hasCatalog(topicId)) {
    return aiTopicSourceCatalog[topicId as keyof typeof aiTopicSourceCatalog].length;
  }
  return new Set(Object.values(aiTopicSourceCatalog).flat()).size;
}

export function mergeAiCatalogSources(facets: SourceFacet[], topicId?: string) {
  const sourceNames: string[] = getCatalogSourceNames(topicId);
  const byName = new Map(facets.map((facet) => [facet.sourceName, facet]));
  const merged = sourceNames.map((sourceName) => {
    return byName.get(sourceName) ?? {
      sourceKind: inferSourceKind(sourceName),
      sourceName,
      count: 0
    };
  });

  return merged;
}

export function getAiTopicCounts(items: FeedItem[], sourceFacets: SourceFacet[], backendCounts: TopicCount[]) {
  const counts = aiTopics.map((topic) => ({
    topicId: topic.id,
    count: filterAiFeedItems(items, topic.id).length ||
      getBackendTopicCount(backendCounts, topic.id) ||
      getBackendTopicCount(backendCounts, topic.sourceTopicId) ||
      countSourcesForTopic(sourceFacets, topic.id)
  }));

  return [
    {
      topicId: AI_ALL_TOPIC_ID,
      count: filterAiFeedItems(items).length ||
        getBackendTopicCount(backendCounts, AI_ALL_TOPIC_ID) ||
        getBackendTopicCount(backendCounts, "ai") ||
        countSourcesForTopic(sourceFacets)
    },
    ...counts
  ];
}

export function filterAiDailyReports(reports: DailyReport[]) {
  return reports
    .filter((report) => ["ai", "big-tech-daily"].includes(report.topicId))
    .map((report) => optimizeAiDailyReport(report));
}

function matchesAiTopic(item: FeedItem, topicId?: string): boolean {
  if (isGithubSource(item.sourceKind, item.sourceName)) return false;
  if (topicId && hasCatalog(topicId)) {
    return catalogIncludesSource(topicId, item.sourceName) && isOkrRelevantItem(item, topicId);
  }
  return catalogIncludesAnySource(item.sourceName) && isOkrRelevantItem(item);
}

function matchesAiSource(facet: SourceFacet, topicId?: string): boolean {
  if (isGithubSource(facet.sourceKind, facet.sourceName)) return false;
  if (topicId && hasCatalog(topicId)) return catalogIncludesSource(topicId, facet.sourceName);
  if (!topicId) return catalogIncludesAnySource(facet.sourceName);
  return catalogIncludesAnySource(facet.sourceName);
}

function isGithubSource(sourceKind: string, sourceName: string) {
  return sourceKind === "github" || sourceName.toLowerCase().includes("github");
}

function catalogIncludesSource(topicId: string, sourceName: string) {
  const catalog = aiTopicSourceCatalog[topicId as keyof typeof aiTopicSourceCatalog];
  return Boolean((catalog as readonly string[] | undefined)?.includes(sourceName));
}

function hasCatalog(topicId: string) {
  return topicId in aiTopicSourceCatalog;
}

function catalogIncludesAnySource(sourceName: string) {
  return Object.values(aiTopicSourceCatalog).some((catalog) => (catalog as readonly string[]).includes(sourceName));
}

function isOkrFilteredTechnicalSource(sourceName: string) {
  return okrFilteredTechnicalSources.includes(sourceName);
}

function isOkrRelevantItem(item: FeedItem, topicId?: string) {
  if (item.importanceScore <= 0) return false;
  if (textIncludes(item, lowRelevanceArticleTerms)) return false;
  if (isOkrFilteredTechnicalSource(item.sourceName)) return textIncludes(item, getArticleTerms(topicId));
  return textIncludes(item, getArticleTerms(topicId));
}

function optimizeAiDailyReport(report: DailyReport): DailyReport {
  const highConfidenceSections = report.sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isOkrRelevantDailyItem(item, report.topicId)).slice(0, 6)
    }))
    .filter((section) => section.items.length > 0);

  const fallbackSections = report.sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isDailyFallbackCandidate(item)).slice(0, 5)
    }))
    .filter((section) => section.items.length > 0);
  const sections = highConfidenceSections.length > 0 ? highConfidenceSections : fallbackSections;
  const relevantItems = sections.flatMap((section) => section.items);
  const referencedFeedItemIds = [...new Set(relevantItems.flatMap((item) => item.sourceFeedItemIds ?? []))];

  return {
    ...report,
    mainLine: buildDailyMainLine(report, sections),
    sections,
    referencedFeedItemIds,
    watchItems: buildDailyWatchItems(relevantItems, report.watchItems),
    actionItems: buildDailyActionItems(relevantItems, report.actionItems)
  };
}

function isOkrRelevantDailyItem(item: DailyReport["sections"][number]["items"][number], topicId: string) {
  if (dailyTextIncludes(item, lowRelevanceArticleTerms)) return false;
  if (dailyTextIncludes(item, dailyBusinessOnlyTerms) && !dailyTextIncludes(item, dailyTechnicalSignalTerms)) return false;
  return dailyTextIncludes(item, getDailyArticleTerms(topicId)) && dailyTextIncludes(item, dailyTechnicalSignalTerms);
}

function isDailyFallbackCandidate(item: DailyReport["sections"][number]["items"][number]) {
  if (dailyTextIncludes(item, lowRelevanceArticleTerms)) return false;
  if (dailyTextIncludes(item, dailyBusinessOnlyTerms) && !dailyTextIncludes(item, dailyTechnicalSignalTerms)) return false;
  return true;
}

function getDailyArticleTerms(topicId: string) {
  if (topicId === "big-tech-daily") return topicArticleTerms["ai-big-tech"];
  if (topicId in topicArticleTerms) return topicArticleTerms[topicId];
  return okrCoreTerms;
}

function buildDailyMainLine(report: DailyReport, sections: DailyReport["sections"]) {
  const items = sections.flatMap((section) => section.items);
  if (items.length === 0) {
    return "今日预生成日报里没有筛出与当前 OKR 高相关的条目。建议优先查看动态页的分钟级更新，等待模型训练/推理、Agent Skill、Auto-Research、物流轨迹或地址召排相关信号进入日报。";
  }

  const topTitles = items.slice(0, 2).map((item) => `「${item.title}」`).join("、");
  const focus = report.topicId === "big-tech-daily"
    ? "大厂基础模型、Agent 工程、AI Native 研发与可复制的工程实践"
    : "大模型训练/推理上限、Agent Skill、Auto-Research/Harness 与物流/地址召排基础设施";

  return `今日筛出 ${items.length} 条高相关信号，优先看 ${topTitles}。脉络集中在${focus}，更适合用于判断能力变化、研发提效机会和多市场复制落地节奏。`;
}

function buildDailyWatchItems(items: DailyReport["sections"][number]["items"], fallbackItems: string[]) {
  const generated = items.slice(0, 4).map((item) => `跟进：${item.title}`);
  return generated.length > 0 ? generated : fallbackItems.filter((item) => !includesAny(normalizedText(item), lowRelevanceArticleTerms)).slice(0, 4);
}

function buildDailyActionItems(items: DailyReport["sections"][number]["items"], fallbackItems: string[]) {
  const generated = items
    .filter((item) => dailyTextIncludes(item, [...agentSkillTerms, ...autoResearchTerms, ...logisticsAddressTerms]))
    .slice(0, 3)
    .map((item) => `评估是否可沉淀到团队 AI Native / Agent 自进化链路：${item.title}`);

  return generated.length > 0 ? generated : fallbackItems.filter((item) => !includesAny(normalizedText(item), lowRelevanceArticleTerms)).slice(0, 3);
}

function getArticleTerms(topicId?: string) {
  if (topicId && topicId in topicArticleTerms) return topicArticleTerms[topicId];
  return [
    ...okrCoreTerms
  ];
}

function getCatalogSourceNames(topicId?: string) {
  if (topicId && hasCatalog(topicId)) {
    return [...aiTopicSourceCatalog[topicId as keyof typeof aiTopicSourceCatalog]];
  }
  return [...new Set(Object.values(aiTopicSourceCatalog).flat())];
}

function inferSourceKind(sourceName: string) {
  if (sourceName.startsWith("X：")) return "x";
  if (sourceName.startsWith("公众号：")) return "weixin_article";
  if (sourceName.toLowerCase().includes("github")) return "github";
  return "website";
}

function textIncludes(item: FeedItem, terms: readonly string[]) {
  const rawText = item.raw ? JSON.stringify(item.raw) : "";
  return includesAny(
    normalizedText([item.title, item.summary, item.whyItMatters, item.actionText, item.watchText, rawText].join(" ")),
    terms
  );
}

function dailyTextIncludes(item: DailyReport["sections"][number]["items"][number], terms: readonly string[]) {
  return includesAny(normalizedText([item.title, item.summary, item.insightLabel, item.insightText].join(" ")), terms);
}

function countSourcesForTopic(facets: SourceFacet[], topicId?: string) {
  return filterAiSourceFacets(facets, topicId).reduce((sum, facet) => sum + facet.count, 0);
}

function getBackendTopicCount(counts: TopicCount[], topicId: string) {
  return counts.find((count) => count.topicId === topicId)?.count ?? 0;
}

function includesAny(haystack: string, terms: readonly string[]) {
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

function normalizedText(value: string) {
  return value.toLowerCase();
}
