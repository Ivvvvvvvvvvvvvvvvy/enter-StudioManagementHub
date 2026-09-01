import { useState, useRef, useEffect } from 'react';
import { useAIChat } from '@/hooks/useAIChat';
import { ChatMessage } from '@/components/ai/ChatMessage';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send, Sparkles, RotateCcw, Square, AlertCircle } from 'lucide-react';
import { useStore } from '@/lib/store';

const SUGGESTIONS = [
  'What classes do you recommend for a complete beginner?',
  'How does a monthly membership work?',
  'Give me a 15-minute morning stretch routine',
  'What is the difference between yoga and pilates?',
];

export default function AIChatPage() {
  const { state } = useStore();
  const { messages, isLoading, error, sendMessage, cancel, resetChat } = useAIChat();
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend(text?: string) {
    const value = (text ?? draft).trim();
    if (!value || isLoading) return;
    sendMessage(value);
    setDraft('');
  }

  return (
    <div className="flex flex-col h-full bg-background">

      {/* Header */}
      <header className="shrink-0 h-14 border-b border-border bg-card flex items-center justify-between px-4 sm:px-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-foreground leading-tight truncate">AI Assistant</h1>
            <p className="text-[11px] text-muted-foreground truncate">Powered by Claude Sonnet 5</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isLoading && (
            <Button variant="outline" size="sm" onClick={cancel} className="h-8 text-xs">
              <Square className="w-3.5 h-3.5 mr-1.5" /> Stop
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetChat}
            disabled={messages.length === 0}
            className="h-8 text-xs text-muted-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> New chat
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">How can I help you today?</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Ask about classes, memberships, training tips, or anything about {state.studio.name}.
            </p>
            <div className="grid gap-2 mt-6 w-full max-w-sm">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {messages.map((m, i) => <ChatMessage key={i} message={m} />)}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 px-4 sm:px-6 py-2.5 flex items-center gap-2 bg-destructive/10 border-t border-destructive/20 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 px-4 py-3 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask me anything about the studio…"
            className={cn(
              "flex-1 resize-none bg-muted/60 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-32"
            )}
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!draft.trim() || isLoading}
            className="h-10 w-10 rounded-xl shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
