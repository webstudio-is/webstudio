import { componentCategories } from "@webstudio-is/sdk";

/**
 * Normalizes a component's category, defaulting undefined to "hidden"
 */
export const normalizeCategory = (
  category: string | undefined
): (typeof componentCategories)[number] => {
  return (category ?? "hidden") as (typeof componentCategories)[number];
};

/**
 * Checks if a component should be filtered out based on its category
 */
export const shouldFilterCategory = (category: string | undefined): boolean => {
  const normalized = normalizeCategory(category);
  return normalized === "hidden" || normalized === "internal";
};

type ComponentMetaLike = {
  category?: string;
  order?: number;
};

/**
 * Calculates a sort score for a component based on category and order.
 * Used to sort components in the same way across the application.
 */
export const getComponentScore = (meta: ComponentMetaLike): number => {
  const category = normalizeCategory(meta.category);
  const categoryScore = componentCategories.indexOf(category);
  const componentScore = meta.order ?? Number.MAX_SAFE_INTEGER;
  // Shift category score to ensure category takes precedence over order
  return categoryScore * 1000 + componentScore;
};
