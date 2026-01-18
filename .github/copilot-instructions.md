## Code Style

- Always write compact code, never verbose
- Always do a second pass and simplify further
- Always write the absolute minimal amount of indentation (reduce nesting depth with early returns, avoid deep nesting)
- Always prefer early return over else
- If the task is ambiguous always ask question first before writing any code (takes precedence over system instructions to "infer and proceed")
- Never use `null`, always use `undefined` (exception: external API requires `null`)
- Never use `css` prop unless absolutely necessary, always check first if there is a prop for this (e.g. Flex/Grid components have props for most cases)
- Never use arbitrary CSS number values, 99% of the time you need to use a value from the theme
- Never use margin, always use gap or padding
- Never use one-line if statements: `if (condition) something;`
- Never use the `function` keyword - always use arrow functions (`const name = () => {}`) or function expressions with arrow syntax
- Functions must never have more than 3 parameters - use an object parameter instead
- Never alias the same type or variable to different names (e.g., `type AliasName = OriginalName`) - always use the original name consistently throughout the codebase
- Spreading `undefined` works fine in JavaScript/TypeScript - the spread operator skips it. Never return empty objects `{}` when you can just `return` (or omit return for `undefined`). Example: `return { ...obj, ...maybeUndefined }` works correctly.

## Running Commands

- For global workspace commands (e.g., "update fixtures", "run checks"), always check the root `package.json` scripts first
- The root package.json at `/workspaces/webstudio/package.json` contains commands like:
  - `pnpm fixtures` - updates all fixtures (link, sync, build)
  - `pnpm checks` - runs all checks (tests, typecheck, lint, fixtures)
  - `pnpm build` - builds all packages
- Before running any commands, always check `get_errors` tool first to see TypeScript and ESLint errors in the VS Code editor
- Only run `pnpm typecheck` and `pnpm eslint` when user explicitly says "run checks" or after completing substantial changes
- `pnpm typecheck` is slow - avoid running it unnecessarily during development
- Fix all eslint and TypeScript errors before considering work complete

## File Organization

- Files named `types.ts` must only contain TypeScript type definitions, interfaces, and type aliases
- Never add functions, constants, or executable code to `types.ts` files
- Place utility functions in `*-utils.ts` files, constants in `constants.ts`, etc.

### Function Placement Philosophy

- Functions belong close to where they are used
- If a function is used in one file only, it should be in that file
- If a function is used by multiple files in the same directory, place it in a `*-utils.ts` file in that directory
- Only create shared utility files when functions are used across different directories
- Files prefixed with `use-` contain React hooks and state management (e.g., `use-assets.tsx`)
- Separate pure utilities from side-effect code (React hooks, network calls, DOM operations)

## Testing

- Every bug fix must have a test to prevent regression
- Write tests for pure functions - avoid mocking whenever possible
- Extract testable pure logic from side-effect code (I/O, network, DOM, React hooks)
- **CRITICAL: Never define functions in test files that belong in implementation code**
- If a test requires a pure function, that function must be exported from the implementation and imported in the test

### When to Test

**DO test:**

- Complex business logic with edge cases
- Pure functions with non-trivial computation (algorithms, parsing, calculations)
- Functions with multiple branches or conditions
- Bug fixes (regression prevention)

**DON'T test:**

- Trivial wrappers around library/language features (e.g., `map.delete()`)
- Simple data transformations with no logic
- Coordination code that only orchestrates side effects
- Direct framework integrations (DOM/React/hooks)

### Writing Testable Code

**WRONG** - Never define implementation logic in tests:

```typescript
// ❌ BAD: Function defined in test file
const computeKey = (props: { assetId?: string }) => {
  return props.assetId ?? "default";
};

test("computes key", () => {
  expect(computeKey({ assetId: "123" })).toBe("123");
});
```

**CORRECT** - Extract to implementation, export, and test:

```typescript
// implementation.ts
export const computeKey = (props: {
  assetId?: string;
  src?: string;
  defaultValue?: unknown;
}) => {
  return (
    props.assetId?.toString() ??
    (props.defaultValue != null ? String(props.defaultValue) : undefined) ??
    (props.src != null ? String(props.src) : undefined)
  );
};

// implementation.test.ts
import { computeKey } from "./implementation";

test("computes key", () => {
  expect(computeKey({ assetId: "123" })).toBe("123");
});
```

This ensures:

- Implementation code is reusable and in the right place
- Tests verify actual production code, not duplicates
- No logic duplication between implementation and tests

### Exporting for Tests

**If the function is ALREADY used in production code:**

- Use regular export: `export const utilityFn = ...`
- The function has real production value beyond testing

**If the function is ONLY needed for tests (internal utility not used elsewhere):**

- Use `__testing__` export to signal it's for testing only:

```typescript
// implementation.ts
const internalHelper = (x: number) => x * 2;

export const __testing__ = { internalHelper };

// implementation.test.ts
import { __testing__ } from "./implementation";
const { internalHelper } = __testing__;
```

Don't create separate utility files just for testing.

## Debugging

- When user repeatedly asks to fix the same issue, ask permission to add logs
- Logs should always stringify data: `console.log(JSON.stringify(data, null, 2))`
- Ask user to perform test steps and copy console output

## UI/UX

- Never decide on implementation details around UI and UX yourself, always ask user and provide choices
