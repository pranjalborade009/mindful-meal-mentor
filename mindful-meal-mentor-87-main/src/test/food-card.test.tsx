import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { demoFoods } from "@/data/demoFoods";
import { FoodImageCredit, Macro, FoodImage } from "@/components/food/FoodCard";
import { usdaFoundationFoods } from "@/data/usdaFoundationFoods";
import { usdaFnddsFoods } from "@/data/usdaFnddsFoods";
import { foodDataService } from "@/services/food-data-service";

describe("Food Explorer cards", () => {
  it("shows an accessible fallback when the food has no image", () => {
    const importedFood = usdaFoundationFoods[0]!;
    expect(importedFood.image).toBeUndefined();
    render(<FoodImage food={importedFood} />);
    expect(screen.getByRole("img", { name: `Photo unavailable for ${importedFood.name}` })).toBeInTheDocument();
  });

  it("uses the existing image asset when one is supplied", () => {
    const demoFood = demoFoods.find((food) => food.image !== undefined)!;
    render(<FoodImage food={demoFood} />);
    const image = screen.getByRole("img", { name: demoFood.name }) as HTMLImageElement;
    expect(image.getAttribute("src")).toBe(demoFood.image);
    expect(image.getAttribute("loading")).toBe("lazy");
  });

  it("renders a food-specific attributed remote photograph", () => {
    const fnddsFood = usdaFnddsFoods.find((food) => food.image !== undefined)!;
    render(<FoodImage food={fnddsFood} />);
    const image = screen.getByRole("img", { name: fnddsFood.name }) as HTMLImageElement;
    expect(image.getAttribute("src")).toBe(fnddsFood.image);
    expect(image.getAttribute("loading")).toBe("lazy");
    expect(fnddsFood.imageAttribution?.sourceUrl).toContain("commons.wikimedia.org");
  });

  it("shows photo source and license links when attribution exists", () => {
    const paneer = foodDataService.getById("paneer-tikka")!;
    render(<FoodImageCredit food={paneer} />);

    expect(screen.getByRole("link", { name: /Madhawk1999/ }).getAttribute("href"))
      .toBe(paneer.imageAttribution?.sourceUrl);
    expect(screen.getByRole("link", { name: "CC BY-SA 4.0" }).getAttribute("href"))
      .toBe(paneer.imageAttribution?.licenseUrl);
  });

  it("falls back to the accessible placeholder when an image fails to load", () => {
    const demoFood = demoFoods.find((food) => food.image !== undefined)!;
    render(<FoodImage food={demoFood} />);

    fireEvent.error(screen.getByRole("img", { name: demoFood.name }));

    expect(screen.getByRole("img", { name: `Photo unavailable for ${demoFood.name}` })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: demoFood.name })).not.toBeInTheDocument();
  });

  it("does not render unsafe image protocols", () => {
    const foodWithUnsafeImage = { ...demoFoods[0]!, image: "javascript:alert(1)" };
    render(<FoodImage food={foodWithUnsafeImage} />);
    expect(screen.getByRole("img", { name: `Photo unavailable for ${foodWithUnsafeImage.name}` })).toBeInTheDocument();
  });

  it("labels missing macro data as not available", () => {
    render(<Macro label="Protein" value={null} />);
    expect(screen.getByText("Not available")).toBeInTheDocument();
  });
});