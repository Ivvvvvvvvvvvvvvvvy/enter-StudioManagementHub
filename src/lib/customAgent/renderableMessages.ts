import {
  isThreadAgUiMessage,
  isThreadCustomMessage,
  type ThreadMessage,
} from '@enter-pro/thread-client';
import {
  normalizeToolActions,
  type CustomAgentActionView,
  type Locale,
} from './toolActionNormalization';
import { stripDataBlock, hasDataBlock, extractSnapshotTime } from './dataInjection';

export type CustomAgentSemanticMessage =
  | { id: string; uiKind: 'user-text'; content: string }
  | { id: string; uiKind: 'data-read'; snapshotTime?: string }
  | { id: string; uiKind: 'assistant-answer'; content: string; streaming?: boolean }
  | { id: string; uiKind: 'agent-startup'; headerPhase: 'preparing' | 'responded'; events: string[] }
  | { id: string; uiKind: 'thinking'; content: string; streaming?: boolean; durationMs?: number }
  | { id: string; uiKind: 'tool-action-list'; messages: unknown[]; isLoading?: boolean; hasFollowingRenderableUi?: boolean }
  | { id: string; uiKind: 'question-card'; toolCallId: string; question: string; raw: unknown }
  | { id: string; uiKind: 'question-answer-summary'; toolCallId?: string; answer?: string; skipped?: boolean }
  | { id: string; uiKind: 'turn-error'; detail: string; errorType?: string }
  | { id: string; uiKind: 'out-of-credit'; detail: string; errorType?: string }
  | { id: string; uiKind: 'cancel' }
  | { id: string; uiKind: 'unsupported-custom-event'; eventName: string; value?: unknown; debugOnly: true };

export type DefaultBuilderStyleView =
  | { id: string; kind: 'user-bubble'; content: string }
  | { id: string; kind: 'startup-status-group'; headerPhase: 'preparing' | 'responded'; label: string; defaultOpen: boolean }
  | { id: string; kind: 'thinking-group'; title: string; content: string; isLoading: boolean; defaultOpen: boolean }
  | { id: string; kind: 'action-group'; title: string; actions: CustomAgentActionView[]; isLoading: boolean; defaultOpen: boolean }
  | { id: string; kind: 'assistant-message'; content: string; streaming?: boolean }
  | { id: string; kind: 'question-card'; toolCallId: string; question: string; raw: unknown }
  | { id: string; kind: 'question-answer-summary'; answer?: string; skipped?: boolean }
  | { id: string; kind: 'error-message'; detail: string; errorType?: string }
  | { id: string; kind: 'cancel-message'; label: string };

type RenderOptions = {
  isRunning?: boolean;
  locale?: Locale;
  isMessageStreaming?: (messageId: string) => boolean;
  isReasoningMessageStreaming?: (messageId: string) => boolean;
  reasoningDurationMs?: (messageId: string) => number | undefined;
  includeDebugEvents?: boolean;
};

const STRINGS = {
  en: {
    agentReady: 'Agent ready',
    agentPreparing: 'Agent getting ready',
    thinking: 'Thinking...',
    thoughtFor: (seconds: number) => `Thought for ${seconds}s`,
    actionsLoading: (count: number) => `${count} ${count === 1 ? 'action' : 'actions'} in progress`,
    actionsDone: (count: number) => `${count} ${count === 1 ? 'action' : 'actions'} completed`,
    cancelled: 'Cancelled',
  },
  zh: {
    agentReady: '助手就绪',
    agentPreparing: '助手准备中',
    thinking: '思考中',
    thoughtFor: (seconds: number) => `思考了 ${seconds} 秒`,
    actionsLoading: (count: number) => `正在执行 ${count} 个操作`,
    actionsDone: (count: number) => `已完成 ${count} 个操作`,
    cancelled: '已取消',
  },
} satisfies Record<Locale, Record<string, unknown>>;

const startupNames = new Set([
  'agent.environment.warming',
  'agent.environment.ready',
  'agent.loading',
  'agent.loaded',
]);

const hiddenDefaultCustomEvents = new Set([
  'agent.turn.summary',
  'usage.update',
]);

