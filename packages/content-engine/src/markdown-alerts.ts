export const markdownAlertTypes = [
  "NOTE",
  "TIP",
  "IMPORTANT",
  "WARNING",
  "CAUTION",
] as const;

export type MarkdownAlertType = (typeof markdownAlertTypes)[number];

export const getMarkdownAlertMarker = (value: string) => {
  for (const type of markdownAlertTypes) {
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
