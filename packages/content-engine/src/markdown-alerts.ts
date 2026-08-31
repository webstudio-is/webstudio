export const markdownAlertTypes = {
  NOTE: "Note",
  TIP: "Tip",
  IMPORTANT: "Important",
  WARNING: "Warning",
  CAUTION: "Caution",
} as const;

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
