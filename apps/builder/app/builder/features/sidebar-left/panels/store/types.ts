export type Category = "sectionTemplates";

export type StoreItem = {
  id: string;
  category: Category;
  label: string;
  url: string;
  width?: number;
  height?: number;
};
