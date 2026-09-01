import { useState, useEffect } from "react";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageData } from "@/hooks/useAIChat";

interface ChatMessageProps {
  message: ChatMessageData;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const sideContent = message.thinking;
  const sideLabel = "Thinking";

  const [showSide, setShowSide] = useState(true);

  // Auto-collapse when main content starts streaming.
  useEffect(() => {
    if (message.content && sideContent) setShowSide(false);
  }, [message.content, sideContent]);

  const isWaiting = message.isStreaming && !message.content;

  return (
    <div className={cn(
      "flex w-full gap-3 px-4 py-5 sm:px-6",
      message.role === "user" ? "bg-muted/30" : "bg-background"
    )}>
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-medium",
        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
      )}>
        {message.role === "user" ? "U" : "AI"}
      </div>

      <div className="flex-1 space-y-3 min-w-0">
        {isWaiting && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        {sideContent && (
          <div>
            <button
              onClick={() => setShowSide(!showSide)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showSide ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span className="font-medium">{sideLabel}</span>
            </button>
            {showSide && (
              <div className="mt-2 p-3 bg-muted/50 rounded-md text-xs text-muted-foreground whitespace-pre-wrap border border-border/50">
                {sideContent}
                {message.isStreaming && !message.content && (
                  <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-0.5" />
                )}
              </div>
            )}
          </div>
        )}

        {message.content && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {message.content}
              {message.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-0.5" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
