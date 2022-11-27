export type Params = {
  resizeOrigin?: string;
};

let params: Params | null = {};

const emptyParams: Params = {};

export const getParams = (): Params => params ?? emptyParams;

export const setParams = (newParams: Params | null) => {
  params = newParams;
};
