/**
 * server.js
 * 
 * Express web server — Node.js equivalent of the Streamlit main.py UI.
 * Serves a Restaurant Name Generator with cuisine selection.
 * 
 * Run: node src/server.js
 * Open: http://localhost:3000
 */

import "dotenv/config";
import express from "express";
import { generateRestaurantNameAndItems } from "./restaurant.js";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use(cors());

// ── API endpoint ──────────────────────────────────────────────────────────
app.post("/api/generate", async (req, res) => {
  const { cuisine } = req.body;
  if (!cuisine) {
    return res.status(400).json({ error: "cuisine is required" });
  }
  try {
    const result = await generateRestaurantNameAndItems(cuisine);
    res.json({
      restaurant_name: result.restaurant_name.trim(),
      menu_items: result.menu_items
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () =>
  console.log(`🍽️  Restaurant Generator running at http://localhost:${PORT}`)
);
