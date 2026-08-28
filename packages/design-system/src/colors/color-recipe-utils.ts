import { z } from "zod";

type ColorReference = string;
type ColorStop = {
  color: ColorRecipe;
  position?: number;
};
type LinearGradientRecipe = readonly [
  "linearGradient",
  number,
  readonly ColorStop[],
];
type RadialGradientRecipe = readonly [
  "radialGradient",
  {
    shape: "circle";
    position: readonly [number, number];
  },
  readonly ColorStop[],
];
export type ColorRecipe =
  | ColorReference
  | readonly ["mix", ColorRecipe, number, ColorRecipe]
  | readonly ["alpha", ColorRecipe, number]
  | readonly ["rotateHue", ColorRecipe, number]
  | readonly ["channels", ColorRecipe, number, number]
  | LinearGradientRecipe
  | RadialGradientRecipe
  | readonly [
      "layers",
      readonly (LinearGradientRecipe | RadialGradientRecipe)[],
    ];

export type ColorTokenSource = {
  version: 1;
  controllers: Record<
    string,
    {
      description: string;
      light: readonly [number, number, number, number?];
      dark: readonly [number, number, number, number?];
    }
  >;
  semantic: Record<string, ColorRecipe>;
  compatibility: Record<string, ColorRecipe>;
};

const percentageSchema = z.number().finite().min(0).max(100);
const referenceSchema = z
  .string()
  .regex(/^(theme|semantic)\.[a-zA-Z][a-zA-Z0-9]*$/);

const colorStopSchema: z.ZodType<ColorStop> = z.lazy(() =>
  z
    .object({
      color: colorRecipeSchema,
      position: percentageSchema.optional(),
    })
    .strict()
);

const linearGradientSchema: z.ZodType<LinearGradientRecipe> = z.lazy(() =>
  z.tuple([
    z.literal("linearGradient"),
    z.number().finite(),
    z.array(colorStopSchema).min(2),
  ])
);

const radialGradientSchema: z.ZodType<RadialGradientRecipe> = z.lazy(() =>
  z.tuple([
    z.literal("radialGradient"),
    z
      .object({
        shape: z.literal("circle"),
        position: z.tuple([percentageSchema, percentageSchema]),
      })
      .strict(),
    z.array(colorStopSchema).min(2),
  ])
);

const colorRecipeSchema: z.ZodType<ColorRecipe> = z.lazy(() =>
  z.union([
    referenceSchema,
    z.tuple([
      z.literal("mix"),
      colorRecipeSchema,
      percentageSchema,
      colorRecipeSchema,
    ]),
    z.tuple([z.literal("alpha"), colorRecipeSchema, percentageSchema]),
    z.tuple([z.literal("rotateHue"), colorRecipeSchema, z.number().finite()]),
    z.tuple([
      z.literal("channels"),
      colorRecipeSchema,
      percentageSchema,
      z.number().finite().min(0),
    ]),
    linearGradientSchema,
    radialGradientSchema,
    z.tuple([
      z.literal("layers"),
      z.array(z.union([linearGradientSchema, radialGradientSchema])).min(1),
    ]),
  ])
);

const colorRecipesSchema = z
  .object({
    version: z.literal(1),
    semantic: z.record(z.string(), colorRecipeSchema),
    compatibility: z.record(z.string(), colorRecipeSchema),
  })
  .strict();

const capitalize = (value: string) =>
  `${value[0].toUpperCase()}${value.slice(1)}`;

const colorVariable = (name: string) => `var(--colors-${name})`;

export const compileColorRecipes = ({
  controllers,
  recipes: input,
}: {
  controllers: readonly string[];
  recipes: unknown;
}) => {
  const recipes = colorRecipesSchema.parse(input);
  const controllerNames = new Set(controllers);
  const compiledSemantic = new Map<string, string>();

  const compileReference = (reference: string, stack: readonly string[]) => {
    const [group, name] = reference.split(".");
    if (group === "theme" && controllerNames.has(name)) {
      return colorVariable(`theme${capitalize(name)}`);
    }
    if (group === "semantic" && name in recipes.semantic) {
      compileSemantic(name, stack);
      return colorVariable(name);
    }
    throw new Error(`Unknown color recipe reference: ${reference}`);
  };

  const compileStop = (stop: ColorStop, stack: readonly string[]) => {
    const color = compileRecipe(stop.color, stack);
    return stop.position === undefined ? color : `${color} ${stop.position}%`;
  };

  const compileGradient = (
    recipe: LinearGradientRecipe | RadialGradientRecipe,
    stack: readonly string[]
  ) => {
    if (recipe[0] === "linearGradient") {
      const [, angle, stops] = recipe;
      return `linear-gradient(${angle}deg, ${stops.map((stop) => compileStop(stop, stack)).join(", ")})`;
    }
    const [, geometry, stops] = recipe;
    return `radial-gradient(${geometry.shape} at ${geometry.position[0]}% ${geometry.position[1]}%, ${stops.map((stop) => compileStop(stop, stack)).join(", ")})`;
  };

  const compileRecipe = (
    recipe: ColorRecipe,
    stack: readonly string[]
  ): string => {
    if (typeof recipe === "string") {
      return compileReference(recipe, stack);
    }

    if (recipe[0] === "mix") {
      const [, first, firstWeight, second] = recipe;
      return `color-mix(in oklch, ${compileRecipe(first, stack)} ${firstWeight}%, ${compileRecipe(second, stack)})`;
    }
    if (recipe[0] === "alpha") {
      const [, color, percentage] = recipe;
      return `oklch(from ${compileRecipe(color, stack)} l c h / ${percentage}%)`;
    }
    if (recipe[0] === "rotateHue") {
      const [, color, degrees] = recipe;
      return `oklch(from ${compileRecipe(color, stack)} l c calc(h + ${degrees}))`;
    }
    if (recipe[0] === "channels") {
      const [, color, lightness, chroma] = recipe;
      return `oklch(from ${compileRecipe(color, stack)} ${lightness}% ${chroma} h)`;
    }
    if (recipe[0] === "layers") {
      return recipe[1]
        .map((gradient) => compileGradient(gradient, stack))
        .join(", ");
    }
    return compileGradient(recipe, stack);
  };

  const compileSemantic = (name: string, stack: readonly string[]) => {
    const compiled = compiledSemantic.get(name);
    if (compiled !== undefined) {
      return compiled;
    }
    const reference = `semantic.${name}`;
    const cycleStart = stack.indexOf(reference);
    if (cycleStart !== -1) {
      throw new Error(
        `Circular color recipe reference: ${[...stack.slice(cycleStart), reference].join(" -> ")}`
      );
    }
    const value = compileRecipe(recipes.semantic[name], [...stack, reference]);
    compiledSemantic.set(name, value);
    return value;
  };

  for (const name of Object.keys(recipes.semantic)) {
    compileSemantic(name, []);
  }

  return {
    semantic: Object.fromEntries(compiledSemantic),
    compatibility: Object.fromEntries(
      Object.entries(recipes.compatibility).map(([name, recipe]) => [
        name,
        compileRecipe(recipe, [`compatibility.${name}`]),
      ])
    ),
  };
};
