const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  yoga: "You are a professional yoga studio content writer. Write an engaging course description (3-4 sentences) in English. Focus on physical and mental benefits, the experience students will have, and what makes it special. Be warm, inviting, and inspiring.",
  pilates: "You are a professional pilates studio content writer. Write an engaging course description (3-4 sentences) in English. Focus on core strength, body alignment, controlled movement, and transformation. Be motivating and professional.",
  meditation: "You are a professional wellness center content writer. Write an engaging course description (3-4 sentences) in English. Focus on mindfulness, stress relief, inner peace, and the journey inward. Be calm, soothing, and inspirational.",
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

    const { courseName, courseType, coachName, duration, existingDescription, userPrompt } = await req.json();

    const systemPrompt = SYSTEM_PROMPTS[courseType] ||
      `You are a professional fitness studio content writer. Write an engaging course description (3-4 sentences) in English for a "${courseType}" class. Be warm, motivating, and inspiring.`;

    // Build user message — custom prompt replaces/extends the default
    const userMessage = userPrompt
      ? `Class: "${courseName}" (${courseType})\nInstructor: ${coachName}\nDuration: ${duration} minutes\n${existingDescription ? `Brief outline: ${existingDescription}\n` : ""}
Additional instructions from admin: ${userPrompt}

Write a compelling course description following the instructions above.`
      : `Class name: "${courseName}"\nInstructor: ${coachName}\nDuration: ${duration} minutes\n${existingDescription ? `Brief outline: ${existingDescription}` : ""}

Write a compelling course description for this class.`;

    const response = await fetch("https://api.enter.pro/code/api/v1/ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "z-ai/glm-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: false,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return new Response(JSON.stringify({ success: false, message: err.error?.message || "AI error" }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ success: true, description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
