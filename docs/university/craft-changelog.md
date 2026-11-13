---
description: Review changes to the Craft specification.
---

# Craft changelog

## Next

- Defined the Craft architecture, naming grammar, color semantics,
  accessibility requirements, extension rules, and conformance criteria.
- Defined Webstudio Tokens as composite Tokens and aligned component, utility,
  semantic, variant, and size naming.
- Replaced `--foreground-border` with the correctly categorized
  `--border-default` variable.
- Replaced the color variable `--focus-color` with `--border-focus`.

## 1.2

- Changed `container` to use flex for compatibility with Craft Library. Set
  `display` to `flex`, `flex-direction` to `column`, and `gap` to
  `var(--gap-m)`. Apply horizontal layout changes on Local where needed.

## 1.1

- Added `--spacing-default` for shared container and card padding.

## 1.0

- Released Craft.

## Related

- [Craft](craft.md) – Follow the current specification
- [Use Craft](craft-guide.md) – Apply the specification in a Webstudio project
- [CSS variables](foundations/css-variables.md) – Define reusable values
