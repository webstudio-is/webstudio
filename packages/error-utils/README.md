# Error utils

## API

`captureError(error, value)`

- Provides a compile error when value is not `never`
- Throws a runtime error in development synchronously to break intentionally
- Throws an error in production asynchronously to not break unintentionally

```ts
import { captureError } from "error-utils";

const fn = (value: { type: string }) => {
  if (value.type === "foo") {
    return value;
  }

  return captureError(new Error("Should never happen"), value);
};
```
