import { env } from "../config/env";

export type DescriptionInput = {
  title: string;
  categoryName?: string;
  shopCategoryName?: string;
  brandName?: string;
  location?: string;
  price?: number;
  currency?: string;
  attributes?: Record<string, string | number | boolean | null | undefined>;
};

function buildFallback(input: DescriptionInput): string {
  const parts = [
    `${input.title} is a quality product`,
    input.categoryName ? ` in ${input.categoryName}` : "",
    input.brandName ? ` from ${input.brandName}` : "",
    input.location ? `, available from ${input.location}` : "",
    ".",
  ].join("");
  return [
    parts,
    "",
    "Key highlights:",
    "• Carefully selected for everyday use",
    "• Competitive marketplace pricing",
    "• Ships from a verified Vendors seller",
    "",
    "Add to cart to order today.",
  ].join("\n");
}

function buildPrompt(input: DescriptionInput): string {
  const attrs = input.attributes
    ? Object.entries(input.attributes)
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")
    : "";

  return `Write a compelling e-commerce product description (120–180 words) for an African marketplace listing.

Title: ${input.title}
Platform category: ${input.categoryName ?? "General"}
Shop category: ${input.shopCategoryName ?? "—"}
Brand: ${input.brandName ?? "—"}
Location/region: ${input.location ?? "Nigeria"}
${input.price != null ? `Price: ${input.currency ?? "NGN"} ${input.price}` : ""}
${attrs ? `Additional attributes:\n${attrs}` : ""}

Tone: premium but clear, no fake claims or medical guarantees. Use short paragraphs. No markdown headings.`;
}

/**
 * Generate product copy via Anthropic Claude Messages API.
 * Falls back to a template when ANTHROPIC_API_KEY is unset.
 */
export async function generateProductDescription(
  input: DescriptionInput
): Promise<string> {
  const fallback = buildFallback(input);

  if (!env.anthropicApiKey) {
    console.warn("[ai] ANTHROPIC_API_KEY not set — using template description");
    return fallback;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.anthropicModel,
      max_tokens: 500,
      system:
        "You write product descriptions for an African multivendor marketplace. Be factual and persuasive.",
      messages: [{ role: "user", content: buildPrompt(input) }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content
    ?.filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("")
    .trim();

  return text || fallback;
}
