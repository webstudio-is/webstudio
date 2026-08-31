export const markdownAlertVariants = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
} as const;

export type MarkdownAlertVariant = keyof typeof markdownAlertVariants;

export const markdownAlertTypes = Object.fromEntries(
  Object.entries(markdownAlertVariants).map(([variant, title]) => [
    variant.toUpperCase(),
    title,
  ])
) as Record<Uppercase<MarkdownAlertVariant>, string>;

export type MarkdownAlertType = keyof typeof markdownAlertTypes;

export const getMarkdownAlertMarker = (value: string) => {
  for (const type of Object.keys(markdownAlertTypes) as MarkdownAlertType[]) {
    const marker = `[!${type}]`;
    if (value === marker) {
      return { type, length: marker.length };
    }
    if (value.startsWith(`${marker}\n`)) {
      return { type, length: marker.length + 1 };
    }
    if (value.startsWith(`${marker}\r\n`)) {
      return { type, length: marker.length + 2 };
    }
  }
};
