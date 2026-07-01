import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useCustomAgentChat } from '@/lib/customAgent/useCustomAgentChat';
import { buildBusinessSnapshot } from '@/lib/customAgent/businessSnapshot';
import { AgentMessage } from '@/components/agent/AgentMessage';
import { ZenithAIOnboarding, hasSeenZenithAIOnboarding } from '@/components/agent/ZenithAIOnboarding';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Sparkles, Send, Plus, MessageSquare, Square, Loader2, BarChart3, ChevronDown,
} from 'lucide-react';

const SUGGESTIONS = [
  'Which members are about to churn? Build me a win-back list.',
  'Profile my high-value members and what they have in common.',
  'How is this month\u2019s revenue versus the same period last year?',
  'Analyze fill rate by class \u2014 which should I add or cut?',
];

export default function AIAnalystPage() {
  const { user } = useAuth();
  const appUserId = user?.userId ?? 'anonymous';
  const { state } = useStore();
  const stateRef = useRef(state);
  stateRef.current = state;
  const getDataSnapshot = useCallback(() => {
    const s = stateRef.current;
    const snapshot = buildBusinessSnapshot({
      studio: s.studio,
      users: s.users,
      courses: s.courses,
      sessions: s.sessions,
      bookings: s.bookings,
      cards: s.cards,
      orders: s.orders,
      attendances: s.attendances,
      privateLessons: s.privateLessons,
      conversations: s.conversations,
      messages: s.messages,
    });
    return [
      'Below is the studio\u2019s real, current business data (from the admin back office \u2014 the authoritative source).',
      'Answer the question below strictly from this real data. Do not invent, simulate or fabricate any numbers; if a relevant item is genuinely missing, clearly state "this is not present in the data".',
      '',
      '## Business data summary',
      snapshot.text,
      '',
      '## Full raw detail data (JSON)',
      'Contains every field of every record (users/members/coaches, courses, sessions, bookings, attendance, membership cards, orders, private lessons, conversations, messages). Read from here when you need line-by-line detail:',
      '```json',
      snapshot.detailJson,
      '```',
    ].join('\n');
  }, []);
  const chat = useCustomAgentChat({ appUserId, locale: 'en', getDataSnapshot });
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  // Whether auto-scroll should follow new content (user is parked near the bottom).
  const stickToBottomRef = useRef(true);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenZenithAIOnboarding());

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    stickToBottomRef.current = true;
    setShowJumpButton(false);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 80;
    stickToBottomRef.current = atBottom;
    setShowJumpButton(!atBottom);
  }, []);

  // Only follow streaming output when the user hasn't scrolled away.
  useEffect(() => {
    if (stickToBottomRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [chat.semanticMessages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || chat.isRunning) return;
    setInput('');
    if (taRef.current) taRef.current.style.height = 'auto';
    // Sending your own message should always snap to the bottom.
    stickToBottomRef.current = true;
    await chat.sendMessage(text);
    requestAnimationFrame(() => scrollToBottom('auto'));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const isEmpty = chat.semanticMessages.length === 0;

  return (
    <div className="flex h-full">
      {showOnboarding && <ZenithAIOnboarding onClose={() => setShowOnboarding(false)} />}
      {/* Thread history sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-card hidden lg:flex flex-col">
        <div className="p-3 border-b border-border">
          <Button onClick={() => void chat.startNewThread()} className="w-full gap-2" size="sm">
            <Plus className="w-4 h-4" />
            New chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {chat.threadList.map(t => (
            <button
              key={t.thread_id}
              onClick={() => void chat.openThread(t.thread_id)}
              className={cn(
                'flex items-center gap-2 w-full px-2.5 py-2 rounded text-xs text-left transition-colors',
                t.thread_id === chat.activeThreadId
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.title || 'New chat'}</span>
            </button>
          ))}
          {chat.threadList.length === 0 && (
            <div className="text-xs text-muted-foreground px-2.5 py-2">No conversations yet</div>
          )}
        </div>
      </aside>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="shrink-0 px-6 py-3 border-b border-border bg-card flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground tracking-tight">Zenith AI</h1>
            <p className="text-xs text-muted-foreground">Customer analyst &amp; business insights</p>
          </div>
        </div>

        {/* Transcript */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto px-6 py-5"
            // Reserve the scrollbar's width permanently. Without this, the
            // scrollbar toggling on/off (e.g. when parked at the bottom) changes
            // the content width, which resizes the width:100% chart iframes and
            // makes their canvases visibly shake.
            style={{ scrollbarGutter: 'stable' }}
          >
          {chat.booting ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : isEmpty ? (
            <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1.5">Hi, I’m Zenith AI</h2>
              <p className="text-sm text-muted-foreground mb-6">
                I’m your customer analyst — I profile members, flag churn risk, track revenue and turn it into clear advice. Try one of these:
              </p>
              <div className="grid gap-2 w-full">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); taRef.current?.focus(); }}
                    className="text-left text-sm px-4 py-2.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {chat.semanticMessages.map(m => (
                <AgentMessage key={m.id} message={m} locale="en" />
              ))}
            </div>
          )}
          </div>

          {showJumpButton && (
            <button
              onClick={() => scrollToBottom('smooth')}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-card hover:bg-muted transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Back to bottom
            </button>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 px-6 py-4 border-t border-border bg-card">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary/50 transition-colors">
              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                }}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask me anything about members, revenue or classes…"
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-1.5 max-h-40"
              />
              {chat.isRunning ? (
                <Button size="icon" variant="ghost" onClick={chat.abort} className="shrink-0 h-8 w-8 text-destructive">
                  <Square className="w-4 h-4 fill-current" />
                </Button>
              ) : (
                <Button size="icon" onClick={() => void handleSend()} disabled={!input.trim()} className="shrink-0 h-8 w-8">
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
              Results are AI-generated — verify against your data before major decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
