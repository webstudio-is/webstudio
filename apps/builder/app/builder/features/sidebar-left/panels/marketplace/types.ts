export type Category = "sectionTemplates" | "apps";

export type MarketplaceItem = {
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
