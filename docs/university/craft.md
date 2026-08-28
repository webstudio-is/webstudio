---
description: Craft is the standard for building maintainable and reusable projects with Webstudio.
icon: ruler-triangle
---

# Craft

Craft is the universal standard for building maintainable, reusable, and
portable projects with Webstudio. It defines how to name and use CSS variables,
Tokens, and Local styles so that people and shared Marketplace resources can
work together without introducing incompatible conventions.

Craft is recommended, but not mandatory. A project can extend Craft for its
domain without turning those extensions into requirements for every Craft
project.

{% hint style="info" %}
Contribute changes to Craft by commenting on this [GitHub Discussion](https://wstd.us/discuss-craft).
{% endhint %}

{% embed url="https://youtu.be/EeLoBZvlygI" %}

## Specification language

Craft uses the following terms to distinguish requirements from guidance:

- **Must** identifies a requirement for Craft conformance.
- **Should** identifies a recommendation that may be ignored when a project
  has a documented reason.
- **May** identifies an optional feature or extension.

## Architecture

Craft has three layers:

```text
Theme variables
      ↓
Semantic variables
      ↓
Composite Tokens
```

### Theme variables

Theme variables contain the values that make one theme different from another.
They may contain literal values or reference palette variables such as those
provided by Open Props.

Craft does not require every project to use the same number of theme variables.
A project must document its theme variables when it publishes reusable
resources or a theme for other projects.

### Semantic variables

Semantic variables describe why a value is used rather than what the value
looks like. For example, use `--foreground-negative` for an error message
instead of consuming a red palette value directly.

Semantic variables must reference theme variables or other semantic variables.
They should not contain standalone literal design values.

### Composite tokens

A Webstudio Token packages multiple style declarations. Craft calls these
**composite Tokens** to distinguish them from individual values stored in CSS
variables.

Composite Tokens must consume semantic variables when a suitable variable
exists. They should not consume palette or theme variables directly.

Components, utilities, variants, and sizes are purposes of composite Tokens,
not additional layers in the architecture.

### Local styles

Use **Local** for values and declarations that belong to one instance. Move a
decision into a CSS variable or composite Token when it becomes reusable.

## CSS variables

Craft projects may use [Open Props](https://open-props.style/), an MIT-licensed
collection of CSS variables, for palettes and scales. Open Props variables are
optional theme inputs and utilities; they are not replacements for Craft
semantic variables.

Define variables that are shared across a project on **Global Root**. Define a
variable on a closer common ancestor when its meaning is intentionally local to
one page, section, or component subtree.

### Naming variables

CSS variable names must:

- Use kebab-case.
- Use complete words unless an abbreviation is part of the approved Craft
  vocabulary.
- Describe purpose rather than visual appearance at the semantic layer.

Semantic color variables use this grammar:

```text
--{category}-{purpose}[-{state}]
```

- **Category** is exactly one of `foreground`, `background`, `border`, or
  `overlay`.
- **Purpose** is one or more kebab-case terms that describe the color's reusable
  meaning. Compound purposes place a variation after its base purpose, such as
  `negative-subtle`.
- **State** is an optional final `hover`, `pressed`, `selected`, `disabled`, or
  `focus` suffix. Treat the final term as a state only when the project's
  documented registry declares that name as a state variable. For example,
  `--overlay-interaction-pressed` is a pressed interaction overlay, while
  `--foreground-disabled` is a registered purpose.

The core color variable list is the registry of universal purposes. Extensions
must document their additional names and whether the final term is a purpose or
state. An extension may introduce a compound purpose but must not reinterpret a
registered core name.

Examples:

```css
--foreground-primary
--overlay-interaction-hover
--border-negative
--overlay-scrim
```

Palette and scale variables use numbers:

```css
--blue-10
--size-4
```

Do not encode a literal value in a semantic name:

```css
/* Avoid */
--foreground-gray
--background-blue-hover

/* Prefer */
--foreground-muted
--background-accent
```

## Semantic colors

Craft organizes interface colors into four categories:

- **Foreground** for text, icons, and other marks drawn over a background.
- **Background** for canvases, surfaces, controls, and filled states.
- **Border** for boundaries, separators, and focus indicators.
- **Overlay** for translucent interaction layers and scrims.

Common purpose and state terms include:

```text
Emphasis purposes: primary, secondary, muted, disabled, inverse
Intent purposes: accent, positive, negative, warning, informative
Purpose variation: subtle
State: hover, pressed, selected, disabled, focus
```

This vocabulary is not a matrix. Define a semantic variable only for a reusable
decision that multiple composite Tokens consume or for an explicit
accessibility pairing. Do not generate every combination of category, intent,
variation, and state.

### Core color variables

The universal baseline is intentionally small:

```css
/* Foreground */
--foreground-primary
--foreground-secondary
--foreground-disabled

/* Background */
--background-primary
--background-secondary
--background-disabled

/* Border */
--border-default
--border-focus

/* Overlay */
--overlay-scrim
```

Projects extend this baseline as their composite Tokens establish reusable
needs. Shared Marketplace resources must declare which variables they require
and must not silently depend on undocumented project-specific variables.

Intent extensions commonly use matching foreground, background, border, and
paired foreground names:

```css
--foreground-negative
--background-negative
--background-negative-subtle
--border-negative
--foreground-on-negative
```

Use paired `foreground-on-*` variables for content placed on a strong semantic
background. The pair remains explicit even when several pairings resolve to
the same value because each pairing defines an independently verifiable
contrast contract.

Compose component states from existing semantic variables inside the composite
Token. Shared translucent overlays can express hover and pressed states without
creating a resolved state color for every background:

```css
--overlay-interaction-hover
--overlay-interaction-pressed
--overlay-on-inverse-hover
--overlay-on-inverse-pressed
```

Promote a state color to the semantic layer only when it is independently
reusable and composition cannot express the decision. Component-specific color
variables are not part of the default Craft architecture. Introduce one only
when a component intentionally exposes it as a public theming contract.

For example, `checked`, `on`, and `current` commonly compose a selected
presentation; `invalid` commonly composes negative foreground and border
colors. These component states do not require new global colors by themselves.

### Deriving colors

Semantic colors should remain connected to the theme. Prefer aliases and
relative color expressions over duplicated literals:

```css
:root {
  color-scheme: light dark;

  --seed-neutral: oklch(50% 0.01 250);
  --seed-accent: oklch(50% 0.2 255);

  --theme-background: light-dark(
    oklch(from var(--seed-neutral) 98% 0.002 h),
    oklch(from var(--seed-neutral) 17% 0.012 h)
  );
  --theme-foreground: light-dark(
    oklch(from var(--seed-neutral) 20% 0.015 h),
    oklch(from var(--seed-neutral) 94% 0.006 h)
  );
  --theme-accent: light-dark(
    oklch(from var(--seed-accent) 54% c h),
    oklch(from var(--seed-accent) 72% calc(c * 0.82) h)
  );

  --background-primary: var(--theme-background);
  --foreground-primary: var(--theme-foreground);
  --background-accent: var(--theme-accent);
  --overlay-interaction-hover: oklch(
    from var(--theme-foreground) l c h / 6%
  );
}
```

Define a hue seed once and derive its scheme-specific result. `light-dark()` may
select between derived expressions when the project supports native
`color-scheme`. A project may instead override a small shared transformation
profile for each scheme. Do not maintain independent light and dark copies of
the semantic layer.

The example does not prescribe a fixed number of seeds or theme variables. It
demonstrates the required separation between authoring inputs, theme colors,
and semantic outputs.

### Other core variables

Craft retains a small vocabulary for reusable layout, focus, and motion values:

```css
--gap-xs
--gap-s
--gap-m
--gap-l
--spacing-default

--focus-width
--focus-offset

--duration-default
--easing-default
```

These variables follow the same architecture: their semantic values should
derive from documented theme or scale inputs where appropriate.

## Interaction states

Use these semantic states consistently:

| State      | Meaning                                                        |
| ---------- | -------------------------------------------------------------- |
| `hover`    | A pointing device is over an interactive target.               |
| `pressed`  | A target is being activated. CSS `:active` maps to `pressed`.  |
| `selected` | An option or item is chosen, current, checked, or switched on. |
| `disabled` | An interaction is unavailable.                                 |
| `focus`    | A target has visible keyboard focus.                           |

States such as `open`, `pending`, `invalid`, and application-specific statuses
may affect several properties. Express them with composite Token variants and
reuse the closest semantic colors rather than automatically creating a global
color for each state name.

## Accessibility

Craft conformance requires WCAG 2.2 Level AA. Themes and extensions must
preserve accessible semantic pairings.

- Normal text must have a contrast ratio of at least 4.5:1 against its
  background.
- Large text must have a contrast ratio of at least 3:1 against its background.
- Meaningful non-text interface graphics must have a contrast ratio of at least
  3:1 against adjacent colors.
- Keyboard focus must remain visible.
- Color must not be the only way to communicate status or state.
- Disabled styling may be subtle, but must not obscure information required to
  understand the interface.
- Every supported theme must satisfy the same requirements.

Craft additionally recommends meeting the WCAG 2.2 Level AAA Focus Appearance
criterion: a custom focus indicator should provide at least a 3:1 change of
contrast and an area at least equivalent to a 2 CSS pixel perimeter.

See the WCAG 2.2 criteria for
[text contrast](https://www.w3.org/TR/WCAG22/#contrast-minimum),
[non-text contrast](https://www.w3.org/TR/WCAG22/#non-text-contrast),
[use of color](https://www.w3.org/TR/WCAG22/#use-of-color),
[focus visibility](https://www.w3.org/TR/WCAG22/#focus-visible), and
[focus appearance](https://www.w3.org/TR/WCAG22/#focus-appearance).

## Composite tokens

Composite Tokens combine reusable declarations. Their values should reference
CSS variables so a theme can change without editing the Token.

| Purpose   | Naming             | Examples                        |
| --------- | ------------------ | ------------------------------- |
| Utility   | Kebab-case         | `margin-auto`, `flex-gap-small` |
| Component | Kebab-case         | `button`, `input`, `card`       |
| Semantic  | Title case         | `Pricing Card`, `Team Member`   |
| Variant   | `is-{base}-{name}` | `is-button-secondary`           |
| Size      | `{base}-{size}`    | `button-small`, `button-large`  |

A variant must be used with its base Token. A size Token should contain only
the declarations needed to change size.

Prefer a composite Token when a reusable decision needs multiple declarations
or coordinated states. Prefer a CSS variable for one reusable value. Use Local
for an instance-specific exception.

When multiple Tokens set the same property, the rightmost style source wins.
Place Local last when an instance needs to override a Token.

## Extensions and exceptions

A project may extend Craft when the core vocabulary cannot express a reusable
domain concept.

An extension must:

1. Follow the same naming grammar.
2. Describe purpose rather than a specific visual value.
3. Reuse or derive from existing theme and semantic variables when possible.
4. Introduce a new theme value only when an existing value cannot preserve the
   intended distinction.
5. Document its meaning, supported states, accessibility pairings, and theme
   behavior when it is shared outside the project.

Literal colors are appropriate when the color belongs to user content, an
external representation, data visualization, or a functional preview that
must not change with the interface theme. Document shared exceptions so they
are not mistaken for missing semantic variables.

Project-specific extensions do not become Craft core automatically. Promote an
extension only when the same semantic need is reusable across unrelated
projects.

## Conformance

A project conforms to Craft when:

- Shared composite Tokens use semantic variables where suitable.
- Semantic variables derive from documented theme or semantic variables.
- Theme changes do not require editing composite Tokens.
- Variable and Token names follow the Craft grammar.
- Required foreground and background pairings meet the accessibility rules.
- Shared extensions and literal exceptions are documented.
- Reusable resources declare their required Craft variables and extensions.

Conformance does not require every project to define every variable in the
reference list. It requires every consumed variable and extension to follow the
contract.

## Related

- [Use Craft](craft-guide.md) – Apply the specification in a Webstudio project
- [Craft changelog](craft-changelog.md) – Review changes to the standard
- [Design tokens](foundations/design-tokens.md) – Create and manage reusable composite Tokens
- [CSS variables](foundations/css-variables.md) – Define and scope reusable values
- [States and selectors](foundations/states-and-selectors.md) – Style interaction states
