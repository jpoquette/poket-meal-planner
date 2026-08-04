import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { pantryItems, exclude = [], count = 3 } = await request.json();
    if (!pantryItems?.length) {
      return Response.json({ error: "No pantry items provided" }, { status: 400 });
    }

    const itemList = pantryItems.map((i) => i.name).join(", ");
    const excludeNote = exclude.length
      ? `\n\nDo NOT suggest any of these (already shown): ${exclude.join(", ")}.`
      : "";

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `I have these pantry items: ${itemList}.${excludeNote}

Suggest ${count} meals. Return ONLY a JSON array, no other text:
[
  {
    "name": "Meal name",
    "description": "One sentence description.",
    "usedIngredients": ["pantry item 1", "pantry item 2"],
    "missingIngredients": ["item 1", "item 2"]
  }
]

usedIngredients: items from my pantry this meal uses.
missingIngredients: key items needed that I don't have (names only, keep it short).`,
      }],
    });

    const text = response.content[0].text.trim();
    const recipes = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
    return Response.json({ recipes });
  } catch (err) {
    console.error("meal-suggestions error:", err.message);
    return Response.json({ error: err.message || "Failed to get suggestions" }, { status: 500 });
  }
}
