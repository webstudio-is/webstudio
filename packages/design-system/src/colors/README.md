# Color tokens

[`colors.css`](colors.css) is the runtime and source of truth for design-system
colors. Do not edit files in `__generated__/` directly; generated files contain
types only.

The implementation follows the public
[Craft specification](https://docs.webstudio.is/university/craft): bounded theme
parameters flow through a relative color recipe into semantic colors and
finally composite component styles.

## Architecture

The CSS source contains three layers:

1. Nine public `--theme-*` parameters describe the theme.
2. Derived `--color-*` values normalize those parameters for the active color
   scheme.
3. Semantic foreground, background, border, and overlay colors describe the
   reusable decisions consumed by components.

Components consume only semantic colors with `cssVar()`. Colors are not copied
into the Stitches theme, and components cannot access theme parameters or
derivation values through the generated public type.

Changing a theme parameter updates both color schemes. Dark mode changes
scheme derivation bounds rather than maintaining a second theme or semantic
color set. Cross-hue variants mix in `oklab`, so the neutral family cannot
rotate an intent into another color family.

## Theme parameters

Theme authors set colors and relationships, not semantic outputs. Every public
parameter is commented at its declaration in [`colors.css`](colors.css).

| Parameter                   | Meaning                                                   |
| --------------------------- | --------------------------------------------------------- |
| `--theme-color-neutral`     | Surfaces, content, borders, and shadows                   |
| `--theme-color-accent`      | Interactive emphasis and keyboard focus                   |
| `--theme-color-positive`    | Successful or positive outcomes                           |
| `--theme-color-negative`    | Errors, danger, and destructive actions                   |
| `--theme-color-warning`     | Caution and warning states                                |
| `--theme-color-informative` | Neutral information                                       |
| `--theme-contrast-content`  | Content contrast from the accessible minimum to strongest |
| `--theme-contrast-surface`  | Separation between primary and secondary surfaces         |
| `--theme-contrast-border`   | Border contrast from the accessible minimum to strongest  |

Theme colors accept any lightness and hue. The recipe limits neutral chroma to
`0.02` and chromatic color-family chroma to `0.21` before deriving roles.
Lightness influences the result only inside a narrow scheme-specific range.

Contrast parameters are percentages. `0%` selects the soft end of the tested
range and `100%` selects the strong end. CSS clamps values outside that range,
so the recipe preserves its relative hierarchy regardless of the authoring UI.

```css
.custom-theme {
  --theme-color-neutral: oklch(55% 0.02 285);
  --theme-color-accent: oklch(60% 0.2 295);
  --theme-color-positive: oklch(55% 0.14 152);
  --theme-color-negative: oklch(55% 0.19 27);
  --theme-color-warning: oklch(55% 0.14 75);
  --theme-color-informative: oklch(55% 0.14 225);

  --theme-contrast-content: 70%;
  --theme-contrast-surface: 35%;
  --theme-contrast-border: 40%;
}
```

Set `data-color-scheme` on the document root. Scheme bounds are deliberately
root-scoped; nested light and dark theme islands are not part of this contract.

## Semantic colors

Semantic names follow Craft's
`--{foreground|background|border|overlay}-{purpose}[-{state}]` grammar and use
kebab-case without a project prefix.

Components compose states instead of requiring a semantic color for every
component, intent, and state combination:

```ts
styled("button", {
  color: cssVar("--foreground-on-accent"),
  background: cssVar("--background-accent"),
  "&:hover": {
    backgroundImage: `linear-gradient(
      ${cssVar("--overlay-interaction-hover")},
      ${cssVar("--overlay-interaction-hover")}
    )`,
  },
});
```

## Semantic extensions

The package extends Craft's core registry only for reusable component needs:

| Family        | Meaning and required pairing                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `inverse`     | A surface with reversed polarity; pair `--background-inverse` with `--foreground-on-inverse`.       |
| `muted`       | Readable lower-emphasis content on `--background-primary`.                                          |
| `accent`      | Interactive emphasis; pair a strong accent background with `--foreground-on-accent`.                |
| `positive`    | Successful outcomes; pair a strong positive background with `--foreground-on-positive`.             |
| `negative`    | Errors and destructive actions; pair strong or subtle backgrounds with their registered foreground. |
| `warning`     | Caution; pair the subtle background with the warning foreground and border.                         |
| `informative` | Neutral information; pair the subtle background with the informative foreground and border.         |
| `interaction` | Translucent hover and pressed feedback composed over regular surfaces.                              |
| `on-inverse`  | Translucent hover and pressed feedback composed over inverse surfaces.                              |

`--overlay-scrim` always derives from a dark version of the neutral theme
color, so it dims content in both schemes rather than following foreground
polarity.

`cssVar(name, fallback?)` follows the arguments of native `var()`. The first
argument is type-checked against public semantic variables parsed from this CSS
source:

```ts
cssVar("--foreground-primary");
cssVar("--foreground-primary", "currentColor");
```

## Validation and type generation

Type generation parses CSS structurally and rejects:

- Empty color layers or mismatched light and dark scheme bounds.
- Missing variable references.
- References across forbidden architectural layers.
- Unused theme parameters, scheme bounds, or derived colors.
- Standalone semantic color literals.
- Circular color references.
- Semantic names outside the Craft grammar.

TypeScript rejects unknown public variable names passed to `cssVar()`.

Browser tests load the real stylesheet and sweep theme color and contrast
boundaries in both schemes. They reject foreground/background text pairs below
4.5:1 contrast and meaningful border/background pairs below 3:1 contrast.

The generator emits only `CssVariableName` in
`__generated__/css-variable-names.d.ts`. It does not generate JavaScript or
duplicate color values. CSS is imported directly and performs all runtime
derivation and scheme switching.

Run `pnpm generate:color-types` after changing public semantic variables. The
package `typecheck` verifies that generated declarations are current, and the
normal workspace CI runs that command. Run `pnpm test` to verify structural
contracts and browser-computed contrast.

The Storybook **Foundations/Colors** light and dark stories load the runtime
stylesheet directly and parse the same file only for names and source
declarations. They render theme parameters, derived colors,
browser-computed contrast pairs, and every semantic color.
