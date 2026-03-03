import type { Database } from "./__generated__/db-types";
import { PostgrestClient } from "@supabase/postgrest-js";
import * as http from "node:http";
import * as https from "node:https";

export type { Database } from "./__generated__/db-types";

export type Client = PostgrestClient<Database>;

// @remix-run/web-fetch (the global fetch in Remix's server runtime) sends POST
// request bodies as Transfer-Encoding: chunked streams. PostgREST's Warp HTTP
// server closes the connection when it receives a chunked body, causing
// ECONNRESET on INSERT operations. Using Node's native http module lets us set
// Content-Length explicitly and avoid this incompatibility.
//
// Note: @remix-run/web-fetch also treats "Connection" as a forbidden header
// (per the browser Fetch spec) and silently strips it, so the header-based
// workaround does not work.
const httpAgent = new http.Agent({ keepAlive: false });
const httpsAgent = new https.Agent({ keepAlive: false });

const nodeFetch: typeof globalThis.fetch = (input, init = {}) => {
  const urlStr =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : (input as Request).url;

  const url = new URL(urlStr);
  const isHttps = url.protocol === "https:";
  const bodyStr = init.body != null ? String(init.body) : undefined;

  const reqHeaders: Record<string, string> = {};
  if (init.headers) {
    new Headers(init.headers as HeadersInit).forEach((v, k) => {
      reqHeaders[k] = v;
    });
  }
  if (bodyStr !== undefined) {
    reqHeaders["content-length"] = String(Buffer.byteLength(bodyStr, "utf-8"));
  }

  return new Promise<Response>((resolve, reject) => {
    const req = (isHttps ? https : http).request(
      {
        hostname: url.hostname,
        port: url.port !== "" ? Number(url.port) : isHttps ? 443 : 80,
        path: url.pathname + url.search,
        method: (init.method ?? "GET").toUpperCase(),
        headers: reqHeaders,
        agent: isHttps ? httpsAgent : httpAgent,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const resHeaders = new Headers();
          for (const [k, v] of Object.entries(res.headers)) {
            if (v === undefined) {
              continue;
            }
            (Array.isArray(v) ? v : [v]).forEach((val) =>
              resHeaders.append(k, val)
            );
          }
          resolve(
            new Response(Buffer.concat(chunks).toString("utf-8"), {
              status: res.statusCode ?? 200,
              headers: resHeaders,
            })
          );
        });
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    if (bodyStr !== undefined) {
      req.write(bodyStr);
    }
    req.end();
  });
};

export const createClient = (url: string, apiKey: string): Client => {
  const client = new PostgrestClient<Database>(url, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
    fetch: nodeFetch,
  });

  return client;
};
