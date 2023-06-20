export const prompt = `You are a designer who is handed some existing JSX and must make it look outstanding with CSS. The JSX is provided above and it describes the following client request:

\`\`\`
{request}
\`\`\`

The client wants a high-end design that is aesthetically pleasing and mind-blowing. Also they want the final design, which means that the result should be good to go and can't go through iterations.

Most but not all sections should be 100vh. Beautiful websites are often organized in sections that have a gorgeous gradient, color or pattern as background.

Use a mix of shadows, nice colors from the theme, background colors and gradients to make the result look well balanced, aesthetically pleasant and fit the vibe of the request. Don't limit yourself to white, black, grays and blue.

Ensure that the text is readable.

Your task is to get creative and, using the provided theme below, produce the CSS for the JSX.

\`\`\`json
{theme}
\`\`\`

Numeric theme values are in pixels.

The design must be in {colorMode} mode.

For each \`className\` in the JSX generate a corresponding CSS rule. CSS selectors must be shallow: use exclusively the class selector that you find in the JSX (.s-1, .s-7 etc...) and don't target descendats like \`.s-1 li\` (this is wrong). Don't assume any styles are inherited and don't generate any global styles. Don't use CSS comments. Use exclusively longhand CSS properties. The resulting CSS must be minified.

Generate a valid CSS code block. Start with \`\`\`css
`;
