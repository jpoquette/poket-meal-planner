import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { recipeName, pantryItems = [] } = await request.json();
    if (!recipeName) {
      return Response.json({ error: "No recipe name provided" }, { status: 400 });
    }

    const pantryList = pantryItems.map((i) => i.name).join(", ");

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `Give me the full recipe for "${recipeName}".
${pantryList ? `I have these pantry items: ${pantryList}.` : ""}

Return ONLY a JSON object, no other text:
{
  "name": "${recipeName}",
  "description": "2-3 sentence description.",
  "allIngredients": [
    { "name": "Ingredient", "amount": "2 cups" }
  ],
  "missingIngredients": [
    { "name": "Ingredient", "quantity": 2, "unit": "lbs", "category": "Meat & Seafood" }
  ],
  "instructions": ["Step 1 text", "Step 2 text"],
  "specialNotes": "Tips or empty string."
}

For missingIngredients, only include items NOT in my pantry list above.
unit must be one of: bags, bottles, cans, cups, dozen, fillets, gallons, items, lbs, liters, oz, packages
category must be one of: Beverages, Canned Goods, Condiments, Dairy, Deli, Frozen, Grains & Bread, Meat & Seafood, Other, Produce, Snacks, Spices`,
      }],
    });

    const text = response.content[0].text.trim();
    const recipe = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return Response.json({ recipe });
  } catch (err) {
    console.error("meal-details error:", err.message);
    return Response.json({ error: err.message || "Failed to get recipe details" }, { status: 500 });
  }
}
