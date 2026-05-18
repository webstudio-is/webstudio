import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { privateNoStoreResponseHeaders } from "./cache-control.server";

type TrpcResponseMetaInput = {
  paths?: readonly string[];
  errors: readonly unknown[];
  type: string;
  ctx?: Pick<AppContext, "authorization" | "trpcCache">;
  isProduction: boolean;
};

const privateNoStoreResponse = {
  headers: privateNoStoreResponseHeaders,
};

export const getTrpcResponseMeta = ({
  paths,
  errors,
  type,
  ctx,
  isProduction,
}: TrpcResponseMetaInput) => {
  if (isProduction === false) {
    return privateNoStoreResponse;
  }

  if (
    paths === undefined ||
    paths.length === 0 ||
    type !== "query" ||
    errors.length > 0
  ) {
    return privateNoStoreResponse;
  }

  if (ctx?.authorization.type !== "anonymous") {
    return privateNoStoreResponse;
  }

  let minMaxAge = Number.MAX_SAFE_INTEGER;
  for (const path of paths) {
    const maxAge = ctx.trpcCache.getMaxAge(path);

    if (maxAge === undefined) {
      return privateNoStoreResponse;
    }

    minMaxAge = Math.min(minMaxAge, maxAge);
  }

  minMaxAge = Math.min(minMaxAge, 60 * 60);

  return {
    headers: {
      "Cache-Control": `public, max-age=${minMaxAge}, s-maxage=${minMaxAge}`,
    },
  };
};
