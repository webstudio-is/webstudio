# JSX Utils

Utilities to work with JSX, including converting it to Webstudio format.

## Usage

Install the package

```
pnpm i @webstudio-is/jsx-utils
```

Transform a JSX string to Webstudio Embed Template:

```ts
import { jsxToWSEmbedTemplate } from "@webstudio-is/jsx-utils";

await jsxToWSEmbedTemplate("<Box>hello</Box>");
```
