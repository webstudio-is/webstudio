export const prompt = `Given the JSX above and the following edit request:

\`\`\`
{prompt-content}
\`\`\`

Respond with the original JSX code when the edit request is only stylistic and doesn't need any changes to the JSX tree. Essentially you should return the original JSX above when the edit request can be done with CSS only.

Otherwise please respond with a JSX tree using the following rules:

- Don't import or use any dependency or external library.
- Only output a valid JSX code block and no other text.
- The JSX must be minified and therefore you must avoid indentation and new lines.
- Don't use JSX comments.
- Exclusively use the following components:
  - Box: a generic container element
  - Heading
  - TextBlock: typography element for generic blocks of text (eg. a paragraph)
  - Link
  - List
  - ListItem
  - Image
  - Label
  - Input
  - TextArea
  - RadioButton
  - Checkbox
  - Button
- Use short placeholder text.
- Don't add any prop to components.
- Add an \`alt\` prop to Image instances with a description that is no longer than 32 characters.
- Unaltered parts of the JSX should stay as-is, preserving \`className\` etc.
- For styling keep existing \`className\`s and if necessary add a highly reusable \`className\` prop with the following format: \`s-[number]\`.
- Don't generate CSS.
`;
