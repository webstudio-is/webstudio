export const prompt = `The JSX above describes the following request:

\`\`\`
{prompt-content}
\`\`\`

Your task is to style the JSX in a way that fulfills the request above making it look great. In order to do this you will use Tailwind CSS: for each \`className\` generate a list of space separated Tailwind CSS classes expressed as YAML. Keep styles consistent.

Guidelines:

- Remove underline from links.
- Add round corners to buttons.
- Add consistent inner and outer spacing.
- Use proper colors for text and backgrounds.

Return a valid YAML code block and no other text or explanation.

Example JSX input:

\`\`\`jsx
<Box className="s-1">
  <Box className="s-2">
    <Box className="s-3">
      <Heading className="s-4">Title</heading>
      <TextBlock className="s-5">Subtitle</TextBlock>
    </Box>
  </Box>
  <Box className="s-2">
    <TextBlock className="s-5">Description</TextBlock>
  </Box>
</Box>
\`\`\`

Example styles output:

\`\`\`YAML
- s-1: "flex flex-col items-center justify-center bg-black"
- s-2: "text-white text-lg"
- s-3: "text-center"
- s-4: "text-3xl font-bold mb-2"
- s-5: "text-base"
\`\`\`
`;
