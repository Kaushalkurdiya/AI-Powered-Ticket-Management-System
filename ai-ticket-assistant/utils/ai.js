import { createAgent, gemini } from "@inngest/agent-kit";

const analyzeTicket = async (ticket) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing");
      return null;
    }

    const supportAgent = createAgent({
      model: gemini({
        model: "gemini-3.8-flash",
        apiKey: process.env.GEMINI_API_KEY,
      }),

      name: "AI Ticket Triage Assistant",

      system: `You are an expert technical support ticket triage assistant.

Analyze support tickets and provide useful information for human moderators.

You MUST return ONLY a valid JSON object.

The JSON must contain exactly these four fields:

{
  "summary": "Short summary of the issue",
  "priority": "low",
  "helpfulNotes": "Detailed technical notes for the moderator",
  "relatedSkills": ["React", "JavaScript"]
}

Rules:
- priority MUST be exactly one of: "low", "medium", "high"
- relatedSkills MUST be an array of strings
- summary must be short and clear
- helpfulNotes must provide practical troubleshooting guidance
- Include useful official documentation links in helpfulNotes when appropriate
- Do not invent unrelated information
- Do not use markdown
- Do not use code fences
- Do not add text before or after the JSON
- Return ONLY the JSON object`,
    });

    const response = await supportAgent.run(`
Analyze this technical support ticket.

Return ONLY this JSON structure:

{
  "summary": "Short 1-2 sentence summary of the problem",
  "priority": "medium",
  "helpfulNotes": "Detailed technical explanation and troubleshooting steps for the moderator. Include relevant official documentation links when useful.",
  "relatedSkills": ["React", "JavaScript"]
}

Ticket:

Title: ${ticket.title}

Description: ${ticket.description}
`);

    console.log(
      "AI RESPONSE:",
      JSON.stringify(response, null, 2)
    );

    const raw = response?.output?.[0]?.content;

    if (!raw) {
      console.error("Gemini returned no content");
      return null;
    }

    console.log("AI RAW CONTENT:", raw);

    const content = String(raw).trim();

    // Remove markdown code fences if Gemini adds them
    const match = content.match(
      /```(?:json)?\s*([\s\S]*?)\s*```/i
    );

    const jsonString = match
      ? match[1].trim()
      : content;

    const result = JSON.parse(jsonString);

    // Validate response
    if (
      typeof result.summary !== "string" ||
      typeof result.priority !== "string" ||
      typeof result.helpfulNotes !== "string" ||
      !Array.isArray(result.relatedSkills)
    ) {
      console.error(
        "Invalid Gemini response format:",
        result
      );

      return null;
    }

    // Validate priority
    if (
      !["low", "medium", "high"].includes(
        result.priority
      )
    ) {
      console.error(
        "Invalid priority:",
        result.priority
      );

      return null;
    }

    return {
      summary: result.summary,
      priority: result.priority,
      helpfulNotes: result.helpfulNotes,
      relatedSkills: result.relatedSkills,
    };
  } catch (error) {
    console.error(
      "Gemini ticket analysis failed:",
      error.message
    );

    console.error(error);

    return null;
  }
};

export default analyzeTicket;
