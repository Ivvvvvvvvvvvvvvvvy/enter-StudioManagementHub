const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PROMPTS: Record<string, string> = {
  yoga: "Cinematic yoga flow in a beautiful sunlit studio, golden morning light streaming through floor-to-ceiling windows, graceful slow-motion movement, peaceful serene atmosphere, professional cinematography, warm tones, 4K quality",
  pilates: "Elegant pilates reformer workout in a sleek modern studio, smooth controlled movements, chrome equipment gleaming, bright clean lighting, professional fitness videography, motivating atmosphere",
  meditation: "Serene guided meditation practice at sunrise, soft ethereal light in a peaceful zen studio, gentle breathing visible, inner stillness, candles flickering softly, cinematic slow motion, spiritual atmosphere",
  barre: "Graceful barre fitness class at a ballet studio, long wooden barre along mirrored walls, ballerinas performing controlled isometric movements, soft warm lighting, elegant and precise motions, professional dance videography, cinematic 4K quality",
  hiit: "High-energy HIIT workout in a modern fitness studio, dynamic fast-paced intervals, powerful athletic movements, dramatic lighting with sweat and intensity, motivating atmosphere, professional sports videography, 4K cinematic quality",
  dance: "Energetic dance fitness class in a vibrant studio, colorful lighting, joyful and rhythmic movement sequences, upbeat atmosphere, professional choreography, cinematic videography",
  boxing: "Boxing and kickboxing fitness class in a sleek gym, punching bags and gloves in motion, powerful strikes and footwork, dramatic overhead lighting, intense athletic energy, cinematic 4K quality",
  stretching: "Peaceful deep stretching session in a light-filled studio, floor-level camera angles showing graceful flexibility, calm ambient atmosphere, soft natural light, slow deliberate movements, cinematic quality",
  spin: "High-energy indoor cycling class in a dark studio with dramatic spotlights, riders pushing hard on stationary bikes, sweat and determination, pumping music energy captured visually, cinematic 4K",
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

    const { courseType, customPrompt } = await req.json();
    const basePrompt = customPrompt?.trim()
      ? `${customPrompt.trim()}, cinematic quality, professional videography, 4K`
      : (DEFAULT_PROMPTS[courseType] || DEFAULT_PROMPTS.yoga);

    const response = await fetch("https://api.enter.pro/code/api/v1/ai/videos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_TOKEN}`,
        "Content-Type": "application/json",
        "X-Async": "true",
      },
      body: JSON.stringify({
        model: "kuaishou/kling-3.0",
        prompt: basePrompt,
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
      return new Response(JSON.stringify({ success: false, message: err.error?.message || "Video API error" }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify({ success: true, taskId: data.task_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
