export const categories = {
  layout: { label: "Layout" },
  flexChild: { label: "Flex Child" },
  gridChild: { label: "Grid Child" },
  space: { label: "Space" },
  size: { label: "Size" },
  position: { label: "Position" },
  typography: { label: "Typography" },
  backgrounds: { label: "Backgrounds" },
  borders: { label: "Borders" },
  effects: { label: "Effects" },
  other: { label: "Other" },
};

export type Category = keyof typeof categories;
