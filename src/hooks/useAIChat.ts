import { useState, useRef, useCallback } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  isStreaming?: boolean;
}

interface WireMessage {
  role: "user" | "assistant";
  content: string;
}

// Error Message Strategy:
// 1. ALWAYS prefer backend error.message (Single Source of Truth)
// 2. Use FALLBACK_MESSAGES only when backend message is empty/missing
const FALLBACK_MESSAGES: Record<string, string> = {
  authentication_error: "Authentication failed. Please refresh the page.",
  rate_limit_error: "Too many requests. Please try again later.",
  invalid_request_error: "Invalid request. Please try again.",
  overloaded_error: "Service is busy. Please try again later.",
  insufficient_credits: "This website's AI credits have been exhausted. Please contact the website administrator.",
  permission_error: "AI capability is disabled by the website owner. Please contact the website administrator.",
  api_error: "Service temporarily unavailable.",
};

function getUserErrorMessage(code: string, backendMessage: string): string {
  if (backendMessage) return backendMessage;
  return FALLBACK_MESSAGES[code] || "Service temporarily unavailable.";
}

const EDGE_FUNCTION_NAME = "ai-chat-7980ce877bff";
const DEFAULT_MODEL = "anthropic/claude-sonnet-5";

export function useAIChat(options?: {
  /**
   * Optional context provider: returns a hidden preamble (e.g. a live business
   * data snapshot) that is prepended to every outgoing user message so the
   * model reasons over real data. The user's question stays clean in the UI
   * bubble. Called fresh right before every send.
   */
  getContext?: () => string;
}) {
  const getContextRef = useRef(options?.getContext);
  getContextRef.current = options?.getContext;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const abortControllerRef = useRef<AbortController | null>(null);
  const blocks = useRef(new Map<number, { type: "thinking" | "text"; content: string }>());
  // Full conversation history exactly as sent to the backend (hidden context
  // preamble included). Multi-turn prompts stay grounded in the data.
  const wireHistoryRef = useRef<WireMessage[]>([]);
  const assistantTextRef = useRef("");
  const assistantPushedRef = useRef(false);

  const sendMessage = useCallback(async (content: string, model: string = DEFAULT_MODEL) => {
    abortControllerRef.current = new AbortController();

    // Build the wire message: hidden context preamble + the user's question.
    const context = getContextRef.current?.() ?? "";
    const userWire: WireMessage = {
      role: "user",
      content: context ? `${context}\n\n${content}` : content,
    };
    wireHistoryRef.current.push(userWire);
    assistantPushedRef.current = false;
    assistantTextRef.current = "";

    const userMessage: ChatMessage = { role: "user", content };
    const assistantMessage: ChatMessage = {
      role: "assistant", content: "", thinking: "", isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);
    setError(null);
    blocks.current.clear();

    try {
      await fetchEventSource(`${SUPABASE_URL}/functions/v1/${EDGE_FUNCTION_NAME}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          "X-Session-ID": sessionIdRef.current,
        },
        // Sticky session: reuse one X-Session-ID per conversation so the
        // AI gateway keeps conversation context.
        body: JSON.stringify({
          messages: wireHistoryRef.current,
          model,
        }),
        signal: abortControllerRef.current.signal,

        // LEVEL 0 — CONNECTION error detection
        async onopen(response) {
          const contentType = response.headers.get("content-type");

          if (!response.ok) {
            // Priority 1: Parse SSE error format (stream=true → all responses are SSE)
            if (contentType?.includes("text/event-stream")) {
              const text = await response.text();
              const dataMatch = text.match(/data: (.+)/);
              if (dataMatch) {
                try {
                  const errorData = JSON.parse(dataMatch[1]);
                  const message = errorData.error?.message;
                  if (message) throw new Error(message);
                } catch (parseError) {
                  if (parseError instanceof Error && parseError.message !== "Unexpected token") {
                    throw parseError;
                  }
                }
              }
            }

            // Priority 2: JSON error (proxy/gateway)
            if (contentType?.includes("application/json")) {
              const errorData = await response.json();
              throw new Error(errorData.error?.message || errorData.error || `Request failed: ${response.status}`);
            }

            // Fallback
            throw new Error(`Request failed: ${response.status}`);
          }

          if (!contentType?.includes("text/event-stream")) {
            throw new Error(`Expected text/event-stream, got: ${contentType}`);
          }
        },

        // LEVEL 1 — STREAM event handling (anthropic_messages protocol)
        onmessage(event) {
          if (!event.data) return;
          const data = JSON.parse(event.data);

          // Handle error events FIRST
          if (data.type === "error") {
            const errorMsg = getUserErrorMessage(
              data.error?.type || "api_error",
              data.error?.message || "Service error"
            );
            setError(errorMsg);
            setMessages(prev => prev.slice(0, -1));
            setIsLoading(false);
            return;
          }

          switch (data.type) {
            case "content_block_start":
              blocks.current.set(data.index, { type: data.content_block.type, content: "" });
              break;

            case "content_block_delta": {
              const block = blocks.current.get(data.index);
              if (block?.type === "thinking") {
                block.content += data.delta.thinking || "";
                setMessages(prev => updateLastAssistant(prev, { thinking: block.content }));
              } else if (block?.type === "text") {
                block.content += data.delta.text || "";
                assistantTextRef.current += data.delta.text || "";
                setMessages(prev => updateLastAssistant(prev, { content: block.content }));
              }
              break;
            }

            case "content_block_stop":
              // No state change required — ChatMessage auto-collapses the
              // thinking panel when content starts streaming.
              break;

            case "message_stop":
              // Persist the completed assistant reply into the wire history so
              // follow-up turns keep the full conversation.
              if (!assistantPushedRef.current && assistantTextRef.current) {
                wireHistoryRef.current.push({
                  role: "assistant",
                  content: assistantTextRef.current,
                });
                assistantPushedRef.current = true;
              }
              setMessages(prev => updateLastAssistant(prev, { isStreaming: false }));
              break;
          }
        },

        // LEVEL 2 — NETWORK errors
        onerror(err) { throw err; },
      });
    } catch (err: unknown) {
      // LEVEL 3 — EXCEPTION (filter AbortError as user-initiated cancellation)
      const e = err as { name?: string; message?: string };
      if (e.name !== "AbortError") {
        setError(e.message || "Failed to send message");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const resetChat = useCallback(() => {
    abortControllerRef.current?.abort();
    sessionIdRef.current = crypto.randomUUID();
    blocks.current.clear();
    wireHistoryRef.current = [];
    assistantTextRef.current = "";
    assistantPushedRef.current = false;
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, error, sendMessage, cancel, resetChat };
}

function updateLastAssistant(messages: ChatMessage[], updates: Partial<ChatMessage>): ChatMessage[] {
  const updated = [...messages];
  const last = updated[updated.length - 1];
  if (last?.role === "assistant") {
    Object.assign(last, updates);
  }
  return updated;
}