export function toCustomAgentSemanticMessages(
  items: readonly ThreadMessage[],
  options: RenderOptions = {},
): CustomAgentSemanticMessage[] {
  const out: CustomAgentSemanticMessage[] = [];
  let startup: Array<{ id: string; name: string }> = [];
  let tools: unknown[] = [];
  let sawAssistantAnswer = false;

  const flushStartup = (responded: boolean) => {
    if (!startup.length) return;
    out.push({
      id: `status:${startup[0]!.id}`,
      uiKind: 'agent-startup',
      headerPhase: responded ? 'responded' : 'preparing',
      events: startup.map((item) => item.name),
    });
    startup = [];
  };

  const flushTools = (isLoading = false) => {
    if (!tools.length) return;
    out.push({
      id: `tools:${out.length}`,
      uiKind: 'tool-action-list',
      messages: tools,
      isLoading,
    });
    tools = [];
  };

  for (const item of items) {
    if (isThreadCustomMessage(item)) {
      const name = item.event.name;

      if (startupNames.has(name)) {
        flushTools();
        startup.push({ id: item.id, name });
        continue;
      }

      if (hiddenDefaultCustomEvents.has(name)) {
        flushTools();
        flushStartup(true);
        if (options.includeDebugEvents) {
          out.push({ id: item.id, uiKind: 'unsupported-custom-event', eventName: name, value: item.event.value, debugOnly: true });
        }
        continue;
      }

      if (name === 'agent.tool_action.resolved') {
        flushTools();
        out.push({
          id: item.id,
          uiKind: 'question-answer-summary',
          toolCallId: valueString(item.event.value, 'tool_call_id') ?? valueString(item.event.value, 'toolCallId'),
          answer: valueString(item.event.value, 'answer'),
          skipped: valueString(item.event.value, 'status') === 'skipped',
        });
        continue;
      }

      if (name === 'agent.turn.cancelled') {
        flushTools();
        flushStartup(true);
        out.push({ id: item.id, uiKind: 'cancel' });
        continue;
      }

      if (name === 'agent.turn.error') {
        flushTools();
        flushStartup(true);
        const detail = valueString(item.event.value, 'message') ?? '助手运行失败。';
        const errorType = valueString(item.event.value, 'code');
        out.push({
          id: item.id,
          uiKind: isOutOfCredit(errorType, detail) ? 'out-of-credit' : 'turn-error',
          detail,
          errorType,
        });
        continue;
      }

      if (options.includeDebugEvents) {
        out.push({ id: item.id, uiKind: 'unsupported-custom-event', eventName: name, value: item.event.value, debugOnly: true });
      }
      continue;
    }

    if (!isThreadAgUiMessage(item)) continue;

    flushStartup(true);
    const msg = item.message;
    const role = messageRole(msg);
    const calls = toolCalls(msg);

    if (role === 'user') {
      flushTools();
      // A new user message starts a new turn: reset the "answered" flag so the
      // thinking placeholder shows again while THIS turn spins up (otherwise an
      // earlier turn's answer keeps it suppressed and the UI looks frozen until
      // the new answer streams in).
      sawAssistantAnswer = false;
      const rawText = messageText(msg);
      out.push({ id: item.id, uiKind: 'user-text', content: stripDataBlock(rawText) });
      // The data snapshot is injected client-side at send time, so we can show a
      // "data read" card immediately under the question — no waiting for the
      // agent to think. This gives instant feedback that work has begun.
      if (hasDataBlock(rawText)) {
        out.push({ id: `${item.id}:data`, uiKind: 'data-read', snapshotTime: extractSnapshotTime(rawText) });
      }
      continue;
    }

    const questionCalls = calls.filter(isAskUserQuestionToolCall);
    for (const call of questionCalls) {
      flushTools(true);
      out.push({
        id: `question:${callId(call, `${item.id}:question`)}`,
        uiKind: 'question-card',
        toolCallId: callId(call, `${item.id}:question`),
        question: questionText(call),
        raw: call,
      });
    }

    const nonQuestionCalls = calls.filter((call) => !isAskUserQuestionToolCall(call));
    if (nonQuestionCalls.length > 0) {
      tools.push({ ...(msg as Record<string, unknown>), toolCalls: nonQuestionCalls });
      continue;
    }

    if (role === 'tool' || typeof toolCallId(msg) === 'string') {
      tools.push(msg);
      continue;
    }

    if (isReasoningMessage(msg)) {
      const content = reasoningText(msg).trim();
      if (!content) continue;
      flushTools();
      out.push({
        id: item.id,
        uiKind: 'thinking',
        content,
        streaming: options.isReasoningMessageStreaming?.(item.id),
        durationMs: options.reasoningDurationMs?.(item.id),
      });
      continue;
    }

    if (role === 'assistant') {
      const content = messageText(msg).trim();
      if (!content) continue;
      flushTools();
      sawAssistantAnswer = true;
      out.push({
        id: item.id,
        uiKind: 'assistant-answer',
        content,
        streaming: options.isMessageStreaming?.(item.id),
      });
    }
  }

  flushStartup(false);
  flushTools(options.isRunning === true);

  // Append a synthetic "thinking" placeholder only when the agent is running but
  // hasn't produced any visible answer yet AND there isn't already a live thinking
  // block streaming (real reasoning content takes over once it arrives).
  const lastOut = out[out.length - 1];
  const hasLiveThinking = lastOut?.uiKind === 'thinking' && lastOut.streaming === true;
  if (options.isRunning && !sawAssistantAnswer && !hasLiveThinking) {
    out.push({ id: 'thinking:active', uiKind: 'thinking', content: '', streaming: true });
  }

  return markFollowingRenderableUi(out);
}

