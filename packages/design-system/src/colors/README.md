# Color tokens

[`colors.css`](colors.css) is the runtime and source of truth for design-system
colors. Do not edit files in `__generated__/` directly; generated files contain
types only.

Each full design-system UI must load
`@webstudio-is/design-system/global.css` once at its root. This is the single
public stylesheet entry for font faces, color tokens, and shared browser-native
treatments such as text selection. It also applies the shared body reset,
interface font, and foreground color. Design-system component imports do not
inject global styles. The Builder canvas intentionally excludes this entry
because it hosts authored user documents.

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

Default chromatic fills keep the same bounded luminance in both schemes. Dark
mode derives lighter foreground and focus variants from the same color family
and uses light content on strong chromatic fills.

## Theme parameters

Theme authors set colors and relationships, not semantic outputs. Every public
parameter is commented at its declaration in [`colors.css`](colors.css).

| Parameter                   | Meaning                                            |
| --------------------------- | -------------------------------------------------- |
| `--theme-color-neutral`     | Surfaces, content, borders, and shadows            |
| `--theme-color-accent`      | Interactive emphasis and keyboard focus            |
| `--theme-color-positive`    | Successful or positive outcomes                    |
| `--theme-color-negative`    | Errors, danger, and destructive actions            |
| `--theme-color-warning`     | Caution and warning states                         |
| `--theme-color-informative` | Neutral information                                |
| `--theme-contrast-content`  | Content contrast from the soft bound to strongest  |
| `--theme-contrast-surface`  | Separation between primary and secondary surfaces  |
| `--theme-contrast-border`   | Separation between decorative borders and surfaces |

Theme colors support opaque, context-independent CSS colors such as hex,
`rgb()`, and `oklch()` values. Alpha colors and context-dependent keywords such
as `currentColor` are outside the contract. The recipe converts chromatic
inputs into the display gamut, limits their OKLCH source to `0.2–0.8` lightness
and `0.3` chroma, then caps relative luminance by scaling XYZ toward black.
Neutral chroma is limited to `0.02`.

The default light and dark outputs are regression tested. Custom theme values
can produce lower-contrast combinations, so theme authors must verify the
resulting interface instead of treating the derivation bounds as an
accessibility guarantee.

Contrast parameters support percentages from `0%` (soft) through `100%`
(strong). Values outside that range are outside the contract. Each control
names its primary effect, but downstream recipes share inputs; the controls are
not independent accessibility guarantees.

```css
:root {
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

Set theme parameters and `data-color-scheme` on the document root. Derivations
are computed there, so descendant overrides and nested theme islands are not
part of this contract.

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
entering the color manifest. Declare each shared contract in its owning source
file:

```ts
const panelBannerIconColor = declareCssVar("--panel-banner-icon-color");

cssVar(panelBannerIconColor);
cssVar(panelBannerIconColor, "currentColor");
```

`declareCssVar()` brands the local name for `cssVar()` without registering it
globally. Scope variables to the owning component and use a component-specific
prefix unless a third-party API fixes the name. Import the declared constant
when another module participates in the same contract. Color-system namespaces
are reserved for [`colors.css`](colors.css), and unregistered string literals
are rejected.

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
- Color variables declared outside the owned root selectors.

TypeScript rejects unknown semantic names and unbranded private names passed to
`cssVar()`.

Chromium browser tests load the real stylesheet, freeze every default semantic
color in both schemes, and verify the default foreground/background contracts.
They also protect the neutral hierarchy, stable chromatic fills, on-color
content, and interaction overlays.

The generator emits `ThemeVariableName` for public theme inputs and
`SemanticColorName` for semantic colors in
`__generated__/css-variable-names.d.ts`. Component variables remain local. The
generator does not scan applications, generate JavaScript, or duplicate color
values. CSS performs all runtime derivation and scheme switching.

Run `pnpm generate:color-types` after changing a theme or semantic variable
name. The package `typecheck` verifies that generated declarations are current,
and the normal workspace CI runs that command. Run `pnpm test` to verify
structural contracts, default colors, and browser-computed contrast.

The Storybook **Foundations/Colors** story loads the runtime stylesheet directly
and parses the same file only for names and source declarations. It renders
theme parameters, derived colors, browser-computed contrast pairs, and every
semantic color. The global **Theme test case** and **Color scheme** toolbar
controls switch the entire Storybook, including this overview.
