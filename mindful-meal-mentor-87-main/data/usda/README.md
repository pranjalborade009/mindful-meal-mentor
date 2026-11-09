# USDA FoodData Central Snapshot

`FoodData_Central_foundation_food_json_2026-04-30.json` is the USDA FoodData
Central Foundation Foods JSON archive released April 30, 2026.

- Official download: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2026-04-30.zip
- Data type documentation: https://fdc.nal.usda.gov/Foundation_Foods_Documentation
- Licensing: USDA states FoodData Central data are public domain and published under CC0 1.0 Universal. Attribution is requested: U.S. Department of Agriculture, Agricultural Research Service, FoodData Central: Foundation Foods.
- Imported fields: source FDC ID, description, available nutrient values, preparation terms explicitly present in the description, and source-provided portion gram weights.
- Foundation Foods values are per 100 g edible portion. Some values, including protein, carbohydrate, and energy, are calculated; values are sample-based and may vary. The application marks imported records estimated and leaves absent or below-quantification values unknown.
- Cuisine, regional origin, meal, dietary restrictions, and allergens are not inferred from USDA records and remain unspecified/unknown.

Regenerate the normalized application catalogue with `npm run import:usda-foundation`. The generated `src/data/usdaFoundationFoods.ts` is derived from this snapshot and is not hand-edited.

ICMR-NIN's Indian Food Composition Tables 2017 are listed by FAO as free-access PDF material, but this project did not establish a reuse/redistribution license. Those values are therefore not included.

## FNDDS Prepared Foods

`FNDDS_2021-2023_indian-dishes.json` contains two selected food records from
USDA FoodData Central's Survey (FNDDS) 2021-2023 release (published October 31,
2024): Biryani with chicken (FDC ID 2706538) and Samosa (FDC ID 2708730). The
selection uses stable FDC IDs and source-provided nutrient, portion, and
ingredient fields. The biryani source explicitly says "Indian rice with
chicken"; the Samosa record does not explicitly assign a cuisine and remains
`Unspecified` in the app. No regional cuisine is inferred.

- Official release and dataset files: https://fdc.nal.usda.gov/download-datasets.html
- USDA FNDDS documentation: https://www.ars.usda.gov/ARSUserFiles/80400530/pdf/fndds/2021_2023_At_A_Glance.pdf
- FoodData Central licensing: CC0 1.0 Universal / public domain; attribution requested. See https://fdc.nal.usda.gov/api-guide.html#bkmk-6
- FNDDS uses standardized survey foods, per-100 g nutrient values, reported portions, and source component breakdowns. These are not restaurant-specific or individual homemade recipes; source ingredient records are preserved separately and not linked to other FDC records by guesswork.
- The `inputFoods` fields are stored as source ingredient components with their source code and gram weight when present. Allergen status remains unknown.
- Only the two selected records above are currently included in the app catalogue; this is not broad coverage of Indian or regional cuisines. The chicken biryani is labelled Indian because its source description says "Indian rice with chicken"; Samosa remains cuisine-unspecified. Both imported records have estimated nutrition; neither provides verified allergen information.
- Food-specific photographs are mapped only to these two FDC IDs. The chicken biryani image is credited to Gitika Gayan and the Samosa image to TAPAS KUMAR HALDER; both are from Wikimedia Commons under CC BY-SA 4.0. The card links to each source page and the license. If an image URL fails, the app shows its accessible placeholder. No image has been assigned to other FNDDS or Foundation foods without a reliable match.

To re-extract the selected records from a full FNDDS `surveyDownload.json`, run:

`npm run import:usda-fndds -- "C:/path/to/surveyDownload.json"`

The command writes the selected source subset and regenerates `src/data/usdaFnddsFoods.ts`. With no input argument, it regenerates from the checked-in selected snapshot. The importer allowlist currently includes only the two records listed above; it does not claim the remaining FNDDS catalog is integrated.

## Food Explorer Curation and Photograph Coverage

Food Explorer exposes a curated view from source-backed prepared foods; the full catalogue remains available to diary and existing ID-based lookups. The current curated view includes the two selected FNDDS foods and four Foundation Foods classified by their importer as prepared dishes: Chinese fried rice without meat, Chinese sweet and sour pork, pupusas with beans, and pork tamale. Foundation preparation descriptions are retained as alternate search terms and their original IDs and nutrition/provenance records are not changed. User-facing cuisine labels are based on explicit source naming. Samosa remains cuisine-unspecified.

All six currently displayed entries have distinct Commons photographs with photographer/credit, source page, and license or public-domain metadata. The four Foundation mappings are in `src/data/verifiedFoodImageMappings.ts`; the FNDDS mappings are in `src/services/fndds-food-import-service.ts`. A photo not matching a food remains absent rather than being substituted. `src/data/food-photo-generation-manifest.ts` is a prompt-ready 30-image batch manifest: it includes the six currently displayed foods and 24 candidate dishes that are not in the curated source-backed view and have no validated nutrition records. No image-generation tool was available while preparing the manifest, so none of its local WebP output files have been created; manifest candidates are not presented as catalogue foods.

The remaining USDA Foundation records include raw ingredients, beverages, and uncategorized/scientific entries; they are still resolvable by ID for existing user data but are excluded from the current Food Explorer view. Eight local demo foods also remain in the legacy catalogue for compatibility, but their illustrative nutrition and undocumented asset licenses do not qualify them for the curated view.