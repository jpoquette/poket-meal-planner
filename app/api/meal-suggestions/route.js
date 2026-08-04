import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { pantryItems } = await request.json();
    if (!pantryItems?.length) {
      return Response.json({ error: "No pantry items provided" }, { status: 400 });
    }

    const itemList = pantryItems
      .map((i) => `${i.name}${i.quantity ? ` (${i.quantity} ${i.unit})` : ""}`)
      .join(", ");

    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `I have these items in my pantry: ${itemList}.

Suggest 3 meals I could make. Return ONLY a JSON array with no other text, in this exact shape:
[
  {
    "name": "Meal name",
    "description": "One sentence description",
    "usedIngredients": ["ingredient1", "ingredient2"],
    "missingIngredients": ["ingredient3"]
  }
]

usedIngredients = items from my pantry list that this meal uses.
missingIngredients = common ingredients this meal needs that are NOT in my pantry list.
Keep missingIngredients short — only the essentials I'd need to buy.`,
        },
      ],
    });

    const text = response.content[0].text.trim();
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]") + 1;
    const recipes = JSON.parse(text.slice(start, end));

    return Response.json({ recipes });
  } catch (err) {
    console.error("meal-suggestions error:", err);
    return Response.json({ error: "Failed to get suggestions" }, { status: 500 });
  }
}
