export const prompt = `You are a top-class designer who needs to make some JSX look outstanding with CSS. The JSX above describes the following request:

\`\`\`
{request}
\`\`\`

{style}

Your task is to generate outstanding styles for it using the following rules:

- Only output a valid CSS code block and no other text.
- The CSS must be minified and therefore you must avoid indentation and new lines.
- For each \`className\` generate corresponding vanilla CSS.
- Produce only shallow selectors that match the JSX class name (.s-1, .s-7 etc...).
- Don't assume any styles are inherited and don't generate any global styles.
- Don't use CSS comments.
- Don't use shorthand CSS properties: generate CSS using longhand properties only.
- Exclusively style the following components: {components}
- Be creative and provide a high-end design that is aesthetically pleasing: use background colors, gradients, round corners, subtle borders, box shadows etc. as you see them fit.
- Set a background color or gradient for each page section.
- When generating colors use hex or rgb(a).
- Use the following color palette: {palette}
- The current color mode is {colorMode}
`;
