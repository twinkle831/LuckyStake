/**
 * services/ai-service.js
 *
 * AI-powered allocation recommendations for agent strategies
 * Uses Claude API to generate optimal pool allocations based on user preferences
 */

const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

/**
 * Get AI-recommended allocation based on user preferences
 * @param {number} amount - Total amount to allocate
 * @param {number} duration - Duration in weeks (1-4)
 * @param {string} riskLevel - 'low', 'medium', or 'high'
 * @param {string} goalType - 'sure-shot' or 'highest-prize'
 * @returns {Promise<object>} - Allocation object { poolType: percentage }
 */
async function getAIAllocation(amount, duration, riskLevel, goalType) {
  try {
    const prompt = `You are a smart portfolio allocation AI for a lottery savings platform.
    
A user wants to allocate $${amount} across lottery pools with these preferences:
- Duration: ${duration} weeks
- Risk Level: ${riskLevel} (low=conservative, medium=balanced, high=aggressive)
- Goal: ${goalType} (sure-shot=more frequent small wins, highest-prize=rare big wins)

Available pools:
- weekly: Draws every Monday, shortest cycle
- biweekly: Draws every 15 days, medium cycle
- monthly: Draws monthly, longest cycle

Based on the user's preferences, provide an optimal allocation as percentages.
For "${riskLevel}" risk with "${goalType}" goal over ${duration} weeks:

If low/sure-shot: Favor weekly for consistent chances
If high/highest-prize: Favor monthly for higher prize pools
If medium: Balance across pools

Return ONLY a valid JSON object like:
{"weekly": 0.5, "biweekly": 0.3, "monthly": 0.2}

The percentages must sum to 1.0 and cover the available pools.`;

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const response = message.content[0];
    if (response.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Parse the JSON response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not find JSON in response");
    }

    const allocation = JSON.parse(jsonMatch[0]);

    // Validate allocation
    const sum = Object.values(allocation).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.01) {
      throw new Error("Allocation percentages do not sum to 1.0");
    }

    return allocation;
  } catch (error) {
    console.error("[AI Service] Error getting allocation:", error.message);
    // Fallback allocation if AI fails
    if (riskLevel === "low") {
      return { weekly: 0.6, biweekly: 0.3, monthly: 0.1 };
    } else if (riskLevel === "high") {
      return { weekly: 0.2, biweekly: 0.3, monthly: 0.5 };
    } else {
      return { weekly: 0.4, biweekly: 0.4, monthly: 0.2 };
    }
  }
}

module.exports = {
  getAIAllocation,
};
