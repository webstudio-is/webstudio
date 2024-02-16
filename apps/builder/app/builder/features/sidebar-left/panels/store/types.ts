export type Category = "sectionTemplates" | "apps";

export type StoreItem = {
  id: string;
  category: Category;
  label: string;
  url: string;
  ui?:
    | {
        component: "panel";
      }
    | {
        component: "dialog";
        width?: number;
        height?: number;
      };
};
