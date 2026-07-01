import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HttpAgent } from '@enter-pro/agent-client';
import {
  ThreadClient,
  ThreadManager,
  toThreadTurnsFromAgUiHistory,
  type ThreadTurn,
} from '@enter-pro/thread-client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import {
  toCustomAgentSemanticMessages,
  type CustomAgentSemanticMessage,
} from './renderableMessages';
import { composeWireMessage } from './dataInjection';

const AGENT_ID = 'cd0e6742-c79f-4361-8a6c-b07a808cc36c';
const PROXY_ROOT = `${SUPABASE_URL}/functions/v1/custom-agent/${AGENT_ID}`;

type CustomAgentThread = {
  thread_id: string;
  version?: number;
  latest_history_turn_id?: number;
  running?: unknown | null;
};

export type ThreadSummary = {
  thread_id: string;
  title: string | null;
  updated_at: string;
};

// HttpAgent uses `token` as a Bearer for the run/cancel/resume endpoints.
// The Supabase gateway needs the anon key as Bearer; app identity is carried
// via the `app_user` query param on every proxy URL.
const gatewayToken = () => SUPABASE_PUBLISHABLE_KEY;

export function useCustomAgentChat(params: {
  appUserId: string;
  locale?: 'en' | 'zh';
  /**
   * Returns the live business-data snapshot (plain text) to prepend to the
   * outgoing message body so the agent reasons over real data. Called fresh
   * right before every send. The snapshot is injected into the message content
   * (the only channel the agent runtime feeds into the model) and stripped from
   * the UI so chat bubbles only show the user's question.
   */
  getDataSnapshot?: () => string;
}) {
  const { appUserId, getDataSnapshot } = params;
  const managerRef = useRef(new ThreadManager());
  const agentsRef = useRef(new Map<string, HttpAgent>());
  const getSnapshotRef = useRef(getDataSnapshot);
  getSnapshotRef.current = getDataSnapshot;
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [turns, setTurns] = useState<readonly ThreadTurn[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lifecycle, setLifecycle] = useState('idle');
  const [threadList, setThreadList] = useState<ThreadSummary[]>([]);
  const [booting, setBooting] = useState(false);
  // Real wall-clock timing for each reasoning message: { start, end? } keyed by
  // message id. Used to show "thought for N s" instead of a fixed placeholder.
  const reasoningTimesRef = useRef(new Map<string, { start: number; end?: number }>());

  const withUser = useCallback(
    (path: string) => {
      const sep = path.includes('?') ? '&' : '?';
      return `${PROXY_ROOT}${path}${sep}app_user=${encodeURIComponent(appUserId)}`;
    },
    [appUserId],
  );

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    }),
    [],
  );

  const refreshThreadList = useCallback(async () => {
    const resp = await fetch(withUser('/threads'), { headers: authHeaders() });
    if (!resp.ok) return;
    const body = await resp.json();
    setThreadList(body.threads ?? []);
  }, [authHeaders, withUser]);

  const listTurns = useCallback(
    async (threadId: string, start: number, end: number) => {
      const resp = await fetch(
        withUser(`/threads/${threadId}/turns?start_turn=${start}&end_turn=${end}`),
        { headers: authHeaders() },
      );
      if (!resp.ok) throw new Error('Failed to load agent history');
      const body = await resp.json();
      return toThreadTurnsFromAgUiHistory({
        turns: (body.turns ?? []).map((turn: Record<string, unknown>) => ({
          turn_id: turn.turn_id,
          status: turn.status,
          model_id: turn.model_id,
          events: turn.events,
          degraded: turn.degraded,
          created_at: turn.created_at,
          updated_at: turn.updated_at,
          ...(turn.user_message ? { user_message: turn.user_message } : {}),
          ...(turn.user ? { user: turn.user } : {}),
        })),
      });
    },
    [authHeaders, withUser],
  );

  const getOrCreateClient = useCallback(
    async (threadId: string, endTurn = 0) => {
      const key = `custom-agent-${threadId}`;
      const existing = managerRef.current.get(key);
      if (existing) return existing;

      const agentRef: { current: HttpAgent | null } = { current: null };
      const agent = new HttpAgent({
        threadId,
        url: () => withUser('/run'),
        token: gatewayToken,
        abortUrl: () => {
          const turnId = agentRef.current?.activeTurnId;
          return turnId == null ? '' : withUser(`/threads/${threadId}/turns/${turnId}/cancel`);
        },
        resumeUrl: () => {
          const turnId = agentRef.current?.activeTurnId;
          if (turnId == null) throw new Error('No running turn');
          return withUser(`/threads/${threadId}/turns/${turnId}/events`);
        },
      });
      agentRef.current = agent;
      agentsRef.current.set(key, agent);

      const client = new ThreadClient({
        threadId,
        agent,
        historyMessageLoader: {
          async load(_threadId, start, end) {
            return listTurns(threadId, start, end);
          },
          async loadSince() {
            return [];
          },
        },
        // endTurn must be the thread's latest persisted turn id, otherwise the
        // initial history range is empty and a refresh shows no messages.
        historyMessagePagination: { turnSize: 20, endTurn },
      });

      client.subscribe((event) => {
        if (event.type === 'turns' || event.type === 'lifecycle' || event.type === 'agentRunning') {
          // Track real reasoning durations: stamp a start the first time a
          // reasoning message is seen streaming, and an end when it stops.
          const now = Date.now();
          const times = reasoningTimesRef.current;
          for (const turn of client.turns) {
            for (const item of turn.messages) {
              const id = (item as { id?: string }).id;
              if (!id) continue;
              const streaming = client.isReasoningMessageStreaming(id);
              const rec = times.get(id);
              if (streaming) {
                if (!rec) times.set(id, { start: now });
                else if (rec.end != null) rec.end = undefined;
              } else if (rec && rec.end == null) {
                rec.end = now;
              }
            }
          }
          setTurns([...client.turns]);
          setIsRunning(client.isAgentRunning);
          setLifecycle(client.status);
        }
      });

      managerRef.current.register(key, client);
      return client;
    },
    [listTurns, withUser],
  );

  const createThread = useCallback(async (): Promise<CustomAgentThread> => {
    const resp = await fetch(withUser('/threads'), {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!resp.ok) throw new Error('Failed to create agent thread');
    return resp.json();
  }, [authHeaders, withUser]);

  const fetchThread = useCallback(
    async (threadId: string): Promise<CustomAgentThread> => {
      const resp = await fetch(withUser(`/threads/${threadId}`), { headers: authHeaders() });
      if (!resp.ok) throw new Error('Failed to load agent thread');
      return resp.json();
    },
    [authHeaders, withUser],
  );

  const activateThread = useCallback(
    async (threadId?: string | null) => {
      const thread = threadId ? await fetchThread(threadId) : await createThread();
      const key = `custom-agent-${thread.thread_id}`;
      const client = await getOrCreateClient(
        thread.thread_id,
        thread.latest_history_turn_id ?? 0,
      );
      await managerRef.current.resume(key);
      setActiveThreadId(thread.thread_id);
      setTurns([...client.turns]);
      setIsRunning(client.isAgentRunning);
      setLifecycle(client.status);

      const agent = agentsRef.current.get(key);
      if (thread.running != null && agent) {
        await agent.resumeTurn(thread.running as never);
      }
      return thread;
    },
    [createThread, fetchThread, getOrCreateClient],
  );

  // Boot: load thread list and open the most recent one (or a fresh one).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBooting(true);
      try {
        const resp = await fetch(withUser('/threads'), { headers: authHeaders() });
        const body = resp.ok ? await resp.json() : { threads: [] };
        const threads: ThreadSummary[] = body.threads ?? [];
        if (cancelled) return;
        setThreadList(threads);
        if (threads.length > 0) {
          await activateThread(threads[0].thread_id);
        } else {
          await activateThread(null);
          await refreshThreadList();
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUserId]);

  const startNewThread = useCallback(async () => {
    setTurns([]);
    await activateThread(null);
    await refreshThreadList();
  }, [activateThread, refreshThreadList]);

  const openThread = useCallback(
    async (threadId: string) => {
      setTurns([]);
      await activateThread(threadId);
    },
    [activateThread],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const isFirstMessage = turns.length === 0;
      const thread = activeThreadId ? { thread_id: activeThreadId } : await activateThread(null);
      const client = await getOrCreateClient(thread.thread_id);
      const key = `custom-agent-${thread.thread_id}`;
      await managerRef.current.resume(key);
      if (client.status !== 'active') throw new Error('Agent thread is not active');
      // Inject the live business-data snapshot into the message body — the only
      // channel the agent runtime actually feeds into the model. The injected
      // block is stripped from the UI so the chat bubble shows only `content`.
      const snapshot = getSnapshotRef.current?.() ?? '';
      const wireContent = snapshot ? composeWireMessage(snapshot, content) : content;
      await client.sendMessage({ content: wireContent, sentAt: Date.now() } as never);
      if (isFirstMessage) {
        // Name the thread after the user's first prompt. Optimistically set it in
        // the list right away for instant feedback, then refresh from the server
        // (which derives the title the same way) to stay in sync.
        const optimisticTitle = content.trim().slice(0, 60);
        if (optimisticTitle) {
          setThreadList((list) =>
            list.map((t) =>
              t.thread_id === thread.thread_id && !t.title
                ? { ...t, title: optimisticTitle }
                : t,
            ),
          );
        }
        setTimeout(() => void refreshThreadList(), 1200);
      }
    },
    [activateThread, activeThreadId, getOrCreateClient, refreshThreadList, turns.length],
  );

  const abort = useCallback(() => {
    managerRef.current.getActive()?.abort();
  }, []);

  const loadMoreHistory = useCallback(async () => {
    await managerRef.current.getActive()?.loadMoreHistoryMessages();
  }, []);

  const semanticMessages: CustomAgentSemanticMessage[] = useMemo(
    () =>
      toCustomAgentSemanticMessages(
        turns.flatMap((turn) => turn.messages),
        {
          isRunning,
          locale: params.locale ?? 'zh',
          isMessageStreaming: (messageId) =>
            managerRef.current.getActive()?.isMessageStreaming(messageId) ?? false,
          isReasoningMessageStreaming: (messageId) =>
            managerRef.current.getActive()?.isReasoningMessageStreaming(messageId) ?? false,
          reasoningDurationMs: (messageId) => {
            const rec = reasoningTimesRef.current.get(messageId);
            if (!rec) return undefined;
            const end = rec.end ?? Date.now();
            return Math.max(0, end - rec.start);
          },
        },
      ),
    [turns, isRunning, params.locale],
  );

  return useMemo(
    () => ({
      activeThreadId,
      threadList,
      semanticMessages,
      isRunning,
      lifecycle,
      booting,
      sendMessage,
      abort,
      startNewThread,
      openThread,
      loadMoreHistory,
    }),
    [
      activeThreadId,
      threadList,
      semanticMessages,
      isRunning,
      lifecycle,
      booting,
      sendMessage,
      abort,
      startNewThread,
      openThread,
      loadMoreHistory,
    ],
  );
}
