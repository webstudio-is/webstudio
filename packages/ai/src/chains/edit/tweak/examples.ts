export const examples = {
  "modify or replace text or copy": `function edit(instance, parseStyle) {if (instance.type === 'instance') {instance.children.forEach((child) => {if (child.type === 'text') {child.value = 'Replacement text.';} else {edit(child, parseStyle);}});}return instance}`,
  "add color": `function edit(instance, parseStyle) {if (instance.type === 'instance') {instance.styles.push(...parseStyle({ property: 'color', value: '#00ff00' }));instance.children.forEach((child) => {if (child.type === 'instance') {edit(child, parseStyle)}})}return instance}`,
  "edit color": `function edit(instance, parseStyle) {if (instance.type === 'instance') {instance.styles = instance.styles.flatMap((s) => {if (s.property !== 'color') {return s}return parseStyle({ property: "color", value: "#a9cc1e"})});instance.children.forEach((child) => {if (child.type === 'instance') {edit(child, parseStyle)}})} return instance}`,
  "add or change background color": `function edit(instance, parseStyle) { if (instance.type === "instance") { const newColor = '#f0aC3a'; let isEdit = false; instance.styles = instance.styles.flatMap((s) => { if (s.property !== "backgroundColor") { return s } isEdit = true; return parseStyle({ property: "backgroundColor", value: newColor }) }) if (!isEdit) { /*add color*/ instance.styles.push([...parseStyle({ property: "backgroundColor", value: newColor })]) } } return instance}`,
  "remove underline": `function edit(instance, parseStyle) {if (instance.type === 'instance') {instance.styles.push(...parseStyle({ property: 'textDecoration', value: 'none' }));instance.children.forEach((child) => {if (child.type === 'instance') {edit(child, parseStyle)}})}return instance}`,
};

export const wrapExample = (example: string) => {
  return `\`\`\`javascript
${example}
\`\`\``;
};
