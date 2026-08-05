import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url) return Response.json({ error: "No URL provided" }, { status: 400 });

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`Could not fetch page (${res.status})`);

    const html = await res.text();

    // Extract og:image before stripping tags
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const imageUrl = ogImageMatch ? ogImageMatch[1] : "";

    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000);

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `Extract the recipe from this webpage text. Return ONLY a JSON object, no other text:
{
  "title": "Recipe name",
  "description": "1-2 sentence description",
  "ingredients": "2 cups flour\\n1 tsp salt\\n3 eggs",
  "instructions": "Preheat oven to 350F\\nMix dry ingredients\\nBake 30 minutes",
  "servings": "4",
  "prep_hours": 0,
  "prep_minutes": 15,
  "cook_hours": 1,
  "cook_minutes": 0,
  "notes": "Any tips or empty string"
}

Rules:
- ingredients: one ingredient per line including quantity and unit
- instructions: one step per line, plain text, no step numbers
- servings: just a number or short string like "4" or "4-6"
- times: integers (0 if unknown)
- If no recipe is found, return { "error": "No recipe found on this page" }

Webpage text:
${text}`,
      }],
    });

    const responseText = response.content[0].text.trim();
    const parsed = JSON.parse(responseText.slice(responseText.indexOf("{"), responseText.lastIndexOf("}") + 1));

    if (parsed.error) return Response.json({ error: parsed.error }, { status: 422 });

    return Response.json({ recipe: { ...parsed, image_url: imageUrl } });
  } catch (err) {
    console.error("recipe-import error:", err.message);
    return Response.json({ error: err.message || "Failed to import recipe" }, { status: 500 });
  }
}
