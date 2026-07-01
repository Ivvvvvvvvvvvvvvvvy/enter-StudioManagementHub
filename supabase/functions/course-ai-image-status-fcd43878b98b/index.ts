const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function queryTask(token: string, taskId: string) {
  if (!taskId) return { status: "failed", url: null };
  const response = await fetch(`https://api.enter.pro/code/api/v1/ai/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return { status: "failed", url: null };
  const data = await response.json();
  const url = data.status === "succeed" ? (data.images?.[0]?.url || null) : null;
  return { status: data.status, url };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_API_TOKEN = Deno.env.get("AI_API_TOKEN_fcd43878b98b");
    if (!AI_API_TOKEN) {
      return new Response(JSON.stringify({ success: false, message: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { taskIds } = await req.json();
    if (!taskIds || !Array.isArray(taskIds)) {
      return new Response(JSON.stringify({ success: false, message: "taskIds required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await Promise.all(taskIds.map((id: string) => queryTask(AI_API_TOKEN, id)));

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
