export type Params = {
  imageBaseUrl: string;
  assetBaseUrl: string;
};

let params: undefined | Params;

const emptyParams: Params = {
  imageBaseUrl: "/",
  assetBaseUrl: "/",
};

export const getParams = (): Params => params ?? emptyParams;

export const setParams = (newParams: undefined | Params) => {
  params = newParams;
};
