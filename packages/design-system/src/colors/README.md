# Color tokens

[`colors.css`](colors.css) is the runtime and source of truth for design-system
colors. Do not edit files in `__generated__/` directly; generated files contain
types only.

Each application must load `@webstudio-is/design-system/colors.css` once at its
UI root. Applications that use the shared text-selection treatment also load
`@webstudio-is/design-system/text-selection.css`. Design-system component
imports do not inject global styles.

The implementation follows the public
[Craft specification](https://docs.webstudio.is/university/craft): bounded theme
parameters flow through a relative color recipe into semantic colors and
finally composite component styles.

## Architecture

The CSS source implements Craft's three conceptual layers:

1. The theme layer contains nine public `--theme-*` parameters and private
   `--color-*` derivations that normalize them for the active color scheme.
2. Semantic foreground, background, border, and overlay colors describe the
   reusable decisions consumed by components.
3. Components compose those semantic colors into reusable styles.

Components consume only semantic colors with `cssVar()`. Colors are not copied
into the Stitches theme, and components cannot access theme parameters or
derivation values through the generated public type. The legacy Stitches color
scale has been removed rather than retained through compatibility aliases.

Changing a theme parameter updates both color schemes. Dark mode changes
scheme derivation bounds rather than maintaining a second theme or semantic
color set. Cross-hue variants mix in `oklab`, so the neutral family cannot
rotate an intent into another color family.

Chromatic fills keep the same bounded luminance in both schemes. Dark mode
derives lighter foreground and focus variants from the same color family and
uses light content on strong chromatic fills. This keeps accent buttons stable
between schemes without making dark-mode accent text unreadable.

## Theme parameters

Theme authors set colors and relationships, not semantic outputs. Every public
parameter is commented at its declaration in [`colors.css`](colors.css).

| Parameter                   | Meaning                                                 |
| --------------------------- | ------------------------------------------------------- |
| `--theme-color-neutral`     | Surfaces, content, borders, and shadows                 |
| `--theme-color-accent`      | Interactive emphasis and keyboard focus                 |
| `--theme-color-positive`    | Successful or positive outcomes                         |
| `--theme-color-negative`    | Errors, danger, and destructive actions                 |
| `--theme-color-warning`     | Caution and warning states                              |
| `--theme-color-informative` | Neutral information                                     |
| `--theme-contrast-content`  | Content contrast from the readable minimum to strongest |
| `--theme-contrast-surface`  | Separation between primary and secondary surfaces       |
| `--theme-contrast-border`   | Separation between decorative borders and surfaces      |

Theme colors accept any CSS color. The recipe converts chromatic inputs into
the display gamut, limits their OKLCH source to `0.2–0.8` lightness and `0.3`
chroma, then caps relative luminance by scaling XYZ toward black. Neutral chroma
is limited to `0.02`. These bounds preserve the selected color family while
keeping required text and focus relationships safe.

The default parameters reproduce the design system's established light palette
within small per-channel tolerances. Decorative subtle backgrounds and borders
are allowed a wider tolerance because their legacy relationships do not meet a
meaningful 3:1 contrast threshold.

Contrast parameters are percentages. `0%` selects the soft end and `100%`
selects the strong end. CSS clamps values outside that range, so the recipe
preserves its relative hierarchy regardless of the authoring UI. Content and
focus contracts are tested for accessibility; surface and decorative border
contrast remain visual theme choices.

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

| Family             | Meaning and required pairing                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `inverse`          | A surface with reversed polarity; pair `--background-inverse` with `--foreground-on-inverse`.                                             |
| `accent`           | Interactive emphasis; pair a strong accent background with `--foreground-on-accent`.                                                      |
| `text-selection`   | Strong text selection shared by native fields and code editors; pair `--background-text-selection` with `--foreground-on-text-selection`. |
| `accent-secondary` | Secondary interactive emphasis; use the foreground on surfaces and pair the strong background with `--foreground-on-accent-secondary`.    |
| `positive`         | Successful outcomes; pair strong or subtle backgrounds with their registered foreground.                                                  |
| `negative`         | Errors and destructive actions; pair strong or subtle backgrounds with their registered foreground.                                       |
| `warning`          | Caution; pair the subtle background with the warning foreground and border.                                                               |
| `informative`      | Neutral information; pair the subtle background with the informative foreground and border.                                               |
| `interaction`      | Translucent hover and pressed feedback composed over regular surfaces.                                                                    |
| `on-inverse`       | Translucent hover and pressed feedback composed over inverse surfaces.                                                                    |

`--overlay-scrim` always derives from a dark version of the neutral theme
color, so it dims content in both schemes rather than following foreground
polarity. Interaction overlays follow scheme polarity: dark overlays in light
mode and light overlays in dark mode.

`cssVar(name, fallback?)` follows the arguments of native `var()`. The first
argument is type-checked against public semantic variables parsed from this CSS
source:

```ts
cssVar("--foreground-primary");
cssVar("--foreground-primary", "currentColor");
```

Component-owned and third-party variables stay with their component instead of
entering the color manifest. Declare each name once in its owning source file:

```ts
declareCssVar("--panel-banner-icon-color");

cssVar("--panel-banner-icon-color");
cssVar("--panel-banner-icon-color", "currentColor");
```

The generator collects `declareCssVar()` calls into the global name type. It
rejects duplicate declarations and conflicts with every variable in
`colors.css`. An unregistered string is rejected by `cssVar()` without requiring
component variable constants to be exported or imported.

## Fixed brand artwork

`webstudioBrand` exports fixed Webstudio identity gradients and effects that do
not follow the user-selectable theme. It contains only brand-specific artwork.
Generic surfaces, content, borders, and overlays must use semantic colors or
derive a local composition from them instead of being added to the brand API.

## Validation and type generation

Type generation parses CSS structurally and rejects:

- Empty color layers or mismatched light and dark scheme bounds.
- Missing variable references.
- References across forbidden architectural layers.
- Unused theme parameters, scheme bounds, or derived colors.
- Standalone semantic color literals.
- Circular color references.
- Semantic names outside the Craft grammar.
- Duplicate component variable declarations or conflicts with color variables.

TypeScript rejects unknown public variable names passed to `cssVar()`.

Browser tests load the real stylesheet and sweep theme color and contrast
boundaries in both schemes. They reject foreground/background text pairs below
4.5:1 contrast and focus borders below 3:1 contrast. They also compare every
default light semantic color with the established design-system palette and
protect the dark neutral hierarchy, stable chromatic fills, light on-color
content, and light interaction overlays.

The generator emits `ThemeVariableName` for public theme inputs and
`CssVariableName` for semantic colors and declared component variables in
`__generated__/css-variable-names.d.ts`. It does not generate JavaScript or
duplicate color values. CSS is imported directly and performs all runtime
derivation and scheme switching.

Run `pnpm generate:color-types` after changing a color or `declareCssVar()`
declaration. The package `typecheck` verifies that generated declarations are
current, and the normal workspace CI runs that command. Run `pnpm test` to
verify structural contracts and browser-computed contrast.

The Storybook **Foundations/Colors** story loads the runtime stylesheet directly
and parses the same file only for names and source declarations. It renders
theme parameters, derived colors, browser-computed contrast pairs, and every
semantic color. The global **Theme test case** and **Color scheme** toolbar
controls switch the entire Storybook, including this overview.
