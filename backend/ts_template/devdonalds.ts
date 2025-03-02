import express, { Request, Response } from "express";

// ==== Type Definitions, feel free to add or modify ==========================
interface cookbookEntry {
  cookTime: any;
  name: string;
  type: string;
}

interface requiredItem {
  name: string;
  quantity: number;
}

interface recipe extends cookbookEntry {
  requiredItems: requiredItem[];
}

interface ingredient extends cookbookEntry {
  cookTime: number;
}

// =============================================================================
// ==== HTTP Endpoint Stubs ====================================================
// =============================================================================
const app = express();
app.use(express.json());

// Store your recipes here!
const cookbook = new Map<string, cookbookEntry>();

// Task 1 helper (don't touch)
app.post("/parse", (req:Request, res:Response) => {
  const { input } = req.body;

  const parsed_string = parse_handwriting(input)
  if (parsed_string == null) {
    res.status(400).send("this string is cooked");
    return;
  } 
  res.json({ msg: parsed_string });
  return;
  
});

// [TASK 1] ====================================================================
// Takes in a recipeName and returns it in a form that 
const parse_handwriting = (recipeName: string): string | null => {
  // TODO: implement me
  recipeName = recipeName.replace(/[-_]/g, " "); // Replace _ and - with whitespace
  recipeName = recipeName.replace(/[^a-zA-Z ]/g, ""); // remove all non-letters and spaces
  recipeName = recipeName.trim().replace(/\s+/g, " "); // trim and remove multiple spaces
  
  // Convert to Title Case
  var recipeSplit = recipeName.split(" ");
  recipeSplit = recipeSplit.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  recipeName = recipeSplit.join(" ");

  return recipeName.length > 0 ? recipeName : null;
}

// [TASK 2] ====================================================================
// Endpoint that adds a CookbookEntry to your magical cookbook
app.post("/entry", (req: Request, res: Response) => {
  const entry = req.body;

  if (!entry || typeof entry.type !== "string" || typeof entry.name !== "string") {
    return res.status(400).send("Incorrect entry format!");
  }

  if (entry.type !== "recipe" && entry.type !== "ingredient") {
    return res.status(400).send("Incorrect entry type!");
  }

  if (cookbook.has(entry.name)) {
    return res.status(400).send("Entry name must be unique");
  }

  if (entry.type === "recipe") {
    if (!Array.isArray(entry.requiredItems)) {
      return res.status(400).send("Invalid requiredItems format");
    }

    const itemNames = new Set();
    for (const item of entry.requiredItems) {
      if (typeof item.name !== "string" || typeof item.quantity !== "number" || item.quantity <= 0) {
        return res.status(400).send("Invalid requiredItem format");
      }
      if (itemNames.has(item.name)) {
        return res.status(400).send("Recipe requiredItems must have unique names");
      }
      itemNames.add(item.name);
    }
  } else if (entry.type === "ingredient") {
    if (typeof entry.cookTime !== "number" || entry.cookTime < 0) {
      return res.status(400).send("Invalid cookTime");
    }
  }

  // Add entry to cookbook
  cookbook.set(entry.name, entry);
  res.status(200).send();
});

// [TASK 3] ====================================================================
// Endpoint that returns a summary of a recipe that corresponds to a query name
app.get("/summary", (req: Request, res: Response) => {
  const recipeName = req.query.name as string;

  // Check if the recipe exists
  if (!cookbook.has(recipeName)) {
    return res.status(400).send("Recipe not found.");
  }

  const recipe = cookbook.get(recipeName);

  // Helper function to calculate cook time and gather ingredients recursively
  const getRecipeDetails = (recipe: any): { cookTime: number; ingredients: Record<string, number> } => {
    let totalCookTime = 0;
    let ingredientMap: Record<string, number> = {};

    for (const item of recipe.requiredItems) {
      const entry = cookbook.get(item.name);

      if (!entry) {
        return { cookTime: 0, ingredients: {} }; // Return with 0 cook time if missing
      }

      if (entry.type === "ingredient") {
        // If it's a base ingredient, add its cook time
        totalCookTime += entry.cookTime * item.quantity;
        ingredientMap[item.name] = (ingredientMap[item.name] || 0) + item.quantity;
      } else if (entry.type === "recipe") {
        // If it's a recipe, recurse
        const subRecipe = getRecipeDetails(entry);
        totalCookTime += subRecipe.cookTime * item.quantity;

        for (const [ingName, ingQuantity] of Object.entries(subRecipe.ingredients)) {
          ingredientMap[ingName] = (ingredientMap[ingName] || 0) + ingQuantity * item.quantity;
        }
      }
    }

    return { cookTime: totalCookTime, ingredients: ingredientMap };
  };

  const { cookTime, ingredients } = getRecipeDetails(recipe);

  // Convert ingredients map to array format
  const ingredientList = Object.entries(ingredients).map(([name, quantity]) => ({
    name,
    quantity,
  }));

  if (cookTime === 0) {
    return res.status(400).send("Missing required ingredient(s) or recipe not valid.");
  }

  res.status(200).json({
    name: recipeName,
    cookTime,
    ingredients: ingredientList,
  });
});

// =============================================================================
// ==== DO NOT TOUCH ===========================================================
// =============================================================================
const port = 8080;
app.listen(port, () => {
  console.log(`Running on: http://127.0.0.1:8080`);
});
