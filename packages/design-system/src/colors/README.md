# Color tokens

[`colors.css`](colors.css) is the runtime and source of truth for design-system
colors. Do not edit files in `__generated__/` directly; generated files contain
types only.

The implementation follows the public
[Craft specification](https://docs.webstudio.is/university/craft): color seeds
flow through the active scheme profile into theme colors, semantic colors, and
finally composite component styles.

## Architecture

The CSS source contains four stages:

1. Six seeds define neutral, accent, and intent hue and chroma once.
2. A light or dark profile defines shared lightness and chroma behavior.
3. Seven theme colors combine the seeds with the active profile.
4. Semantic foreground, background, border, and overlay colors derive from the
   theme colors.

Components consume only semantic colors with `cssVar()`. Colors are not copied
into the Stitches theme, and components cannot access seed, profile, or theme
authoring inputs through the generated public type.

Changing a seed updates both color schemes. Changing a profile value updates
every color governed by that dimension. Dark mode overrides the profile rather
than maintaining a second semantic color set.

## Source format

Use native CSS aliases, relative colors, and `color-mix()`:

```css
--seed-accent: oklch(50% 0.21 255);
--profile-intent-lightness: 54%;

--theme-accent: oklch(
  from var(--seed-accent) var(--profile-intent-lightness)
    calc(c * var(--profile-intent-chroma)) h
);

--background-accent: var(--theme-accent);
--overlay-interaction-hover: oklch(from var(--theme-foreground) l c h / 6%);
```

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

`cssVar(name, fallback?)` follows the arguments of native `var()`. The first
argument is type-checked against public variables parsed from this CSS source:

```ts
cssVar("--foreground-primary");
cssVar("--foreground-primary", "currentColor");
```

## Validation and type generation

Type generation parses CSS structurally and rejects:

- Empty color layers or mismatched light and dark profiles.
- Missing variable references.
- References across forbidden architectural layers.
- Unused seed, profile, and theme inputs.
- Standalone semantic color literals.
- Circular color references.
- Semantic names outside the Craft grammar.

TypeScript rejects unknown public variable names passed to `cssVar()`.

Browser tests load the real stylesheet and reject:

- Foreground/background text pairs below 4.5:1 contrast.
- Meaningful border/background pairs below 3:1 contrast.

The generator emits only `CssVariableName` in
`__generated__/css-variable-names.d.ts`. It does not generate JavaScript or
duplicate color values. CSS is imported directly and performs all runtime
derivation and scheme switching.

Run `pnpm generate:color-types` after changing public variables. Run
`pnpm check:colors` to verify structural contracts and generated output. Run
`pnpm test` to verify browser-computed contrast.

The Storybook **Foundations/Colors** page loads the runtime stylesheet directly
and parses the same file only for names and source declarations. It renders
seeds, the active profile, browser-computed contrast pairs, theme colors, and
every semantic color.
