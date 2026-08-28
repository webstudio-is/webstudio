# Webstudio design system

This package implements Webstudio's internal design system. It follows the
public [Craft specification](https://docs.webstudio.is/university/craft), which
defines the universal contract for reusable Webstudio projects and design
systems.

Craft and this package have different responsibilities:

- **Craft defines the architecture:** theme variables, semantic variables,
  composite Tokens, Local styles, naming, states, accessibility, extensions,
  and conformance.
- **This package implements that architecture for Webstudio:** it chooses the
  color seeds and scheme profiles, derives theme and semantic colors, and
  consumes those semantics in composite component styles.

The implementation defines each color seed once. A shared light or dark profile
transforms those seeds into seven theme colors, which drive a deliberately
small semantic vocabulary. Components load the CSS directly and compose those
semantics without component-specific color variables. These implementation
choices are not requirements for other Craft projects.

See [Color tokens](src/colors/README.md) for the CSS source format, validation,
type-only generation workflow, and naming rules.
