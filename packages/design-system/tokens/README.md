# Color tokens

`colors.ts` is the source of truth for design-system colors. Do not edit the
generated TypeScript files in `src/colors/__generated__/` directly.

The typed manifest contains three layers:

- Seven controllers with light and dark OKLCH tuples.
- Semantic recipes derived from those controllers.
- Compatibility recipes that preserve existing design-system names.

TypeScript is used instead of a token-manager format because the relative-color
recipe graph is richer than standard DTCG aliases. The manifest remains data,
is checked with `ColorTokenSource`, and is validated again by the generator.

## Controller format

Each controller defines a description and one OKLCH tuple per mode:

```ts
accent: {
  description: "The primary action, selection, and focus color.",
  light: [55, 0.21, 255],
  dark: [72, 0.16, 255],
}
```

Tuple values are lightness percentage, chroma, hue, and optional alpha.

## Recipe format

A string references a controller or semantic color:

```ts
"theme.canvas";
"semantic.backgroundCanvas";
```

Recipes use typed tuples:

| Operation         | Shape                                    |
| ----------------- | ---------------------------------------- |
| Mix               | `["mix", first, firstWeight, second]`    |
| Alpha             | `["alpha", color, percentage]`           |
| Rotate hue        | `["rotateHue", color, degrees]`          |
| Override channels | `["channels", color, lightness, chroma]` |
| Linear gradient   | `["linearGradient", angle, stops]`       |
| Radial gradient   | `["radialGradient", geometry, stops]`    |
| Layered gradients | `["layers", gradients]`                  |

Each gradient stop has a `color` recipe and an optional percentage `position`.
The compiler validates the complete graph, rejects missing references and
cycles, and emits live relative CSS expressions.

## Generate colors

Run `pnpm generate:colors` in this package after changing the manifest. Run
`pnpm check:colors` to verify that generated files are current.

The Storybook color overview renders the controller, semantic, and compatibility
layers directly from the manifest and generated CSS graph.
