import type { ImageAttribution } from "@/types";

interface VerifiedFoodImageMapping {
  image: string;
  imageAttribution: ImageAttribution;
}

const publicDomainMark = "https://creativecommons.org/publicdomain/mark/1.0/";
const cc0License = "https://creativecommons.org/publicdomain/zero/1.0/";

export const verifiedFoodImageMappings: Readonly<Record<string, VerifiedFoodImageMapping>> = {
  "usda-fdc-1750340": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/Fuji_apple.jpg/960px-Fuji_apple.jpg",
    imageAttribution: {
      credit: "Scott Bauer, USDA ARS / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=10119",
      licenseName: "Public domain",
      licenseUrl: publicDomainMark,
    },
  },
  "usda-fdc-1105314": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/DFC_1274_Two_vendors_chat_behind_a_stall_piled_high_with_ripe_bananas_at_a_local_market.jpg/960px-DFC_1274_Two_vendors_chat_behind_a_stall_piled_high_with_ripe_bananas_at_a_local_market.jpg",
    imageAttribution: {
      credit: "PattayaPatrol / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=194283432",
      licenseName: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
  },
  "usda-fdc-2258586": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/74/Liat_Portal_for_Foodie_Disorder_-_Carrots_from_San_Francisco_farmers_market.jpg/960px-Liat_Portal_for_Foodie_Disorder_-_Carrots_from_San_Francisco_farmers_market.jpg",
    imageAttribution: {
      credit: "HaJunkiyada / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=183587440",
      licenseName: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
  },
  "usda-fdc-2646170": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/CHICKEN_BREAST.jpg/960px-CHICKEN_BREAST.jpg",
    imageAttribution: {
      credit: "MrBeastRapper / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=138537153",
      licenseName: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
  },
  "usda-fdc-2710826": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Corn_Kernel.jpg/960px-Corn_Kernel.jpg",
    imageAttribution: {
      credit: "Gaurav Dhwaj Khadka / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=102383066",
      licenseName: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
  },
  "usda-fdc-746782": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/Whole_Milk-Argaman_Dairy.jpg/960px-Whole_Milk-Argaman_Dairy.jpg",
    imageAttribution: {
      credit: "McKaby / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=160247925",
      licenseName: "CC0",
      licenseUrl: cc0License,
    },
  },
  "usda-fdc-2346396": {
    image: "https://upload.wikimedia.org/wikipedia/commons/9/97/Rolled_oats.jpg",
    imageAttribution: {
      credit: "Hankwang / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=7972524",
      licenseName: "Public domain",
      licenseUrl: publicDomainMark,
    },
  },
  "usda-fdc-2262072": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Peanut_butter_glass.jpg/960px-Peanut_butter_glass.jpg",
    imageAttribution: {
      credit: "Shisma / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=100459790",
      licenseName: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
  "usda-fdc-2346401": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Russet_potato.jpg/960px-Russet_potato.jpg",
    imageAttribution: {
      credit: "Steve Caruso / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=8339142",
      licenseName: "CC BY-SA 2.5",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/2.5/",
    },
  },
  "usda-fdc-2512381": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7f/WhiteRice.jpg/960px-WhiteRice.jpg",
    imageAttribution: {
      credit: "Sanjay Acharya / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=1762126",
      licenseName: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    },
  },
  "usda-fdc-747444": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ce/Black_Turtle_Bean.jpg/960px-Black_Turtle_Bean.jpg",
    imageAttribution: {
      credit: "Sanjay Acharya / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=5744293",
      licenseName: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    },
  },
  "usda-fdc-2685573": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Brassica_oleracea_var._botrytis_%28Coliflor%29.jpg/960px-Brassica_oleracea_var._botrytis_%28Coliflor%29.jpg",
    imageAttribution: {
      credit: "Rjcastillo / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=191237878",
      licenseName: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
  },
  "usda-fdc-1104647": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Garlic_bulbs_and_cloves.jpg/960px-Garlic_bulbs_and_cloves.jpg",
    imageAttribution: {
      credit: "Ivar Leidus / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=129705892",
      licenseName: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
  },
  "usda-fdc-321360": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Liat_Portal_for_Foodie_Disorder_-_Red_grape_tomatoes.jpg/960px-Liat_Portal_for_Foodie_Disorder_-_Red_grape_tomatoes.jpg",
    imageAttribution: {
      credit: "HaJunkiyada / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=180579454",
      licenseName: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
  },
  "usda-fdc-2710834": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/Mango_Ataulfo.jpg/960px-Mango_Ataulfo.jpg",
    imageAttribution: {
      credit: "El Mono Español / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=90108263",
      licenseName: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
  },
  "usda-fdc-1999632": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/Liat_Portal_for_Foodie_Disorder_-_Fresh_spinach_leaves.jpg/960px-Liat_Portal_for_Foodie_Disorder_-_Fresh_spinach_leaves.jpg",
    imageAttribution: {
      credit: "HaJunkiyada / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=183820855",
      licenseName: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
  },
  "paneer-tikka": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/Paneer_Tikka_01.jpg/960px-Paneer_Tikka_01.jpg",
    imageAttribution: {
      credit: "Madhawk1999 / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=40719148",
      licenseName: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
  },
  "usda-fdc-334536": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bc/Veg_Chinese_Fried_Rice_Recipe_By_Sonia_Goyal.jpg/960px-Veg_Chinese_Fried_Rice_Recipe_By_Sonia_Goyal.jpg",
    imageAttribution: {
      credit: "Sonia Goyal Jaipur / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=128100720",
      licenseName: "CC BY-SA 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
    },
  },
  "usda-fdc-746774": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/Sweet_sour_pork.jpg/960px-Sweet_sour_pork.jpg",
    imageAttribution: {
      credit: "BorgQueen / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=127805577",
      licenseName: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
  },
  "usda-fdc-334720": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/29/MyPlate_gov_Cultural_Food_%2820241025-USDA-FNS-UNK-0087%29.jpg/960px-MyPlate_gov_Cultural_Food_%2820241025-USDA-FNS-UNK-0087%29.jpg",
    imageAttribution: {
      credit: "USDA Food and Nutrition Service / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=184646533",
      licenseName: "Public domain",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    },
  },
  "usda-fdc-334628": {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Pork_tamale_-_May_2024_-_Sarah_Stierch.jpg/960px-Pork_tamale_-_May_2024_-_Sarah_Stierch.jpg",
    imageAttribution: {
      credit: "Missvain / Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/?curid=148411948",
      licenseName: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
};
