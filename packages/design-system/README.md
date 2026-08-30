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
transforms six theme colors into a deliberately
small semantic vocabulary. Components load the CSS directly and compose those
semantics without component-specific color variables. These implementation
choices are not requirements for other Craft projects.

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
