// Custom Agent proxy for Enter Serving.
// Keeps the Enter API key server-side, validates thread ownership,
// and forwards AG-UI SSE streams without flattening them.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const ENTER_API_BASE_URL = Deno.env.get("ENTER_API_BASE_URL") ?? "https://api.enter.pro";
const ENTER_API_KEY = Deno.env.get("ENTER_API_KEY_FCD43878");
const ALLOWED_AGENT_IDS = new Set(["cd0e6742-c79f-4361-8a6c-b07a808cc36c"]);
const PROJECT_ID = "zenith-studio";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-user",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function db() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireKey() {
  if (!ENTER_API_KEY) {
    throw json(
      { error_code: "ENTER_API_KEY_MISSING", message: "Enter API key secret is missing." },
      500,
    );
  }
  return ENTER_API_KEY;
}

function enterHeaders(extra?: HeadersInit): HeadersInit {
  return { ...extra, Authorization: `Bearer ${requireKey()}` };
}

function enterUrl(pathname: string, search = "") {
  return `${ENTER_API_BASE_URL.replace(/\/$/, "")}/code/api/v1${pathname}${search}`;
}

function sse(upstream: Response) {
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      ...corsHeaders,
      "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function jsonUpstream(upstream: Response, body: string) {
  return new Response(body, {
    status: upstream.status,
    headers: {
      ...corsHeaders,
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}

function appUser(req: Request): string {
  const url = new URL(req.url);
  const u = req.headers.get("x-app-user") ?? url.searchParams.get("app_user");
  if (!u) {
    throw json({ error_code: "UNAUTHORIZED", message: "Missing app user." }, 401);
  }
  return u;
}

function requireAllowedAgent(agentId?: string) {
  if (!agentId) throw json({ error_code: "BAD_REQUEST", message: "Missing agent id." }, 400);
  if (!ALLOWED_AGENT_IDS.has(agentId)) {
    throw json({ error_code: "AGENT_NOT_ALLOWED", message: "Agent not configured." }, 403);
  }
  return agentId;
}

async function assertOwner(userId: string, agentId: string, threadId: string) {
  const { data } = await db()
    .from("custom_agent_threads")
    .select("id")
    .eq("project_id", PROJECT_ID)
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .eq("thread_id", threadId)
    .maybeSingle();
  if (!data) {
    throw json({ error_code: "NOT_FOUND", message: "Thread not found for this user." }, 404);
  }
}

function parseRoute(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("custom-agent") + 1;
  const agentId = parts[idx];
  const suffix = idx > 0 ? parts.slice(idx + 1) : [];
  return { agentId, suffix };
}

async function createThread(userId: string, agentId: string) {
  const upstream = await fetch(enterUrl(`/agents/${agentId}/threads`), {
    method: "POST",
    headers: enterHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({}),
  });
  const text = await upstream.text();
  if (upstream.ok) {
    try {
      const body = JSON.parse(text);
      await db().from("custom_agent_threads").upsert(
        {
          project_id: PROJECT_ID,
          user_id: userId,
          agent_id: agentId,
          thread_id: body.thread_id,
          version: body.version ?? 1,
          latest_history_turn_id: body.latest_history_turn_id ?? 0,
          title: body.name ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,agent_id,thread_id" },
      );
    } catch (_e) { /* ignore parse */ }
  }
  return jsonUpstream(upstream, text);
}

async function listMyThreads(userId: string, agentId: string) {
  const { data } = await db()
    .from("custom_agent_threads")
    .select("thread_id, title, updated_at")
    .eq("project_id", PROJECT_ID)
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .order("updated_at", { ascending: false });
  return json({ threads: data ?? [] });
}

async function getThread(userId: string, agentId: string, threadId: string) {
  await assertOwner(userId, agentId, threadId);
  const upstream = await fetch(enterUrl(`/agents/${agentId}/threads/${threadId}`), {
    headers: enterHeaders(),
  });
  const text = await upstream.text();
  return jsonUpstream(upstream, text);
}

async function listTurns(userId: string, agentId: string, threadId: string, search: string) {
  await assertOwner(userId, agentId, threadId);
  const upstream = await fetch(enterUrl(`/agents/${agentId}/threads/${threadId}/turns`, search), {
    headers: enterHeaders(),
  });
  const text = await upstream.text();
  return jsonUpstream(upstream, text);
}

async function runAgent(userId: string, agentId: string, req: Request) {
  const body = await req.json();
  if (!body?.threadId || typeof body.threadId !== "string") {
    return json({ error_code: "BAD_REQUEST", message: "threadId is required." }, 400);
  }
  await assertOwner(userId, agentId, body.threadId);

  // Persist a title from the first user message if not set yet. Strip any
  // injected data block so the thread title stays the user's real question.
  const firstUser = Array.isArray(body.messages)
    ? body.messages.find((m: { role?: string; content?: unknown }) => m?.role === "user")
    : null;
  if (firstUser?.content) {
    let title = String(firstUser.content);
    const start = title.indexOf("<<<ZENITH_DATA_CONTEXT>>>");
    const endMark = "<<<END_ZENITH_DATA_CONTEXT>>>";
    const end = title.indexOf(endMark);
    if (start !== -1 && end !== -1) {
      title = (title.slice(0, start) + title.slice(end + endMark.length)).trim();
    }
    title = title.slice(0, 60);
    await db()
      .from("custom_agent_threads")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("project_id", PROJECT_ID)
      .eq("user_id", userId)
      .eq("agent_id", agentId)
      .eq("thread_id", body.threadId)
      .is("title", null);
  }

  const upstream = await fetch(enterUrl(`/agents/${agentId}/run`), {
    method: "POST",
    headers: enterHeaders({ "Content-Type": "application/json", Accept: "text/event-stream" }),
    body: JSON.stringify({
      threadId: body.threadId,
      messages: body.messages,
      state: body.state ?? {},
      context: body.context ?? [],
      tools: [],
      forwardedProps: {},
    }),
  });
  return sse(upstream);
}

async function resumeEvents(userId: string, agentId: string, threadId: string, turnId: string) {
  await assertOwner(userId, agentId, threadId);
  const upstream = await fetch(
    enterUrl(`/agents/${agentId}/threads/${threadId}/turns/${turnId}/events`),
    { headers: enterHeaders({ Accept: "text/event-stream" }) },
  );
  return sse(upstream);
}

async function answerToolCall(
  userId: string,
  agentId: string,
  threadId: string,
  turnId: string,
  toolCallId: string,
  req: Request,
) {
  await assertOwner(userId, agentId, threadId);
  const body = await req.json();
  const upstream = await fetch(
    enterUrl(`/agents/${agentId}/threads/${threadId}/turns/${turnId}/tool-calls/${toolCallId}/answer`),
    {
      method: "POST",
      headers: enterHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    },
  );
  const text = await upstream.text();
  return jsonUpstream(upstream, text);
}

async function cancelTurn(userId: string, agentId: string, threadId: string, turnId: string) {
  await assertOwner(userId, agentId, threadId);
  const upstream = await fetch(
    enterUrl(`/agents/${agentId}/threads/${threadId}/turns/${turnId}/cancel`),
    {
      method: "POST",
      headers: enterHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({}),
    },
  );
  const text = await upstream.text();
  return jsonUpstream(upstream, text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const userId = appUser(req);
    const url = new URL(req.url);
    const { agentId: rawAgentId, suffix } = parseRoute(url);
    const agentId = requireAllowedAgent(rawAgentId);

    if (req.method === "POST" && suffix.length === 1 && suffix[0] === "threads") {
      return await createThread(userId, agentId);
    }
    if (req.method === "GET" && suffix.length === 1 && suffix[0] === "threads") {
      return await listMyThreads(userId, agentId);
    }
    if (req.method === "GET" && suffix.length === 2 && suffix[0] === "threads") {
      return await getThread(userId, agentId, suffix[1]);
    }
    if (req.method === "GET" && suffix.length === 3 && suffix[0] === "threads" && suffix[2] === "turns") {
      return await listTurns(userId, agentId, suffix[1], url.search);
    }
    if (req.method === "POST" && suffix.length === 1 && suffix[0] === "run") {
      return await runAgent(userId, agentId, req);
    }
    if (
      req.method === "GET" && suffix.length === 5 &&
      suffix[0] === "threads" && suffix[2] === "turns" && suffix[4] === "events"
    ) {
      return await resumeEvents(userId, agentId, suffix[1], suffix[3]);
    }
    if (
      req.method === "POST" && suffix.length === 7 &&
      suffix[0] === "threads" && suffix[2] === "turns" &&
      suffix[4] === "tool-calls" && suffix[6] === "answer"
    ) {
      return await answerToolCall(userId, agentId, suffix[1], suffix[3], suffix[5], req);
    }
    if (
      req.method === "POST" && suffix.length === 5 &&
      suffix[0] === "threads" && suffix[2] === "turns" && suffix[4] === "cancel"
    ) {
      return await cancelTurn(userId, agentId, suffix[1], suffix[3]);
    }

    return json({ error_code: "NOT_FOUND", message: "Unsupported route." }, 404);
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error_code: "PROXY_FAILED", message: "Custom-agent proxy failed." }, 500);
  }
});
