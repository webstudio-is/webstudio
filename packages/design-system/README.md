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
transforms six theme colors into a deliberately small semantic vocabulary. Full
UI documents load `@webstudio-is/design-system/global.css` once at their root;
components then compose its semantics without injecting global CSS.
Component-owned custom properties stay locally typed instead of entering the
color manifest. These implementation choices are not requirements for other
Craft projects.

The global entry contains only document-wide behavior required by every full
design-system UI: font faces, root theme and semantic color variables, base
document defaults, and browser-native treatments such as text selection.
Component styles remain with their component, while route layout, scroll
locking, and feature integrations remain application-owned. The Builder canvas
intentionally does not load this entry because it hosts authored user documents.

See [Color tokens](src/colors/README.md) for the CSS source format, validation,
type-only generation workflow, and naming rules.

## Tests

Vitest runs pure calculations and server-rendering assertions in Node. Name
tests that require DOM layout, browser APIs, or component interaction
`*.browser.test.ts` or `*.browser.test.tsx`; Vitest Browser Mode runs those in
Chromium through Playwright.

```sh
pnpm --filter @webstudio-is/design-system test
```

Do not use jsdom for design-system tests. Keep pure logic in regular test files
and use Browser Mode whenever browser behavior is part of the contract.
