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
  theme inputs, derives the semantic values, and provides compatibility for the
  existing component API.

The current color implementation uses seven light/dark theme controllers. That
number and those controller names are specific to Webstudio's interface; Craft
does not require other projects to copy them.

See [Color tokens](tokens/README.md) for the source format, recipe operations,
generation workflow, and naming rules.