export function toDefaultBuilderStyleView(
  messages: readonly CustomAgentSemanticMessage[],
  options: { locale?: Locale } = {},
): DefaultBuilderStyleView[] {
  const locale = options.locale ?? 'en';
  const strings = STRINGS[locale];

  return messages.flatMap((message): DefaultBuilderStyleView[] => {
    switch (message.uiKind) {
      case 'user-text':
        return [{ id: message.id, kind: 'user-bubble', content: message.content }];
      case 'assistant-answer':
        return [{ id: message.id, kind: 'assistant-message', content: message.content, streaming: message.streaming }];
      case 'agent-startup':
        return [{ id: message.id, kind: 'startup-status-group', headerPhase: message.headerPhase, label: startupStatusLabel(message.headerPhase, locale), defaultOpen: message.headerPhase === 'preparing' }];
      case 'thinking':
        return [{
          id: message.id,
          kind: 'thinking-group',
          title: thoughtTitle(message, locale),
          content: message.content,
          isLoading: message.streaming === true,
          defaultOpen: message.streaming === true || message.content.length > 0,
        }];
      case 'tool-action-list': {
        const isLoading = message.isLoading === true;
        const actions = normalizeToolActions(message.messages, {
          locale,
          forceStatus: isLoading ? undefined : 'finished',
        });
        if (actions.length === 0) return [];
        const title = isLoading
          ? strings.actionsLoading(actions.length)
          : strings.actionsDone(actions.length);
        return [{
          id: message.id,
          kind: 'action-group',
          title,
          actions,
          isLoading,
          defaultOpen: isLoading || message.hasFollowingRenderableUi !== true,
        }];
      }
      case 'question-card':
        return [{ id: message.id, kind: 'question-card', toolCallId: message.toolCallId, question: message.question, raw: message.raw }];
      case 'question-answer-summary':
        return [{ id: message.id, kind: 'question-answer-summary', answer: message.answer, skipped: message.skipped }];
      case 'turn-error':
      case 'out-of-credit':
        return [{ id: message.id, kind: 'error-message', detail: message.detail, errorType: message.errorType }];
      case 'cancel':
        return [{ id: message.id, kind: 'cancel-message', label: strings.cancelled }];
      case 'unsupported-custom-event':
        return [];
    }
  });
}

function markFollowingRenderableUi(messages: CustomAgentSemanticMessage[]): CustomAgentSemanticMessage[] {
  return messages.map((message, index) => {
    if (message.uiKind !== 'tool-action-list') return message;
    const hasFollowingRenderableUi = messages.slice(index + 1).some((item) => (
      item.uiKind !== 'unsupported-custom-event'
      && item.uiKind !== 'agent-startup'
    ));
    return { ...message, hasFollowingRenderableUi };
  });
}

function valueString(value: unknown, key: string): string | undefined {
  if (value == null || typeof value !== 'object') return undefined;
  const raw = (value as Record<string, unknown>)[key];
  return raw == null || raw === '' ? undefined : String(raw);
}

