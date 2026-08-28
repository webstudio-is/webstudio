# Color tokens

`colors.resolver.json` is the source of truth for design-system colors. Do not
edit the generated TypeScript files in `src/colors/__generated__/` directly.

The standard DTCG Resolver section defines the seven light and dark theme
controllers. The namespaced `org.webstudio.colorRecipes` extension defines the
semantic and compatibility graph that derives from those controllers.

## Recipe format

A string references a controller or semantic color:

```json
"theme.canvas"
"semantic.backgroundCanvas"
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

Run `pnpm generate:colors` in this package after changing the JSON source. Run
`pnpm check:colors` to verify that generated files are current.

Storybook resolves the generated graph into temporary light and dark snapshots
for Engramma. Engramma edits are previews only; persist approved controller
values in `colors.resolver.json`.
