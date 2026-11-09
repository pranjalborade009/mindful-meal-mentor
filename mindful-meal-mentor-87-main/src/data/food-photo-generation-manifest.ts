export interface FoodPhotoGenerationRequest {
  canonicalId: string;
  dishName: string;
  outputPath: string;
  catalogueFoodId?: string;
  prompt: string;
}

const photographyStyle =
  "Create one original photorealistic premium food photograph, natural window light, realistic edible textures, appetizing but true-to-life colors, clean simple ceramic plate, uncluttered neutral tabletop, editorial food photography, 4:3 landscape composition. Show only the named dish, no text, labels, logos, collages, people, or unrelated foods.";

function request(canonicalId: string, dishName: string, prompt: string, catalogueFoodId?: string): FoodPhotoGenerationRequest {
  return {
    canonicalId,
    dishName,
    ...(catalogueFoodId ? { catalogueFoodId } : {}),
    outputPath: `src/assets/dishes/${canonicalId}.webp`,
    prompt: `${photographyStyle} Subject: ${dishName}. ${prompt}`,
  };
}

export const foodPhotoGenerationManifest: readonly FoodPhotoGenerationRequest[] = [
  request("usda-fdc-2706538", "Biryani with chicken", "A serving of aromatic rice cooked with chicken, photographed close enough to show separate grains and tender chicken pieces.", "usda-fdc-2706538"),
  request("usda-fdc-2708730", "Samosa", "Several crisp, golden triangular pastry samosas with a visible potato-and-pea filling in one cut piece.", "usda-fdc-2708730"),
  request("usda-fdc-334536", "Chinese Fried Rice (No Meat)", "A bowl of Chinese-style meatless fried rice with visible rice grains and mixed vegetables, with no meat or seafood.", "usda-fdc-334536"),
  request("usda-fdc-746774", "Sweet and Sour Pork", "Chinese sweet-and-sour pork pieces with a glossy sauce, presented as a single prepared dish.", "usda-fdc-746774"),
  request("usda-fdc-334720", "Pupusas with Beans", "Salvadoran griddled corn masa pupusas with a bean filling, one gently opened to show the filling.", "usda-fdc-334720"),
  request("usda-fdc-334628", "Pork Tamale", "A cooked pork-filled corn masa tamale partially unwrapped from its corn husk.", "usda-fdc-334628"),
  request("masala-dosa", "Masala Dosa", "South Indian crisp fermented-rice-and-lentil crepe folded around spiced potato masala, served with small bowls of sambar and coconut chutney."),
  request("idli-sambar", "Idli Sambar", "Soft white steamed idli rice cakes beside a bowl of lentil-and-vegetable sambar, with a small serving of coconut chutney."),
  request("poha", "Poha", "Maharashtrian flattened rice cooked with turmeric, peas, onion, curry leaves, and peanuts, served as a breakfast bowl."),
  request("upma", "Upma", "South Indian savory semolina upma with mustard seeds, curry leaves, vegetables, and toasted cashews."),
  request("paneer-tikka", "Paneer Tikka", "Indian paneer cubes with charred edges and colorful pepper pieces, grilled on short skewers."),
  request("dal-khichdi", "Dal Khichdi", "A comforting Indian one-pot dish of rice and lentils cooked soft with turmeric, shown with a small spoon of tadka."),
  request("vegetable-biryani", "Vegetable Biryani", "Layered Indian basmati rice cooked with mixed vegetables and whole spices, garnished lightly with herbs."),
  request("rajma-chawal", "Rajma Chawal", "North Indian kidney bean curry in a bowl alongside a neat serving of steamed white rice."),
  request("gujarati-dhokla", "Gujarati Dhokla", "A plate of soft yellow steamed Gujarati dhokla squares with mustard seed tempering and green coriander."),
  request("misal-pav", "Misal Pav", "Maharashtrian misal with sprouted bean curry, farsan, chopped onion, and lemon, served with pav bread on the side."),
  request("pav-bhaji", "Pav Bhaji", "Mumbai-style mashed vegetable bhaji with a buttered toasted pav roll and a lemon wedge."),
  request("chole-bhature", "Chole Bhature", "North Indian chickpea curry served with one puffed bhatura bread, both clearly visible."),
  request("aloo-paratha", "Aloo Paratha", "Punjabi whole-wheat flatbread stuffed with spiced potato, browned on a griddle and served with plain yogurt."),
  request("palak-paneer", "Palak Paneer", "Indian paneer cubes in a smooth spinach gravy in a shallow bowl, with no rice or bread."),
  request("pani-puri", "Pani Puri", "A small serving of crisp hollow pani puri shells filled with potato and chickpeas, with spiced water in a separate cup."),
  request("appam-vegetable-stew", "Appam with Vegetable Stew", "Kerala lacy-edged appam rice pancakes beside a mild coconut milk vegetable stew."),
  request("bengali-fish-curry-rice", "Bengali Fish Curry with Rice", "Bengali-style fish curry with a distinct piece of fish in light gravy, accompanied by plain steamed rice."),
  request("margherita-pizza", "Margherita Pizza", "A single thin-crust Neapolitan margherita pizza with tomato, mozzarella, and basil."),
  request("greek-salad", "Greek Salad", "A Greek horiatiki salad with tomato, cucumber, red onion, olives, and a slab of feta."),
  request("pasta-alfredo", "Pasta Alfredo", "A serving of fettuccine coated in a creamy Parmesan Alfredo sauce, with no added protein."),
  request("grilled-chicken", "Grilled Chicken", "A simple portion of grilled chicken breast with clear sear marks on a plain plate, no sides."),
  request("shakshuka", "Shakshuka", "Eggs gently poached in a North African spiced tomato and pepper sauce in a small skillet."),
  request("japanese-vegetable-ramen", "Japanese Vegetable Ramen", "A bowl of Japanese vegetable ramen with noodles in broth, vegetables, and no meat or seafood."),
  request("falafel-pita", "Falafel Pita", "A pita pocket filled with crisp falafel, lettuce, tomato, and tahini sauce."),
];
