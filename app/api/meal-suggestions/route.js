import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { pantryItems, exclude = [], count = 5 } = await request.json();
    if (!pantryItems?.length) {
      return Response.json({ error: "No pantry items provided" }, { status: 400 });
    }

    const itemList = pantryItems
      .map((i) => `${i.name}${i.quantity ? ` (${i.quantity} ${i.unit})` : ""}`)
      .join(", ");

    const excludeNote = exclude.length
      ? `\n\nDo NOT suggest any of these meals (already shown): ${exclude.join(", ")}.`
      : "";

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `I have these items in my pantry: ${itemList}.${excludeNote}

Suggest ${count} meals I could make. Return ONLY a JSON array with no other text, using this exact shape:
[
  {
    "name": "Meal name",
    "description": "2-3 sentence description of the dish",
    "usedIngredients": ["pantry item 1", "pantry item 2"],
    "missingIngredients": ["item needed 1", "item needed 2"],
    "allIngredients": [
      { "name": "Ingredient name", "amount": "quantity and unit, e.g. 2 cups" }
    ],
    "instructions": [
      "Step 1: ...",
      "Step 2: ..."
    ],
    "specialNotes": "Any tips, substitutions, or serving suggestions. Leave empty string if none."
  }
]

Rules:
- usedIngredients: only items from my pantry list that this meal uses
- missingIngredients: essentials needed that are NOT in my pantry — keep this concise
- allIngredients: complete ingredient list for the full recipe with amounts
- instructions: clear numbered steps, 4-8 steps
- specialNotes: optional tips or leave as empty string`,
        },
      ],
    });

    const text = response.content[0].text.trim();
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]") + 1;
    const recipes = JSON.parse(text.slice(start, end));

    return Response.json({ recipes });
  } catch (err) {
    console.error("meal-suggestions error:", err.message);
    return Response.json({ error: err.message || "Failed to get suggestions" }, { status: 500 });
  }
}
