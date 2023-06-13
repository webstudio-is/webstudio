Given the following strict TypeScript definitions:

```typescript
type InstanceId = string;
// prettier-ignore
type Component = {components};

// Text is a text node.
type Text = {
  type: "text";
  value: string;
};

type Style = {
  /*
   property are camelCase e.g. flexDirection.
  */
  property: ValidCssPropertyInCamelCase;
  value: ValidCssValue;
};

type Instance = {
  type: "instance";
  component: Component;
  styles: Array<Style>;
  children: Array<Instance | Text>;
};
```

generate an executable JavaScript function called `edit` to fulfill the following request:

```
{request}
```

The `edit` function has the following signature:

```typescript
type EditFunction = (
  instance: Instance,
  parseStyle: ParseStyleFunction
) => Instance;
type ParseStyleFunction = (style: Style) => Style[];
```

The `edit` function takes an instance tree, finds or creates the right nodes to fulfill the request above.

The `parseStyle` function wraps every instance style edit and spreads the result. For example if you are adding some styles:

```javascript
function edit(instance, parseStyle) {
  instance.styles.push(...parseStyle({ property: "color", value: "#ff0000" }));
}
```

Rules:

- Please output only a single `edit` function implementation as JavaScript code block and no other explanation.
- Output only the `edit` function so that I can later evaluate it using Node.js' `vm` module: I will write the evaluation logic.
- Don't generate function definitions using `const` or `let` eg. `const edit = ...` is wrong.
- Don't add side-effects.
- Don't rely on globals.
- Use hex or rgb(a) for colors.

Additional project details:

- Palette: {palette}
- Current Color mode: {colorMode}
