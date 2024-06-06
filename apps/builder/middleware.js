/**
 * To test middleware locally:
 * ```shell
 * # At project root:
 * pnpx vercel link
 * pnpx vercel dev
 * ```
 *
 * OR
 *
 * ```shell
 * # Link vercel project
 * pnpm middleware:link
 * # Initialize .env.preview
 * pnpm middleware:env
 * # Start middleware server
 * pnpm middleware:dev
 * ```
 *
 * OR
 *
 * ```shell
 * pnpx vercel link
 * pnpx vercel env pull --environment=preview ./.env.preview
 * pnpm tsx watch --env-file=.env.preview ./middleware.js
 * ```
 */
import { Ratelimit } from "@upstash/ratelimit";
import { ipAddress, next as passthroughRaw } from "@vercel/edge";
import { createClient } from "@vercel/kv";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { env as envHono, getRuntimeKey } from "hono/adapter";
import { handle } from "hono/vercel";
import memoize from "memoize-one";
import { createCookieSessionStorage } from "@remix-run/cloudflare";

/**
 * ----------------------------------------------------------------
 * ---------------------======<<<Types>>>======--------------------
 * ----------------------------------------------------------------
 */

/**
 * @typedef {object} Environment
 * @property {string} KV_RATE_LIMIT_REST_API_TOKEN
 * @property {string} KV_RATE_LIMIT_REST_API_URL
 * @property {string} TRPC_SERVER_API_TOKEN
 * @property {string} AUTH_SECRET
 *
 * @typedef {object} Variables
 * @property {boolean} skipRateLimit
 *
 * @typedef {object} ContextEnv
 * @property {Variables} Variables
 */

/**
 * ------------------------------------------------------------------
 * ---------------------======<<<Utilities>>>======------------------
 * ------------------------------------------------------------------
 */

/**
 * @param {import('hono').Context<ContextEnv>} req
 * @returns {Promise<Response>}
 */
let passthrough = async (req) => passthroughRaw();

/** @type {typeof envHono<Environment, import('hono').Context<ContextEnv>>} */
const env = (ctx) => envHono(ctx);

const getRateLimitMemoized = memoize(
  /**
   * @param {string} kvApiToken
   * @param {string} kvUrl
   */
  (kvApiToken, kvUrl) => {
    const rateLimiterCache = new Map();

    const kv = createClient({
      token: kvApiToken,
      url: kvUrl,
    });

    const authorized = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(20, "5 s"),
      ephemeralCache: rateLimiterCache,
      prefix: "authorized",
    });

    const unAuthorized = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(10, "5 s"),
      ephemeralCache: rateLimiterCache,
      prefix: "unauthorized",
    });

    // No ephemeralCache for the AI endpoint
    const ai = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "ai",
      // Usually during AI request we need few requests available, small timeout here could break things
      timeout: 60000,
    });

    // For performance testing purposes
    const perfTest = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(12000, "600 s"),
      prefix: "test",
    });

    const perfTestEphemeral = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(12000, "600 s"),
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

/** @param {import('hono').Context<ContextEnv>} ctx */
const getRateLimits = (ctx) => {
  const { KV_RATE_LIMIT_REST_API_TOKEN, KV_RATE_LIMIT_REST_API_URL } = env(ctx);
  if (KV_RATE_LIMIT_REST_API_TOKEN === undefined) {
    throw new HTTPException(500, {
      message: "KV_RATE_LIMIT_REST_API_TOKEN env variable is undefined",
    });
  }

  if (KV_RATE_LIMIT_REST_API_URL === undefined) {
    throw new HTTPException(500, {
      message: "KV_RATE_LIMIT_REST_API_URL env variable is undefined",
    });
  }

  return getRateLimitMemoized(
    KV_RATE_LIMIT_REST_API_TOKEN,
    KV_RATE_LIMIT_REST_API_URL
  );
};

/**
 * @todo: must be shared with 'apps/builder/app/services/cookie.server.ts' after ESM switch
 */
const getSessionStorageMemozied = memoize(
  /**
   * @param {string} authSecret
   */
  (authSecret) =>
    createCookieSessionStorage({
      cookie: {
        maxAge: 60 * 60 * 24 * 30,
        name: "_session",
        sameSite: "lax",
        path: "/",
        httpOnly: true,
        secrets: authSecret ? [authSecret] : undefined,
        secure: process.env.NODE_ENV === "production",
      },
    })
);

/** @param {import('hono').Context<ContextEnv>} ctx */
const getSessionStorage = (ctx) => {
  const { AUTH_SECRET } = env(ctx);

  if (AUTH_SECRET === undefined) {
    throw new HTTPException(500, {
      message: "AUTH_SECRET env variable is undefined",
    });
  }

  return getSessionStorageMemozied(AUTH_SECRET);
};

/**
 * @param {import('hono').Context<ContextEnv>} ctx
 */
const getUserId = async (ctx) => {
  const sessionStorage = getSessionStorage(ctx);
  const { data } = await sessionStorage.getSession(ctx.req.header("Cookie"));
  return data.user?.id;
};

/**
 * @param {import('hono').Context<ContextEnv>} ctx
 * @param {keyof ReturnType<typeof getRateLimits>} ratelimitName
 * @param {string} key
 */
