import { memo, useState } from 'react';
import {
  Brain, ChevronDown, Globe, FileText, Pencil, Terminal,
  Sparkles, HelpCircle, Wrench, AlertCircle, Ban, Loader2, CircleCheck,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentMarkdown } from '@/components/agent/AgentMarkdown';
import { WarmupLabel } from '@/components/agent/AgentWarmup';
import type { CustomAgentSemanticMessage } from '@/lib/customAgent/renderableMessages';
import { normalizeToolActions, type CustomAgentActionView } from '@/lib/customAgent/toolActionNormalization';

const ACTION_ICON: Record<CustomAgentActionView['icon'], React.ReactNode> = {
  globe: <Globe className="w-3.5 h-3.5" />,
  file: <FileText className="w-3.5 h-3.5" />,
  pencil: <Pencil className="w-3.5 h-3.5" />,
  terminal: <Terminal className="w-3.5 h-3.5" />,
  skill: <Sparkles className="w-3.5 h-3.5" />,
  question: <HelpCircle className="w-3.5 h-3.5" />,
  mcp: <Wrench className="w-3.5 h-3.5" />,
  tool: <Wrench className="w-3.5 h-3.5" />,
};

function Markdown({ content, streaming }: { content: string; streaming?: boolean }) {
  return <AgentMarkdown content={content} streaming={streaming} />;
}

function ThinkingBlock({ title, content, isLoading, defaultOpen, locale }: {
  title: string; content: string; isLoading: boolean; defaultOpen: boolean; locale: 'en' | 'zh';
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border bg-muted/40">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {/* While reasoning streams, show the lively rotating "thinking" label;
            once finished, fall back to the static "Thought for Ns" summary. */}
        {isLoading ? (
          <span className="flex-1 text-left min-w-0"><WarmupLabel locale={locale} /></span>
        ) : (
          <>
            <Brain className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="flex-1 text-left">{title}</span>
          </>
        )}
        {content && <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 transition-transform', open && 'rotate-180')} />}
      </button>
      {open && content && (
        <div className="px-3 pb-3 pt-0 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap border-t border-border/60 mt-0">
          <div className="pt-2">{content}</div>
        </div>
      )}
    </div>
  );
}

