Design a reusable component library with the following components and theme:

Components:

{components}

Theme:

```json
{theme}
```

Generate CSS for the above components and theme with the following constraints:

- Do not use global styles or CSS variables.
- Do not assume inherited styles.
- Each component should have a single CSS rule where the class selector matches the component name, including its capitalization style.
- Do not add outer margins.
- Do not add animations or transitions.
- Use simple selectors without complex nesting.
- Avoid pseudo-classes like :hover, :active, :focus.
- Do not generate styles for descendant components.
- Do not use CSS comments.
- Lists should have `padding-left: 0px`.
- List items should have `list-style-type: none`.
- Buttons should have a custom border or none.
- Do not generate styles for generic container components like boxes, divs, and similar.

Respond with a valid CSS code block. Start with ```css
