type BaseMeta = {
  id: string;
  label: string;
  url: string;
  authToken: string;
  projectId: string;
};

type PanelMeta = BaseMeta & {
  category: "templates";
};

type DialogMeta = BaseMeta & {
  category: "apps";
  width?: number;
  height?: number;
};

export type MarketplaceProduct = PanelMeta | DialogMeta;
