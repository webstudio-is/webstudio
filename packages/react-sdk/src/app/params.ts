export type Params = {
  resizeOrigin?: string;
  assetBaseUrl: string;
};

let params: undefined | Params;

const emptyParams: Params = {
  assetBaseUrl: "/",
};

export const getParams = (): Params => params ?? emptyParams;

export const setParams = (newParams: undefined | Params) => {
  params = newParams;
};
