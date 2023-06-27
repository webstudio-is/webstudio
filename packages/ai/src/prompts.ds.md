In this RFC I describe a potential way to implement AI generation in Webstudio. The solution aims to work on blank, new projects and existing ones and uses a mix of AI and manual tooling to generate a design system that is then used to build pages or sections of them.

The generation process is a chain of actions which might be different depending on whether this is a blank, new project or an existing one.

## 1. Construct a theme and turn it into design tokens

### New

Generate it with AI based on user request, merge with default base theme. See theme structure below.

Default base theme:

```json
{
  "fontSize": {
    "xs": 10,
    "s": 12,
    "m": 14,
    "l": 16,
    "xl": 18,
    "2xl": 20,
    "3xl": 24,
    "4xl": 28
  },
  "spacing": {
    "xs": 4,
    "s": 8,
    "m": 12,
    "l": 16,
    "xl": 20,
    "2xl": 24,
    "3xl": 28,
    "4xl": 32
  },
  "borderRadius": {
    "xs": 2,
    "s": 4,
    "m": 6,
    "l": 8,
    "xl": 10,
    "2xl": 12,
    "3xl": 16,
    "4xl": 20
  }
}
```

AI generates the dynamic bits of the theme using the following type definitions:

```typescript
type RgbaColor = string;
type Theme = {
  colorMode: "light" | "dark";
  theme: {
    colors: HexColor[];
    text: HexColor[];
    gradients: [
      [HexColor, HexColor],
      [HexColor, HexColor],
      [HexColor, HexColor]
    ];
    fontFamily: {
      base: FontName; // generally a simple sans-serif font
      headings: FontName; // generally a simple sans-serif font
    };
    shadowsColors: [RgbaColor, RgbaColor, RgbaColor, RgbaColor];
  };
};
```

<details>
  <summary>GPT prompt</summary>

````markdown
You are a designer and the client came to you with the following request:

```text
{request}
```

Your task is to:

- Produce a theme for the request: we will use in the final designs. Select colors (their hex value) from the Tailwind CSS color palette. Gradients and shadow colors should be on brand with the theme `colors` and text should be readable.
- Determine whether the design should be in light or dark mode

Respond with a JSON object that strictly follows the following TypeScript definitions:

```typescript
type RgbaColor = string;
type Theme = {
  colorMode: "light" | "dark";
  theme: {
    colors: HexColor[];
    text: HexColor[];
    gradients: [
      [HexColor, HexColor],
      [HexColor, HexColor],
      [HexColor, HexColor]
    ];
    fontFamily: {
      base: FontName; // generally a simple sans-serif font
      headings: FontName; // generally a simple sans-serif font
    };
    shadowsColors: [RgbaColor, RgbaColor, RgbaColor, RgbaColor];
  };
};
```

Respond with a valid JSON code block. Start with ```json
````

</details>

### Existing

Try to reconstruct a theme from existing tokens and/or styles. We would need to parse all the styles (and sources) to reconstruct a theme, filling the blanks when the some theme values don't exist. We could try to generate the missing theme values with AI.

## 2. Components

Once we have a theme, we will turn it into tokens (CSS variables) and need to put together a components library.

### New

Since in the long term Webstudio should support custom components and even allow the user to replace all the components with their own, we are going to do the following:

- We create a library of standard component implementations for the default Webstudio components (Box, Button etc.)
- For each component we create a few versions in different styles. Each version will have a descriptive tag for the style.

At this point we ask the AI to take a list of user components names and map that to the default ones. For example:

````markdown
Given the following components names:

- div
- section
- h1
- h2
- img
- span
- video-player
- accordion

Find a similar component name in the list below and return a new list of component names as an object. If you can't find a even minimal relevant match just map the component to `null`.

```typescript
type Components = Record<
  OriginalComponentName,
  "Box" | "Heading" | "Image" | "Span" | null
>;
type ComponentsStyle = "retro" | "flat" | "modern" | "minimalist";

type Result = {
  style: ComponentsStyle;
  components: Components;
};
```

Just return a valid JSON code block based on the following request:

```
A website for a Denver brewery called Tart that specializes in sour beer. The vibe should be fresh, modem, with citrus motifs and lots of product imagery.
```

Start with ```json
````

Example response:

```json
{
  "style": "modern",
  "components": {
    "div": "Box",
    "section": "Box",
    "h1": "Heading",
    "h2": "Heading",
    "img": "Image",
    "span": "Span",
    "video-player": null,
    "accordion": null
  }
}
```

At this point we have styles for each user component. These styles use CSS variables that match the ones in the theme. Since the components (styles) are handmade they will be high quality.

Our component libraries will have a number of components with variants for each default element eg. `Box`. Each of these components will have a `variant name` which we will use as a prop in the next step when generating a page using the components.

TODO: figure out what to do when crucial components are missing eg. containers for layout

### Existing

For existing projects we would need to try build a component library from existing components and their styles. For example if the user has a project with a `div` component we would:

- select all the styles that apply to divs
- with the common ones we make a base div and with remaining we try to generate variants?

TODO: figure out how feasible is this?
TODO: figure out how we then map styles to theme

## 3. Generate a page or a section

Now that we have the styles for the components and most importantly their `variant name` we can ask GPT to generate a page like this:

````markdown
You are React developer and your task is to generate a JSX tree using the client request and components below.

Client request:

```
A website for a Denver brewery called Tart that specializes in sour beer. The vibe should be fresh, modem, with citrus motifs and lots of product imagery.
```

Components:

- div
- section
- h1
- h2
- img
- span
- video-player
- accordion

Each component can have a `variant` attrirbute. Below are the available variants for each component:

```json
{
  "div": ["2columns", "3Columns", "fullWidthSection", "spacer-s", "spacer-m", "spacer-l", "spacer-x-s", "spacer-x-m", "spacer-x-l", "spacer-y-s", "spacer-y-m", "spacer-y-l"],
  "section": ["2columns", "3Columns", "fullWidthSection", "spacer-s", "spacer-m", "spacer-l", "spacer-x-s", "spacer-x-m", "spacer-x-l", "spacer-y-s", "spacer-y-m", "spacer-y-l"],
  "h1": ["heading-s", "heading-m", "heading-l"],
  "h2": ["heading-s", "heading-m", "heading-l"],
  etc...
}
```

Don't use external dependences.

Respond only with a valid JSX code block. Start with ```jsx
````

This should give us a components tree for the page which we can turn into Webstudio Embed Template.

To each component we would apply the base styles eg. `div` gets the base styles for a `Box` based on the mapping that the AI did. We would also apply the `variant` styles to it.
