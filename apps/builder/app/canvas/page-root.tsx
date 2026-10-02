export const getPageRootHostKey = (
  hostKey: string | undefined,
  pageKey?: string
) => (pageKey === undefined ? hostKey : `${pageKey}:${hostKey ?? ""}`);
