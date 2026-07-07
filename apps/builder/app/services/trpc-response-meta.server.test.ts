import { describe, expect, test } from "vitest";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { privateNoStoreResponseHeaders } from "./cache-control.server";
import { getTrpcResponseMeta } from "./trpc-response-meta.server";

const createContext = (
  authorization: AppContext["authorization"],
  maxAges: Record<string, number | undefined> = {}
): Pick<AppContext, "authorization" | "trpcCache"> => ({
  authorization,
  trpcCache: {
    setMaxAge: () => {},
    getMaxAge: (path) => maxAges[path],
  },
});

describe("tRPC response cache metadata", () => {
  test("marks development responses as private no-store", () => {
    expect(
      getTrpcResponseMeta({
        isProduction: false,
        paths: ["marketplace.getItems"],
        errors: [],
        type: "query",
        ctx: createContext(
          { type: "anonymous" },
          { "marketplace.getItems": 60 }
        ),
      })
    ).toEqual({ headers: privateNoStoreResponseHeaders });
  });

  test("marks authenticated responses as private no-store even when procedures opt into public cache", () => {
    expect(
      getTrpcResponseMeta({
        isProduction: true,
        paths: ["marketplace.getItems"],
        errors: [],
        type: "query",
        ctx: createContext(
          {
            type: "user",
            userId: "user-1",
            sessionCreatedAt: 0,
            isLoggedInToBuilder: async () => true,
          },
          { "marketplace.getItems": 60 }
        ),
      })
    ).toEqual({ headers: privateNoStoreResponseHeaders });
  });

  test("marks uncached anonymous queries as private no-store", () => {
    expect(
      getTrpcResponseMeta({
        isProduction: true,
        paths: ["build.loadData"],
        errors: [],
        type: "query",
        ctx: createContext({ type: "anonymous" }),
      })
    ).toEqual({ headers: privateNoStoreResponseHeaders });
  });

  test("marks empty batches as private no-store", () => {
    expect(
      getTrpcResponseMeta({
        isProduction: true,
        paths: [],
        errors: [],
        type: "query",
        ctx: createContext({ type: "anonymous" }),
      })
    ).toEqual({ headers: privateNoStoreResponseHeaders });
  });

  test("uses public cache for anonymous queries only when every batched path opts in", () => {
    expect(
      getTrpcResponseMeta({
        isProduction: true,
        paths: ["marketplace.getItems", "marketplace.getBuildData"],
        errors: [],
        type: "query",
        ctx: createContext(
          { type: "anonymous" },
          {
            "marketplace.getItems": 180,
            "marketplace.getBuildData": 90,
          }
        ),
      })
    ).toEqual({
      headers: {
        "Cache-Control": "public, max-age=90, s-maxage=90",
      },
    });
  });
});