function ActionGroup({ title, actions, isLoading, defaultOpen }: {
  title: string; actions: CustomAgentActionView[]; isLoading: boolean; defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <CircleCheck className="w-3.5 h-3.5 text-primary" />}
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-3 pb-2.5 space-y-1.5 border-t border-border/60">
          {actions.map(action => (
            <div key={action.id} className="flex items-center gap-2 text-xs pt-2">
              <span className="text-muted-foreground shrink-0">{ACTION_ICON[action.icon]}</span>
              <span className="font-medium text-foreground shrink-0">{action.localizedVerb}</span>
              <span className="text-muted-foreground truncate font-mono text-[11px]">{action.target}</span>
              {action.status === 'loading' && <Loader2 className="w-3 h-3 animate-spin text-primary ml-auto shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentMessageImpl({ message, locale }: {
  message: CustomAgentSemanticMessage; locale: 'en' | 'zh';
}) {
  switch (message.uiKind) {
    case 'user-text':
      return (
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
      );

    case 'data-read':
      return (
        <div className="flex justify-start animate-fade-in">
          <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-xs text-muted-foreground">
            <Database className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-medium text-foreground">
              {locale === 'zh' ? '数据已读取' : 'Data loaded'}
            </span>
            {message.snapshotTime && (
              <span className="text-muted-foreground">
                · {locale === 'zh' ? '快照时间 ' : 'snapshot '}{message.snapshotTime}
              </span>
            )}
          </div>
        </div>
      );

    case 'assistant-answer':
      return (
        <div className="flex justify-start">
          <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3 shadow-card">
            <Markdown content={message.content} streaming={message.streaming} />
            {message.streaming && (
              <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-primary animate-pulse align-middle" />
            )}
          </div>
        </div>
      );

    case 'thinking':
      return (
        <ThinkingBlock
          title={message.streaming ? (locale === 'zh' ? '思考中' : 'Thinking...') : (locale === 'zh' ? `思考了 ${Math.max(1, Math.ceil((message.durationMs ?? 1000) / 1000))} 秒` : `Thought for ${Math.max(1, Math.ceil((message.durationMs ?? 1000) / 1000))}s`)}
          content={message.content}
          isLoading={message.streaming === true}
          defaultOpen={false}
          locale={locale}
        />
      );

    case 'tool-action-list': {
      const isLoading = message.isLoading === true;
      const actions = normalizeToolActions(message.messages, {
        locale,
        forceStatus: isLoading ? undefined : 'finished',
      });
      if (actions.length === 0) return null;
      const title = isLoading
        ? (locale === 'zh' ? `正在执行 ${actions.length} 个操作` : `${actions.length} actions in progress`)
        : (locale === 'zh' ? `已完成 ${actions.length} 个操作` : `${actions.length} actions completed`);
      return (
        <ActionGroup
          title={title}
          actions={actions}
          isLoading={isLoading}
          defaultOpen={isLoading || message.hasFollowingRenderableUi !== true}
        />
      );
    }

    case 'agent-startup':
      return null;

    case 'question-card':
      return (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium text-primary mb-1">
            <HelpCircle className="w-3.5 h-3.5" />
            {locale === 'zh' ? '助手提问' : 'Agent asks'}
          </div>
          <div className="text-sm text-foreground">{message.question}</div>
        </div>
      );

    case 'question-answer-summary':
      if (!message.answer && !message.skipped) return null;
      return (
        <div className="text-xs text-muted-foreground pl-1">
          {message.skipped ? (locale === 'zh' ? '已跳过' : 'Skipped') : `${locale === 'zh' ? '已回复：' : 'Answered: '}${message.answer}`}
        </div>
      );

    case 'turn-error':
    case 'out-of-credit':
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm text-destructive">{message.detail}</div>
        </div>
      );

    case 'cancel':
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center py-1">
          <Ban className="w-3.5 h-3.5" />
          {locale === 'zh' ? '已取消' : 'Cancelled'}
        </div>
      );

    case 'unsupported-custom-event':
      return null;
  }
}

/**
 * Deep-ish equality on the parts of a semantic message that actually affect
 * render. The chat hook rebuilds the whole `semanticMessages` array on every
 * streaming tick, so without memoisation every prior message (including the
 * previous turn's interactive iframe) re-renders each tick -- that is what made
 * earlier charts visibly jitter. Comparing by value lets settled messages skip
 * re-render entirely while the live message keeps updating.
 */
function messagesEqual(
  a: CustomAgentSemanticMessage,
  b: CustomAgentSemanticMessage,
): boolean {
  if (a.id !== b.id || a.uiKind !== b.uiKind) return false;
  switch (a.uiKind) {
    case 'user-text':
      return a.content === (b as typeof a).content;
    case 'data-read':
      return a.snapshotTime === (b as typeof a).snapshotTime;
    case 'assistant-answer':
      return a.content === (b as typeof a).content && a.streaming === (b as typeof a).streaming;
    case 'thinking':
      return (
        a.content === (b as typeof a).content &&
        a.streaming === (b as typeof a).streaming &&
        a.durationMs === (b as typeof a).durationMs
      );
    case 'tool-action-list':
      return (
        a.isLoading === (b as typeof a).isLoading &&
        a.hasFollowingRenderableUi === (b as typeof a).hasFollowingRenderableUi &&
        a.messages === (b as typeof a).messages
      );
    case 'question-card':
      return a.question === (b as typeof a).question && a.toolCallId === (b as typeof a).toolCallId;
    case 'question-answer-summary':
      return a.answer === (b as typeof a).answer && a.skipped === (b as typeof a).skipped;
    case 'turn-error':
    case 'out-of-credit':
      return a.detail === (b as typeof a).detail;
    default:
      return true;
  }
}

export const AgentMessage = memo(
  AgentMessageImpl,
  (prev, next) => prev.locale === next.locale && messagesEqual(prev.message, next.message),
);
