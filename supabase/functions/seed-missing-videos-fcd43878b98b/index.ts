import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEED_COURSES = [
  {
    courseId: "course-7",
    courseType: "barre",
    prompt:
      "Graceful barre fitness class at a ballet studio, long wooden barre along mirrored walls, instructor performing controlled isometric movements, soft warm studio lighting, elegant and precise motions, professional dance videography, cinematic 4K quality",
  },
  {
    courseId: "course-9",
    courseType: "hiit",
    prompt:
      "High-energy HIIT workout in a modern fitness studio, dynamic fast-paced intervals, powerful athletic movements with visible intensity, dramatic overhead lighting, sweat and determination on display, motivating atmosphere, professional sports videography, cinematic 4K quality",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_API_TOKEN = Deno.env.get("AI_API_TOKEN_fcd43878b98b");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!AI_API_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const results: Array<{ courseId: string; status: string; taskId?: string }> = [];

    for (const course of SEED_COURSES) {
      // Check if already has video or a pending task
      const { data: existing } = await supabase
        .from("course_media")
        .select("video_url, video_task_id, status")
        .eq("course_id", course.courseId)
        .maybeSingle();

      if (existing?.video_url) {
        results.push({ courseId: course.courseId, status: "skipped_has_video" });
        continue;
      }
      if (existing?.video_task_id) {
        results.push({ courseId: course.courseId, status: "skipped_pending", taskId: existing.video_task_id });
        continue;
      }

      // Submit video generation
      const response = await fetch("https://api.enter.pro/code/api/v1/ai/videos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_API_TOKEN}`,
          "Content-Type": "application/json",
          "X-Async": "true",
        },
        body: JSON.stringify({
          model: "kuaishou/kling-3.0",
          prompt: course.prompt,
          type: "txt_2_video",
          video_option: {
            ratio: "16:9",
            resolution: "720p",
            duration: 5,
            format: "mp4",
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error(`[Seed] Failed to submit for ${course.courseId}:`, err);
        results.push({ courseId: course.courseId, status: "error" });
        continue;
      }

      const data = await response.json();
      const taskId: string = data.task_id;

      // Save task_id to course_media
      const { error: upsertErr } = await supabase.from("course_media").upsert(
        {
          course_id: course.courseId,
          video_task_id: taskId,
          status: "generating_video",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "course_id" }
      );

      if (upsertErr) {
        console.error(`[Seed] DB upsert failed for ${course.courseId}:`, upsertErr);
        results.push({ courseId: course.courseId, status: "db_error" });
      } else {
        console.log(`[Seed] Submitted task ${taskId} for ${course.courseId}`);
        results.push({ courseId: course.courseId, status: "submitted", taskId });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
