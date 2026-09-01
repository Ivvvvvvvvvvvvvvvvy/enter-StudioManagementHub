const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id",
};

// SSE line separator (event: + data: + blank line)
const NL = String.fromCharCode(10);

function errorSSE(data: Record<string, unknown>): string {
  return "event: error" + NL + "data: " + JSON.stringify(data) + NL + NL;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_API_TOKEN = Deno.env.get("AI_API_TOKEN_7980ce877bff");
    if (!AI_API_TOKEN) {
      throw new Error("AI_API_TOKEN is not configured");
    }

    const upstreamSessionID = req.headers.get("X-Session-ID")?.trim() || crypto.randomUUID();
    const { messages, model } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("messages is required");
    }

    const response = await fetch("https://api-beta.enter.pro/code/api/v1/ai/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_TOKEN}`,
        "Content-Type": "application/json",
        "X-Session-ID": upstreamSessionID,
      },
      body: JSON.stringify({
        model: model || "anthropic/claude-sonnet-5",
        messages,
        stream: true,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      // Upstream returns SSE even on errors (anthropic_messages shape)
      const text = await response.text();
      let errorMessage = "AI service error";
      let errorCode = "api_error";

      const dataMatch = text.match(/data: (.+)/);
      if (dataMatch) {
        try {
          const errorData = JSON.parse(dataMatch[1]);
          errorMessage = errorData.error?.message || errorMessage;
          errorCode = errorData.error?.type || errorCode;
        } catch {
          /* use defaults */
        }
      }

      return new Response(errorSSE({
        type: "error",
        error: { type: errorCode, message: errorMessage },
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const err = error as { message?: string };
    return new Response(errorSSE({
      type: "error",
      error: { type: "api_error", message: err.message || "Internal error" },
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  }
});