function messageText(message: unknown): string {
  const raw = (message ?? {}) as Record<string, unknown>;
  if (typeof raw.content === 'string') return raw.content;
  if (Array.isArray(raw.content)) {
    return raw.content
      .map((part) => (typeof part === 'string' ? part : valueString(part, 'text') ?? ''))
      .join('');
  }
  return '';
}

function messageRole(message: unknown): string | undefined {
  return valueString(message, 'role');
}

function toolCalls(message: unknown): unknown[] {
  const raw = (message ?? {}) as Record<string, unknown>;
  return Array.isArray(raw.toolCalls)
    ? raw.toolCalls
    : Array.isArray(raw.tool_calls)
      ? raw.tool_calls
      : [];
}

function toolCallId(message: unknown): string | undefined {
  return valueString(message, 'toolCallId') ?? valueString(message, 'tool_call_id');
}

function isReasoningMessage(message: unknown): boolean {
  const raw = (message ?? {}) as Record<string, unknown>;
  // AG-UI reasoning messages carry role:"reasoning" with a plain string content.
  if (String(raw.role ?? '').toLowerCase() === 'reasoning') return true;
  const type = String(raw.type ?? raw.messageType ?? raw.message_type ?? '').toLowerCase();
  if (type.includes('reasoning')) return true;
  if (typeof raw.reasoning === 'string' || typeof raw.reasoningText === 'string' || typeof raw.reasoning_text === 'string') return true;
  if (Array.isArray(raw.content)) {
    return raw.content.some((part) => {
      if (typeof part !== 'object' || part == null) return false;
      const record = part as Record<string, unknown>;
      const partType = String(record.type ?? '').toLowerCase();
      return partType.includes('reasoning') || typeof record.reasoning === 'string' || (typeof record.text === 'string' && partType.includes('thought'));
    });
  }
  return false;
}

function reasoningText(message: unknown): string {
  const raw = (message ?? {}) as Record<string, unknown>;
  if (typeof raw.reasoning === 'string') return raw.reasoning;
  if (typeof raw.reasoningText === 'string') return raw.reasoningText;
  if (typeof raw.reasoning_text === 'string') return raw.reasoning_text;
  if (Array.isArray(raw.content)) {
    return raw.content
      .map((part) => {
        if (typeof part === 'string') return '';
        if (typeof part !== 'object' || part == null) return '';
        const record = part as Record<string, unknown>;
        const partType = String(record.type ?? '').toLowerCase();
        if (!partType.includes('reasoning') && !partType.includes('thought')) return '';
        return typeof record.text === 'string'
          ? record.text
          : typeof record.reasoning === 'string'
            ? record.reasoning
            : '';
      })
      .join('');
  }
  return messageText(message);
}

function isAskUserQuestionToolCall(call: unknown): boolean {
  const raw = (call ?? {}) as Record<string, unknown>;
  const fn = (raw.function ?? {}) as Record<string, unknown>;
  const name = String(raw.name ?? raw.functionName ?? raw.toolName ?? fn.name ?? '').toLowerCase();
  return name.includes('ask') && name.includes('question');
}

function questionText(call: unknown): string {
  const raw = (call ?? {}) as Record<string, unknown>;
  const fn = (raw.function ?? {}) as Record<string, unknown>;
  const args = raw.args ?? raw.arguments ?? fn.arguments;
  return valueString(args, 'question') ?? valueString(raw, 'question') ?? '助手需要你的输入。';
}

function callId(call: unknown, fallback: string): string {
  return valueString(call, 'id') ?? valueString(call, 'toolCallId') ?? valueString(call, 'tool_call_id') ?? fallback;
}

function isOutOfCredit(code?: string, detail?: string): boolean {
  const text = `${code ?? ''} ${detail ?? ''}`.toLowerCase();
  return text.includes('credit') || text.includes('quota') || text.includes('balance');
}

function startupStatusLabel(headerPhase: 'preparing' | 'responded', locale: Locale): string {
  const strings = STRINGS[locale];
  if (headerPhase === 'preparing') return strings.agentPreparing;
  return strings.agentReady;
}

function thoughtTitle(message: Extract<CustomAgentSemanticMessage, { uiKind: 'thinking' }>, locale: Locale): string {
  const strings = STRINGS[locale];
  if (message.streaming) return strings.thinking;
  const seconds = Math.max(1, Math.ceil((message.durationMs ?? 1000) / 1000));
  return strings.thoughtFor(seconds);
}
