require("dotenv").config({ path: ".env.local" });
const { GoogleGenAI, Type } = require("@google/genai");

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No GEMINI_API_KEY found in .env.local");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  const testLead = {
    name: "Ramesh Iyer",
    location: "Whitefield, Bangalore",
    requirement: "3BHK apartment",
    budget: "70L",
    timeline: "3-6 months",
    message:
      "Hi, saw your listing online. We are a family of 4, my parents will also stay with us so need a bit more space. Budget is around 70L but can stretch to 80 for the right place. Also looking at a couple of other projects nearby. Please call after 6pm, I'm at work during the day.",
  };

  const prompt = `Analyze this real-estate lead.

Name: ${testLead.name}
Location requested: ${testLead.location}
Property requirement: ${testLead.requirement}
Stated budget: ${testLead.budget}
Buying timeline: ${testLead.timeline}

Customer message (raw, verbatim):
"""
${testLead.message}
"""`;

  console.log("Calling Gemini...\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction:
          "You are a lead-qualification assistant for a real-estate salesperson. Ground everything in the data given. Respond with ONLY valid JSON, no markdown fences, with keys: summary, intent, keyRequirements (array), objections (array), score (0-100 number), priorityTag (hot/warm/cold), scoreReason, recommendedAction, suggestedResponse, flags (array).",
        temperature: 0.3,
      },
    });

    console.log("RAW RESPONSE TEXT:\n", response.text);
  } catch (err) {
    console.error("ERROR:", err.message || err);
    if (err.status) console.error("status:", err.status);
    process.exit(1);
  }
}

main();
