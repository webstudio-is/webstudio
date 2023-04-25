given the following spec:

```typescript
type InstanceId = string;
type Component =
  | "Box"
  | "Heading"
  | "TextBlock"
  | "Link"
  | "List"
  | "ListItem"
  | "Image"
  | "Label"
  | "Input"
  | "TextArea"
  | "RadioButton"
  | "Checkbox"
  | "Button";

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
  id: InstanceId;
  component: Component;
  styles: Array<Style>;
  props: Array<ComponentProps>;
  children: Array<Instance | Text>;
};
```

generate an executable JavaScript function called `edit` that takes an instance tree, finds or creates the right nodes and fulfills the following request:

```
{prompt-content}
```

Rules:

- Please output only a single `edit` function implementation as code block and no other explanation.
- I need to be able to eval the function and execute it myself.
- Don't add side-effects.
- Don't rely on globals.
