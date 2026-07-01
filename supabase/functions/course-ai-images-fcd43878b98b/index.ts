const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PROMPTS: Record<string, string[]> = {
  yoga: [
    "Professional yoga studio, beautiful wooden bamboo yoga blocks, premium cork yoga mat, meditation cushion, soft morning sunlight, minimal Japanese zen aesthetic, product photography, ultra detailed, 4k",
    "Serene yoga studio interior, polished hardwood floors, floor-to-ceiling windows with golden morning light, lush green plants, high ceilings, peaceful zen atmosphere, architectural photography",
    "Beautiful yoga class in session, graceful students practicing warrior pose, natural light flooding through windows, white and neutral tones, instructor guiding with gentle hands, candid lifestyle photography",
  ],
  pilates: [
    "Modern pilates reformer machine closeup, white luxury studio background, chrome springs and carriage, minimalist design, professional fitness equipment photography, studio lighting, ultra sharp",
    "Contemporary pilates studio, row of reformer machines aligned perfectly, mirror walls, bright clean lighting, polished hardwood floors, luxury fitness center, architectural photography",
    "Pilates class in progress, students lying on reformers performing controlled movement, instructor demonstrating perfect form, modern studio, athletic wear, professional photography, warm tones",
  ],
  meditation: [
    "Meditation props artfully arranged, Tibetan singing bowl, smooth zen river stones, smoldering incense, amethyst crystals, mala prayer beads, warm candlelight, dark moody background, still life photography",
    "Peaceful meditation room, round cushions arranged in circle, warm amber lighting, hanging paper lanterns, bamboo and stone elements, zen garden, calming sanctuary atmosphere, interior photography",
    "Group meditation session in studio, diverse people sitting in lotus position, soft warm golden hour light, peaceful serene expressions, eyes gently closed, guided mindfulness, candid documentary photography",
  ],
};

async function submitImage(token: string, prompt: string): Promise<string | null> {
  const response = await fetch("https://api.enter.pro/code/api/v1/ai/images", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Async": "true",
    },
    body: JSON.stringify({
      model: "openai/gpt-image-2",
      prompt,
      type: "txt_2_img",
      image_option: { ratio: "16:9", resolution: "1k", format: "jpg" },
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.task_id || null;
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

    const { courseType, customPrompt } = await req.json();

    let prompts: string[];
    if (customPrompt && customPrompt.trim()) {
      // Use admin's custom prompt as the base, with 3 slight angle variations
      const base = customPrompt.trim();
      prompts = [
        `${base}, overview shot, professional photography, 4k, high quality`,
        `${base}, detail shot, beautiful lighting, professional photography, 4k`,
        `${base}, wide angle atmosphere shot, cinematic, professional photography, 4k`,
      ];
    } else {
      prompts = DEFAULT_PROMPTS[courseType] || DEFAULT_PROMPTS.yoga;
    }

    // Submit all 3 images in parallel
    const taskIds = await Promise.all(prompts.map(p => submitImage(AI_API_TOKEN, p)));

    return new Response(JSON.stringify({ success: true, taskIds }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
