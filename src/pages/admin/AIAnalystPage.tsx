import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useAIChat } from '@/hooks/useAIChat';
import { ChatMessage } from '@/components/ai/ChatMessage';
import { buildBusinessSnapshot } from '@/lib/customAgent/businessSnapshot';
import { ZenithAIOnboarding, hasSeenZenithAIOnboarding } from '@/components/agent/ZenithAIOnboarding';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Sparkles, Send, Square, ChevronDown, BarChart3, RotateCcw,
} from 'lucide-react';

const SUGGESTIONS = [
  'Which members are about to churn? Build me a win-back list.',
  'Profile my high-value members and what they have in common.',
  'How is this month\u2019s revenue versus the same period last year?',
  'Analyze fill rate by class \u2014 which should I add or cut?',
];

export default function AIAnalystPage() {
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
  const chat = useAIChat({ getContext: getDataSnapshot });
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
  }, [chat.messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || chat.isLoading) return;
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

  const isEmpty = chat.messages.length === 0;

  return (
    <div className="flex h-full">
      {showOnboarding && <ZenithAIOnboarding onClose={() => setShowOnboarding(false)} />}
      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="shrink-0 px-6 py-3 border-b border-border bg-card flex items-center gap-2.5 justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground tracking-tight">Zenith AI</h1>
              <p className="text-xs text-muted-foreground">Customer analyst &amp; business insights</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={chat.resetChat}
            disabled={isEmpty}
            className="h-8 text-xs text-muted-foreground shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> New chat
          </Button>
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
          {isEmpty ? (
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
            <div className="max-w-3xl mx-auto">
              {chat.messages.map((m, i) => <ChatMessage key={i} message={m} />)}
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

        {/* Error banner */}
        {chat.error && (
          <div className="shrink-0 px-6 py-2.5 flex items-center gap-2 bg-destructive/10 border-t border-destructive/20 text-sm text-destructive">
            <span className="flex-1">{chat.error}</span>
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 px-6 py-4 border-t border-border bg-card">
          <div className="max-w-3xl mx-auto">
            <div className={cn(
              "flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary/50 transition-colors",
              chat.error && "border-destructive/40"
            )}>
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
              {chat.isLoading ? (
                <Button size="icon" variant="ghost" onClick={chat.cancel} className="shrink-0 h-8 w-8 text-destructive">
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
