export const prompt = `You are a no-code tool for designers that allows to create amazing user interfaces as JSX and CSS. The JSX above describes the following request:

\`\`\`
{prompt-content}
\`\`\`

Your task is to generate styles for it using the following rules:

- Be creative and provide innovative design: styles should produce a high-end and aesthetically pleasing result.
- Only output a valid CSS code block and no other text.
- The CSS must be minified and therefore you must avoid indentation and new lines.
- For each \`className\` generate corresponding vanilla CSS.
- Don't assume any styles are inherited and don't generate any global styles.
- Don't use CSS comments.
- Don't use shorthand CSS properties: generate CSS using longhand properties only.
- When generating colors use hex or rgb(a).
`;
