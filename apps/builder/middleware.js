"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === "object") || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (
  (target = mod != null ? __create(__getProtoOf(mod)) : {}),
  __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule
      ? __defProp(target, "default", { value: mod, enumerable: true })
      : target,
    mod
  )
);
var __toCommonJS = (mod) =>
  __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var middleware_esm_exports = {};
__export(middleware_esm_exports, {
  default: () => middleware_esm_default,
});
module.exports = __toCommonJS(middleware_esm_exports);
var import_ratelimit = require("@upstash/ratelimit");
var import_edge = require("@vercel/edge");
var import_kv = require("@vercel/kv");
var import_hono = require("hono");
var import_http_exception = require("hono/http-exception");
var import_adapter = require("hono/adapter");
var import_vercel = require("hono/vercel");
var import_memoize_one = __toESM(require("memoize-one"));
var import_cloudflare = require("@remix-run/cloudflare");
let passthrough = async (req) => (0, import_edge.next)();
const env = (ctx) => (0, import_adapter.env)(ctx);
const getRateLimitMemoized = (0, import_memoize_one.default)(
  /**
   * @param {string} kvApiToken
   * @param {string} kvUrl
   */
  (kvApiToken, kvUrl) => {
    const rateLimiterCache = /* @__PURE__ */ new Map();
    const kv = (0, import_kv.createClient)({
      token: kvApiToken,
      url: kvUrl,
    });
    const authorized = new import_ratelimit.Ratelimit({
      redis: kv,
      limiter: import_ratelimit.Ratelimit.slidingWindow(20, "5 s"),
      ephemeralCache: rateLimiterCache,
      prefix: "authorized",
    });
    const unAuthorized = new import_ratelimit.Ratelimit({
      redis: kv,
      limiter: import_ratelimit.Ratelimit.slidingWindow(10, "5 s"),
      ephemeralCache: rateLimiterCache,
      prefix: "unauthorized",
    });
    const ai = new import_ratelimit.Ratelimit({
      redis: kv,
      limiter: import_ratelimit.Ratelimit.slidingWindow(20, "1 m"),
      prefix: "ai",
      // Usually during AI request we need few requests available, small timeout here could break things
      timeout: 6e4,
    });
    const perfTest = new import_ratelimit.Ratelimit({
      redis: kv,
      limiter: import_ratelimit.Ratelimit.slidingWindow(12e3, "600 s"),
      prefix: "test",
    });
    const perfTestEphemeral = new import_ratelimit.Ratelimit({
      redis: kv,
      limiter: import_ratelimit.Ratelimit.slidingWindow(12e3, "600 s"),
      ephemeralCache: rateLimiterCache,
      prefix: "ephemeral",
    });
    return {
      authorized,
      unAuthorized,
      ai,
      perfTest,
      perfTestEphemeral,
    };
  }
);
const getRateLimits = (ctx) => {
  const { KV_RATE_LIMIT_REST_API_TOKEN, KV_RATE_LIMIT_REST_API_URL } = env(ctx);
  if (KV_RATE_LIMIT_REST_API_TOKEN === void 0) {
    throw new import_http_exception.HTTPException(500, {
      message: "KV_RATE_LIMIT_REST_API_TOKEN env variable is undefined",
    });
  }
  if (KV_RATE_LIMIT_REST_API_URL === void 0) {
    throw new import_http_exception.HTTPException(500, {
      message: "KV_RATE_LIMIT_REST_API_URL env variable is undefined",
    });
  }
  return getRateLimitMemoized(
    KV_RATE_LIMIT_REST_API_TOKEN,
    KV_RATE_LIMIT_REST_API_URL
  );
};
const getSessionStorageMemozied = (0, import_memoize_one.default)(
  /**
   * @param {string} authSecret
   */
  (authSecret) =>
    (0, import_cloudflare.createCookieSessionStorage)({
      cookie: {
        maxAge: 60 * 60 * 24 * 30,
        name: "_session",
        sameSite: "lax",
        path: "/",
        httpOnly: true,
        secrets: authSecret ? [authSecret] : void 0,
        secure: false,
      },
    })
);
const getSessionStorage = (ctx) => {
  const { AUTH_SECRET } = env(ctx);
  if (AUTH_SECRET === void 0) {
    throw new import_http_exception.HTTPException(500, {
      message: "AUTH_SECRET env variable is undefined",
    });
  }
  return getSessionStorageMemozied(AUTH_SECRET);
};
const getUserId = async (ctx) => {
  const sessionStorage = getSessionStorage(ctx);
  const { data } = await sessionStorage.getSession(ctx.req.header("Cookie"));
  return data.user?.id;
};
const checkRateLimit = async (ctx, ratelimitName, key) => {
  const rateLimits = getRateLimits(ctx);
  const ratelimit = rateLimits[ratelimitName];
  const { success, pending, limit, reset, remaining } =
    await ratelimit.limit(key);
  if ((0, import_adapter.getRuntimeKey)() !== "node") {
    try {
      ctx.executionCtx.waitUntil(pending);
    } catch {}
  }
  if (success === false) {
    console.warn(
      `ratelimit triggered: [${ratelimitName}] limit=${limit}, reset=${reset}, remaining=${remaining} key=${key}`
    );
    throw new import_http_exception.HTTPException(429, {
      res: ctx.json(
        {
          error: {
            message: `ratelimit triggered: [${ratelimitName}] limit=${limit}, reset=${reset}, remaining=${remaining}, key=${key}`,
            code: 429,
            meta: {
              limit,
              reset,
              remaining,
              ratelimitName,
            },
          },
        },
        429
      ),
    });
  }
};
const app = new import_hono.Hono();
app.get("/rate-limit/debug", async (ctx) => {
  const rateLimits = getRateLimits(ctx);
  const aiKey = `${
    (await getUserId(ctx)) ?? (0, import_edge.ipAddress)(ctx.req) ?? "127.0.0.1"
  }`;
  const userId = await getUserId(ctx);
  const ip = (0, import_edge.ipAddress)(ctx.req) ?? "127.0.0.1";
  return ctx.json({
    keys: {
      aiKey,
      userId,
      ip,
    },
    unAuthorized: await rateLimits.unAuthorized.limit(ip),
    authorized: await rateLimits.authorized.limit(userId),
    ai: await rateLimits.ai.limit(aiKey),
  });
});
app.get("/rate-limit/test", async (ctx) => {
  const rateLimits = getRateLimits(ctx);
  const aiKey = `${
    (await getUserId(ctx)) ?? (0, import_edge.ipAddress)(ctx.req) ?? "127.0.0.1"
  }`;
  return ctx.json({
    perfTest: await rateLimits.perfTest.limit(aiKey),
  });
});
app.get("/rate-limit/ephemeral-test", async (ctx) => {
  const rateLimits = getRateLimits(ctx);
  const aiKey = `${
    (await getUserId(ctx)) ?? (0, import_edge.ipAddress)(ctx.req) ?? "127.0.0.1"
  }`;
  return ctx.json({
    perfTest: await rateLimits.perfTestEphemeral.limit(aiKey),
  });
});
app.use("*", async (ctx, next) => {
  const skipRateLimit = ctx.get("skipRateLimit");
  if (skipRateLimit) {
    return next();
  }
  const url = new URL(ctx.req.url);
  ctx.set(
    "skipRateLimit",
    url.pathname.startsWith("/asset/") ||
      url.pathname.startsWith("/build/") ||
      url.pathname.endsWith(".ico")
  );
  return next();
});
app.use("*", async (ctx, next) => {
  const skipRateLimit = ctx.get("skipRateLimit");
  if (skipRateLimit) {
    return next();
  }
  const { TRPC_SERVER_API_TOKEN } = env(ctx);
  if (TRPC_SERVER_API_TOKEN === void 0) {
    throw new import_http_exception.HTTPException(500, {
      message: "TRPC_SERVER_API_TOKEN env variable is undefined",
    });
  }
  const isServiceCall =
    TRPC_SERVER_API_TOKEN !== void 0 &&
    ctx.req.header("Authorization") === TRPC_SERVER_API_TOKEN;
  ctx.set("skipRateLimit", isServiceCall);
  return next();
});
app.use("/rest/ai/*", async (ctx, next) => {
  const skipRateLimit = ctx.get("skipRateLimit");
  if (skipRateLimit) {
    return next();
  }
  const aiKey = `${
    (await getUserId(ctx)) ?? (0, import_edge.ipAddress)(ctx.req) ?? "127.0.0.1"
  }`;
  await checkRateLimit(ctx, "ai", aiKey);
  ctx.set("skipRateLimit", true);
  return next();
});
app.use("*", async (ctx, next) => {
  const skipRateLimit = ctx.get("skipRateLimit");
  if (skipRateLimit) {
    return next();
  }
  const userId = await getUserId(ctx);
  if (userId === void 0) {
    await checkRateLimit(
      ctx,
      "unAuthorized",
      (0, import_edge.ipAddress)(ctx.req) ?? "127.0.0.1"
    );
    ctx.set("skipRateLimit", true);
    return next();
  }
  await checkRateLimit(ctx, "authorized", userId);
  ctx.set("skipRateLimit", true);
  return next();
});
app.notFound(async (ctx) => {
  return passthrough(ctx);
});
app.onError(async (err, ctx) => {
  if (err instanceof import_http_exception.HTTPException) {
    return err.getResponse();
  }
  console.error(err.stack ?? err);
  return ctx.json({ cause: err.cause, message: err.message });
});
var middleware_esm_default = (0, import_vercel.handle)(app);
if (true) {
  if ((0, import_adapter.getRuntimeKey)() === "node") {
    const modulePath = "@hono/node-server";
    const importedModule = import(modulePath);
    importedModule.then(({ serve }) => {
      serve({ ...app, port: 3002 }, (info) => {
        console.info(`Listening on http://localhost:${info.port}`);
      });
    });
    passthrough = async (ctx) => {
      try {
        const devUrl = new URL(ctx.req.url);
        devUrl.port = "3000";
        const raw = ctx.req.raw;
        const req = new Request(devUrl, {
          headers: raw.headers,
          method: raw.method,
          body: raw.body,
          redirect: "manual",
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          duplex: "half",
        });
        const res = await fetch(req);
        const responseHeaders = new Headers(res.headers);
        responseHeaders.delete("content-encoding");
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers: responseHeaders,
        });
      } catch (error) {
        throw new import_http_exception.HTTPException(500, {
          message:
            error instanceof Error
              ? `Middlewared dev fetch error ${error.message}`
              : "Middlewared dev fetch error",
        });
      }
    };
  }
}
