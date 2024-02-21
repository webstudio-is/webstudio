export type Category = "sectionTemplates" | "apps";

type BaseProduct = {
  id: string;
  category: Category;
  label: string;
  url: string;
  authToken: string;
  projectId: string;
};

type PanelProduct = BaseProduct & {
  component: "panel";
};

type DialogProduct = BaseProduct & {
  component: "dialog";
  width?: number;
  height?: number;
};

export type MarketplaceProduct = PanelProduct | DialogProduct;
