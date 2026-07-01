import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { taskId } = await req.json();
    if (!taskId) {
      return new Response(JSON.stringify({ success: false, message: "taskId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(`https://api.enter.pro/code/api/v1/ai/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${AI_API_TOKEN}` },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ success: false, message: "Failed to query task" }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    if (data.status === "succeed") {
      const rawUrl: string | null = data.videos?.[0]?.url ?? null;
      let persistentUrl = rawUrl;

      // Re-upload to Supabase Storage so the URL never expires
      if (rawUrl) {
        try {
          const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
          const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

          if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

            const videoResp = await fetch(rawUrl);
            if (videoResp.ok) {
              const videoBuffer = await videoResp.arrayBuffer();
              const path = `courses/videos/${taskId}.mp4`;

              const { error: uploadErr } = await supabase.storage
                .from("course-assets")
                .upload(path, videoBuffer, { contentType: "video/mp4", upsert: true });

              if (!uploadErr) {
                const { data: { publicUrl } } = supabase.storage
                  .from("course-assets")
                  .getPublicUrl(path);
                persistentUrl = publicUrl;
                console.log(`[VideoStatus] Re-uploaded to persistent storage: ${persistentUrl}`);
              } else {
                console.error(`[VideoStatus] Storage upload failed: ${uploadErr.message}`);
              }
            }
          }
        } catch (uploadErr) {
          console.error("[VideoStatus] Re-upload error:", uploadErr);
          // Fall back to original URL if re-upload fails
        }
      }

      return new Response(JSON.stringify({ success: true, status: "succeed", url: persistentUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (data.status === "failed") {
      return new Response(JSON.stringify({ success: true, status: "failed", url: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Still processing
    return new Response(JSON.stringify({ success: true, status: data.status, url: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
