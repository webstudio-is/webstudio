# Design system

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
