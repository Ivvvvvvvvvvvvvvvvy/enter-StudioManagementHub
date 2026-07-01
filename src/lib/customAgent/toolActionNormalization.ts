export type Locale = 'en' | 'zh';

type ToolCall = {
  id?: string;
  toolCallId?: string;
  tool_call_id?: string;
  name?: string;
  functionName?: string;
  toolName?: string;
  function?: {
    name?: string;
    arguments?: string | Record<string, unknown>;
  };
  args?: string | Record<string, unknown>;
  arguments?: string | Record<string, unknown>;
};

type ToolResultMessage = {
  role?: string;
  toolCallId?: string;
  tool_call_id?: string;
  content?: unknown;
};

export type CustomAgentActionView = {
  id: string;
  toolName: string;
  icon: 'globe' | 'file' | 'pencil' | 'terminal' | 'skill' | 'question' | 'mcp' | 'tool';
  loadingVerb: string;
  finishedVerb: string;
  localizedVerb: string;
  target: string;
  status: 'loading' | 'finished';
  debugRaw?: unknown;
};

type ToolDisplay = {
  icon: CustomAgentActionView['icon'];
  en: { loading: string; finished: string };
  zh: { loading: string; finished: string };
};

const TOOL_ALIASES: Record<string, string> = {
  web_search: 'WebSearch',
  web_fetch: 'WebFetch',
  read_file: 'Read',
  write_file: 'Write',
  edit_file: 'Edit',
  multi_edit_file: 'MultiEdit',
  bash: 'Bash',
  ask_user_question: 'AskUserQuestion',
};

const TOOL_DISPLAY: Record<string, ToolDisplay> = {
  WebSearch: {
    icon: 'globe',
    en: { loading: 'Searching websites', finished: 'Searched websites' },
    zh: { loading: '正在搜索网站', finished: '已搜索网站' },
  },
  WebFetch: {
    icon: 'globe',
    en: { loading: 'Reading website', finished: 'Read website' },
    zh: { loading: '正在读取网站', finished: '已读取网站' },
  },
  Read: {
    icon: 'file',
    en: { loading: 'Reading', finished: 'Read' },
    zh: { loading: '正在读取', finished: '已读取' },
  },
  Diff: {
    icon: 'file',
    en: { loading: 'Reading', finished: 'Read' },
    zh: { loading: '正在读取', finished: '已读取' },
  },
  PDF: {
    icon: 'file',
    en: { loading: 'Reading', finished: 'Read' },
    zh: { loading: '正在读取', finished: '已读取' },
  },
  Write: {
    icon: 'pencil',
    en: { loading: 'Writing', finished: 'Wrote' },
    zh: { loading: '正在写入', finished: '已写入' },
  },
  Edit: {
    icon: 'pencil',
    en: { loading: 'Editing', finished: 'Edited' },
    zh: { loading: '正在编辑', finished: '已编辑' },
  },
  MultiEdit: {
    icon: 'pencil',
    en: { loading: 'Editing', finished: 'Edited' },
    zh: { loading: '正在编辑', finished: '已编辑' },
  },
  Bash: {
    icon: 'terminal',
    en: { loading: 'Running', finished: 'Ran' },
    zh: { loading: '正在运行', finished: '已运行' },
  },
  Skill: {
    icon: 'skill',
    en: { loading: 'Activating skill', finished: 'Activated skill' },
    zh: { loading: '正在激活技能', finished: '已激活技能' },
  },
  AskUserQuestion: {
    icon: 'question',
    en: { loading: 'Preparing question', finished: 'Prepared question' },
    zh: { loading: '正在准备问题', finished: '已准备问题' },
  },
};

const FALLBACK_DISPLAY: ToolDisplay = {
  icon: 'tool',
  en: { loading: 'Running tool', finished: 'Ran tool' },
  zh: { loading: '正在调用工具', finished: '已调用工具' },
};

