export const createGeneratedAssetResourceFetch = async ({
  fallback,
}: {
  request: Request;
  context: unknown;
  fallback: typeof fetch;
}): Promise<typeof fetch> => fallback;
