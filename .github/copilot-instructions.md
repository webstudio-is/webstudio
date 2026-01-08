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

## Running Checks

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

- Test utilities, not components
- Every bug fix must have a test to prevent regression

### Exporting Utilities for Testing

When testing internal utilities, export via `__testing__`:

```typescript
export const __testing__ = { internalUtility };
```

Import in tests:

```typescript
const { internalUtility } = __testing__;
```

Don't create separate utility files just for testing.

## Debugging

- When user repeatedly asks to fix the same issue, ask permission to add logs
- Logs should always stringify data: `console.log(JSON.stringify(data, null, 2))`
- Ask user to perform test steps and copy console output

## UI/UX

- Never decide on implementation details around UI and UX yourself, always ask user and provide choices