const checkRateLimit = async (ctx, ratelimitName, key) => {
  const rateLimits = getRateLimits(ctx);
  const ratelimit = rateLimits[ratelimitName];

  const { success, pending, limit, reset, remaining } =
    await ratelimit.limit(key);

  if (getRuntimeKey() !== "node") {
    try {
      ctx.executionCtx.waitUntil(pending);
    } catch {
      /**/
    }
  }

  if (success === false) {
    // eslint-disable-next-line no-console
    console.warn(
      `ratelimit triggered: [${ratelimitName}] limit=${limit}, reset=${reset}, remaining=${remaining} key=${key}`
    );

    throw new HTTPException(429, {
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

/**
 * ------------------------------------------------------------
 * ---------------------======<<<App>>>======------------------
 * ------------------------------------------------------------
 */

/** @type {Hono<ContextEnv>} */
const app = new Hono();

// Debug route, to show current values, MUST BE ABOVE middlewares
app.get("/rate-limit/debug", async (ctx) => {
  const rateLimits = getRateLimits(ctx);

  const aiKey = `${
    (await getUserId(ctx)) ?? ipAddress(ctx.req) ?? "127.0.0.1"
  }`;

  const userId = await getUserId(ctx);

  const ip = ipAddress(ctx.req) ?? "127.0.0.1";

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

// Debug route, to test the rate-limiting performance, MUST BE ABOVE middlewares
app.get("/rate-limit/test", async (ctx) => {
  const rateLimits = getRateLimits(ctx);

  const aiKey = `${
    (await getUserId(ctx)) ?? ipAddress(ctx.req) ?? "127.0.0.1"
  }`;

  return ctx.json({
    perfTest: await rateLimits.perfTest.limit(aiKey),
  });
});

// Debug route, to test the rate-limiting performance with ephemeral cache, MUST BE ABOVE middlewares
app.get("/rate-limit/ephemeral-test", async (ctx) => {
  const rateLimits = getRateLimits(ctx);

  const aiKey = `${
    (await getUserId(ctx)) ?? ipAddress(ctx.req) ?? "127.0.0.1"
  }`;

  return ctx.json({
    perfTest: await rateLimits.perfTestEphemeral.limit(aiKey),
  });
});

/**
 * Check whether the request is for a static file; if so, bypass the rate-limiting mechanism.
 */
app.use("*", async (ctx, next) => {
  const skipRateLimit = ctx.get("skipRateLimit");
  if (skipRateLimit) {
    return next();
  }

  const url = new URL(ctx.req.url);

  ctx.set(
    "skipRateLimit",
    url.pathname.startsWith("/asset/") ||
      url.pathname.startsWith("/assets/") ||
      url.pathname.endsWith(".ico")
  );
  return next();
});

/**
 * Check whether the request is a service call; if so, bypass the rate-limiting mechanism.
 */
app.use("*", async (ctx, next) => {
  const skipRateLimit = ctx.get("skipRateLimit");
  if (skipRateLimit) {
    return next();
  }

  const { TRPC_SERVER_API_TOKEN } = env(ctx);

  if (TRPC_SERVER_API_TOKEN === undefined) {
    throw new HTTPException(500, {
      message: "TRPC_SERVER_API_TOKEN env variable is undefined",
    });
  }

  const isServiceCall =
    TRPC_SERVER_API_TOKEN !== undefined &&
    ctx.req.header("Authorization") === TRPC_SERVER_API_TOKEN;

  ctx.set("skipRateLimit", isServiceCall);

  return next();
});

/**
 * Rate limiting AI endpoint, max priority
 */
app.use("/rest/ai/*", async (ctx, next) => {
  const skipRateLimit = ctx.get("skipRateLimit");
  if (skipRateLimit) {
    return next();
  }

  const aiKey = `${
    (await getUserId(ctx)) ?? ipAddress(ctx.req) ?? "127.0.0.1"
  }`;

  await checkRateLimit(ctx, "ai", aiKey);
  ctx.set("skipRateLimit", true);

  return next();
});

/**
 * Rate limiting authorized/unauthorized users
 */
app.use("*", async (ctx, next) => {
  const skipRateLimit = ctx.get("skipRateLimit");
  if (skipRateLimit) {
    return next();
  }

  const userId = await getUserId(ctx);

  if (userId === undefined) {
    await checkRateLimit(
      ctx,
      "unAuthorized",
      ipAddress(ctx.req) ?? "127.0.0.1"
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
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  console.error(err.stack ?? err);

  return ctx.json({ cause: err.cause, message: err.message });
});

export default handle(app);

/**
 * --------------------------------------------------------------------
 * ---------------------======<<<Development>>>======------------------
 * --------------------------------------------------------------------
 */

if (process.env.NODE_ENV !== "production") {
  if (getRuntimeKey() === "node") {
    // To avoid vercel dev errors on build
    const modulePath = "" + "@hono/node-server";
    /** @type {Promise<import("@hono/node-server")>} */
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
        throw new HTTPException(500, {
          message:
            error instanceof Error
              ? `Middlewared dev fetch error ${error.message}`
              : "Middlewared dev fetch error",
        });
      }
    };
  }
}
