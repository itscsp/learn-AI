/**
 * restaurant.js
 * 
 * Direct Node.js port of RestaurantNameGenerator/langchain_helper.py
 * 
 * Uses SequentialChain:
 *   Chain 1: cuisine  →  restaurant_name
 *   Chain 2: restaurant_name  →  menu_items
 */

import "dotenv/config";
import {
  LLM,
  PromptTemplate,
  LLMChain,
  SequentialChain,
} from "./langchain.js";

const llm = new LLM({
  apiUrl: "https://api.groq.com/v1/llm",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.7,
});

export async function generateRestaurantNameAndItems(cuisine) {
  // ── Chain 1: Generate a restaurant name from the cuisine ──────────────────
  const namePrompt = new PromptTemplate({
    inputVariables: ["cuisine"],
    template:
      "Give me just ONE fancy restaurant name for {cuisine} food. Reply with only the name, nothing else.",
  });
  const nameChain = new LLMChain({
    llm,
    prompt: namePrompt,
    outputKey: "restaurant_name",
  });

  // ── Chain 2: Generate menu items from the restaurant name ─────────────────
  const menuPrompt = new PromptTemplate({
    inputVariables: ["restaurant_name"],
    template:
      "List exactly 5 menu items for {restaurant_name}. Return ONLY the names as a comma-separated list, nothing else. No explanations.",
  });
  const menuChain = new LLMChain({
    llm,
    prompt: menuPrompt,
    outputKey: "menu_items",
  });

  const chain = new SequentialChain({
    chains: [nameChain, menuChain],
    inputVariables: ["cuisine"],
    outputVariables: ["restaurant_name", "menu_items"],
  });

  return chain.call({ cuisine });
}

const result = await generateRestaurantNameAndItems("Italian");
console.log("\n🍽️  Restaurant Name:", result.restaurant_name.trim());
console.log("\n📋 Menu Items:");
result.menu_items
  .split(",")
  .forEach((item) => console.log("  -", item.trim()));
