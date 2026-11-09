import type { Food } from "@/types";
import paneer from "@/assets/food-paneer.jpg";
import yogurt from "@/assets/food-yogurt.jpg";
import lentil from "@/assets/food-lentil.jpg";
import khichdi from "@/assets/food-khichdi.jpg";
import tofu from "@/assets/food-tofu.jpg";
import chicken from "@/assets/food-chicken.jpg";
import chilla from "@/assets/food-chilla.jpg";
import bowl from "@/assets/hero-meal.jpg";

const demoNutritionProvenance = {
  sourceName: "Prototype demo values (unverified)",
  sourceType: "demo" as const,
  note: "Illustrative sample values only; not checked against a validated nutrition dataset.",
};

/**
 * SAMPLE UI DATA — illustrative values for the prototype only.
 * Replace with records from the validated nutritional dataset / backend API.
 */
export const demoFoods: Food[] = [
  {
    id: "salmon-quinoa-bowl", name: "Salmon Quinoa Bowl", cuisine: "Mediterranean", meal: "Lunch", category: "dish",
    diet: "Non-vegetarian", dietaryLabels: ["Non-vegetarian"], allergens: null, allergenDataStatus: "unknown", image: bowl, source: "demo",
    nutrition: { servingSize: { quantity: 380, unit: "g", description: "1 bowl" }, basis: "per-serving", caloriesKcal: 520, proteinG: 34, carbohydrateG: 42, fatG: 22, fiberG: 9 },
    nutritionDataQuality: "estimated", nutritionProvenance: demoNutritionProvenance,
    priceInr: 420,
    ingredients: ["Salmon", "Quinoa", "Kale", "Avocado", "Chickpeas", "Lime"],
  },
  {
    id: "paneer-tikka", name: "Paneer Tikka", cuisine: "Indian", meal: "Dinner", category: "dish",
    diet: "Vegetarian", dietaryLabels: ["Vegetarian"], allergens: null, allergenDataStatus: "unknown",
    image: paneer, source: "demo",
    nutrition: { servingSize: { quantity: 200, unit: "g", description: "6 pieces" }, basis: "per-serving", caloriesKcal: 340, proteinG: 22, carbohydrateG: 12, fatG: 22, fiberG: 3 },
    nutritionDataQuality: "estimated", nutritionProvenance: demoNutritionProvenance,
    priceInr: 260, ingredients: ["Paneer", "Bell pepper", "Onion", "Yogurt marinade", "Mint chutney"],
  },
  {
    id: "greek-yogurt-bowl", name: "Greek Yogurt & Berries", cuisine: "Continental", meal: "Breakfast", category: "dish",
    diet: "Vegetarian", dietaryLabels: ["Vegetarian"], allergens: null, allergenDataStatus: "unknown", image: yogurt, source: "demo",
    nutrition: { servingSize: { quantity: 250, unit: "g", description: "1 bowl" }, basis: "per-serving", caloriesKcal: 290, proteinG: 18, carbohydrateG: 38, fatG: 7, fiberG: 6 },
    nutritionDataQuality: "estimated", nutritionProvenance: demoNutritionProvenance,
    priceInr: 180, ingredients: ["Greek yogurt", "Oats", "Berries", "Honey"],
  },
  {
    id: "lentil-salad", name: "Mediterranean Lentil Salad", cuisine: "Mediterranean", meal: "Lunch", category: "dish",
    diet: "Vegetarian", dietaryLabels: ["Vegetarian"], allergens: null, allergenDataStatus: "unknown", image: lentil, source: "demo",
    nutrition: { servingSize: { quantity: 300, unit: "g", description: "1 bowl" }, basis: "per-serving", caloriesKcal: 360, proteinG: 19, carbohydrateG: 44, fatG: 12, fiberG: 13 },
    nutritionDataQuality: "estimated", nutritionProvenance: demoNutritionProvenance,
    priceInr: 220,
    ingredients: ["Green lentils", "Cucumber", "Tomato", "Feta", "Parsley"],
  },
  {
    id: "millet-khichdi", name: "Vegetable Millet Khichdi", cuisine: "Indian", meal: "Dinner", category: "dish",
    diet: "Vegetarian", dietaryLabels: ["Vegetarian"], allergens: null, allergenDataStatus: "unknown", image: khichdi, source: "demo",
    nutrition: { servingSize: { quantity: 320, unit: "g", description: "1 bowl" }, basis: "per-serving", caloriesKcal: 380, proteinG: 13, carbohydrateG: 58, fatG: 10, fiberG: 8 },
    nutritionDataQuality: "estimated", nutritionProvenance: demoNutritionProvenance,
    priceInr: 150, ingredients: ["Foxtail millet", "Moong dal", "Peas", "Carrot", "Ghee"],
  },
  {
    id: "tofu-stir-fry", name: "Tofu Broccoli Stir-fry", cuisine: "East Asian", meal: "Dinner", category: "dish",
    diet: "Vegan", dietaryLabels: ["Vegan"], allergens: null, allergenDataStatus: "unknown", image: tofu, source: "demo",
    nutrition: { servingSize: { quantity: 340, unit: "g", description: "1 bowl" }, basis: "per-serving", caloriesKcal: 410, proteinG: 24, carbohydrateG: 46, fatG: 14, fiberG: 7 },
    nutritionDataQuality: "estimated", nutritionProvenance: demoNutritionProvenance,
    priceInr: 240, ingredients: ["Tofu", "Broccoli", "Brown rice", "Sesame", "Soy glaze"],
  },
  {
    id: "grilled-chicken-plate", name: "Grilled Chicken & Sweet Potato", cuisine: "Continental", meal: "Lunch", category: "dish",
    diet: "Non-vegetarian", dietaryLabels: ["Non-vegetarian"], allergens: null, allergenDataStatus: "unknown", image: chicken, source: "demo",
    nutrition: { servingSize: { quantity: 360, unit: "g", description: "1 plate" }, basis: "per-serving", caloriesKcal: 470, proteinG: 42, carbohydrateG: 40, fatG: 12, fiberG: 7 },
    nutritionDataQuality: "estimated", nutritionProvenance: demoNutritionProvenance,
    priceInr: 320,
    ingredients: ["Chicken breast", "Sweet potato", "Green beans", "Herbs"],
  },
  {
    id: "moong-chilla", name: "Moong Dal Chilla", cuisine: "Indian", meal: "Breakfast", category: "dish",
    diet: "Vegan", dietaryLabels: ["Vegan"], allergens: null, allergenDataStatus: "unknown", image: chilla, source: "demo",
    nutrition: { servingSize: { quantity: 180, unit: "g", description: "2 pieces" }, basis: "per-serving", caloriesKcal: 260, proteinG: 15, carbohydrateG: 34, fatG: 6, fiberG: 6 },
    nutritionDataQuality: "estimated", nutritionProvenance: demoNutritionProvenance,
    priceInr: 120, ingredients: ["Moong dal", "Ginger", "Coriander", "Tomato chutney"],
  },
];
