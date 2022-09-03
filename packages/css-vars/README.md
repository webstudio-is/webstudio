# CSS Vars utils

This package helps you create uniquely named css variables as well as use them.

## Example

```ts
import { cssVars } from "css-vars";

const myVariable = cssVars.define("my-variable"); // --my-variable-0

cssVars.use(myVariable, "fallback"); // var(--my-variable-0, fallback)
```
