export interface CuratedExplorerDish {
  id: string;
  name: string;
  alternativeNames: string[];
  cuisine: string;
}

export const curatedExplorerDishes: readonly CuratedExplorerDish[] = [
  {
    id: "usda-fdc-2706538",
    name: "Biryani with chicken",
    alternativeNames: ["Chicken biryani", "Chicken biriyani", "Biryani chicken"],
    cuisine: "Indian",
  },
  {
    id: "usda-fdc-2708730",
    name: "Samosa",
    alternativeNames: ["Samosas", "Potato and pea samosa"],
    cuisine: "Unspecified",
  },
  {
    id: "usda-fdc-334536",
    name: "Chinese Fried Rice (No Meat)",
    alternativeNames: ["Restaurant, Chinese, fried rice, without meat", "Chinese fried rice", "Fried rice without meat"],
    cuisine: "Chinese",
  },
  {
    id: "usda-fdc-746774",
    name: "Sweet and Sour Pork",
    alternativeNames: ["Restaurant, Chinese, sweet and sour pork", "Chinese sweet and sour pork"],
    cuisine: "Chinese",
  },
  {
    id: "usda-fdc-334720",
    name: "Pupusas with Beans",
    alternativeNames: ["Pupusas con frijoles", "Restaurant, Latino, pupusas con frijoles (pupusas, bean)"],
    cuisine: "Latin American",
  },
  {
    id: "usda-fdc-334628",
    name: "Pork Tamale",
    alternativeNames: ["Pork tamales", "Restaurant, Latino, tamale, pork"],
    cuisine: "Latin American",
  },
];