export function normalizeToolActions(
  messages: readonly unknown[],
  options: {
    locale?: Locale;
    forceStatus?: 'loading' | 'finished';
    includeDebugRaw?: boolean;
  } = {},
): CustomAgentActionView[] {
  const locale = options.locale ?? 'en';
  const results = new Map<string, ToolResultMessage>();

  for (const raw of messages) {
    const message = raw as ToolResultMessage;
    const id = toolResultId(message);
    if ((message.role === 'tool' || id) && id) {
      results.set(id, message);
    }
  }

  const actions: CustomAgentActionView[] = [];

  for (const raw of messages) {
    const message = raw as { role?: string; toolCalls?: ToolCall[]; tool_calls?: ToolCall[] };
    const calls = Array.isArray(message.toolCalls)
      ? message.toolCalls
      : Array.isArray(message.tool_calls)
        ? message.tool_calls
        : [];
    if (message.role !== 'assistant' || calls.length === 0) continue;

    for (const call of calls) {
      const id = callId(call, `tool:${actions.length}`);
      const toolName = normalizeToolName(callName(call));
      const args = parseArgs(callArgs(call));
      const result = results.get(id);
      const status = options.forceStatus ?? (result ? 'finished' : 'loading');
      const display = toolName.startsWith('mcp__')
        ? mcpDisplay(locale)
        : TOOL_DISPLAY[toolName] ?? FALLBACK_DISPLAY;
      const verbs = display[locale];

      actions.push({
        id,
        toolName,
        icon: display.icon,
        loadingVerb: verbs.loading,
        finishedVerb: verbs.finished,
        localizedVerb: status === 'finished' ? verbs.finished : verbs.loading,
        target: targetForTool(toolName, args, locale),
        status,
        ...(options.includeDebugRaw ? { debugRaw: { call, result } } : {}),
      });
    }
  }

  // Collapse duplicate actions: the agent may emit the same skill/tool call
  // several times in one turn, which would otherwise render as identical rows.
  const seen = new Set<string>();
  const deduped: CustomAgentActionView[] = [];
  for (const action of actions) {
    const key = `${action.toolName}|${action.target}|${action.status}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(action);
  }

  return deduped;
}

function parseArgs(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function callId(call: ToolCall, fallback: string): string {
  return text(call.id) ?? text(call.toolCallId) ?? text(call.tool_call_id) ?? fallback;
}

function callName(call: ToolCall): string {
  return text(call.function?.name) ?? text(call.functionName) ?? text(call.toolName) ?? text(call.name) ?? 'Tool';
}

function callArgs(call: ToolCall): unknown {
  return call.function?.arguments ?? call.args ?? call.arguments;
}

function toolResultId(message: ToolResultMessage): string | null {
  return text(message.toolCallId) ?? text(message.tool_call_id);
}

function normalizeToolName(name: string): string {
  if (name.startsWith('mcp__')) return name;
  return TOOL_ALIASES[name] ?? name;
}

function mcpDisplay(_locale: Locale): ToolDisplay {
  return {
    icon: 'mcp',
    en: { loading: 'Using MCP tool', finished: 'Used MCP tool' },
    zh: { loading: '正在使用 MCP 工具', finished: '已使用 MCP 工具' },
  };
}

function targetForTool(toolName: string, args: Record<string, unknown>, locale: Locale): string {
  const fallback = '...';
  if (toolName.startsWith('mcp__')) return toolName.split('__').slice(1).join('__');
  if (toolName === 'Skill') return text(args.skill) ?? text(args.skill_name) ?? fallback;
  if (toolName === 'WebSearch') return text(args.query) ?? fallback;
  if (toolName === 'WebFetch') return text(args.url) ?? fallback;
  if (toolName === 'Bash') return text(args.command) ?? text(args.description) ?? fallback;
  if (toolName === 'Read' || toolName === 'Diff' || toolName === 'PDF' || toolName === 'Write' || toolName === 'Edit' || toolName === 'MultiEdit') {
    return text(args.file_path) ?? text(args.path) ?? text(args.target_file) ?? fallback;
  }
  if (toolName === 'AskUserQuestion') return text(args.question) ?? (locale === 'zh' ? '问题' : 'question');
  return text(args.description) ?? text(args.prompt) ?? text(args.query) ?? toolName;
}
