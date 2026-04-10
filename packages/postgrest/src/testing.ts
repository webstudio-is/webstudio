import { beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import {
  http,
  HttpResponse,
  type HttpResponseResolver,
  type PathParams,
  type DefaultBodyType,
} from "msw";
import { createClient } from "./index.server";

/** Shorthand for `HttpResponse.json(body, init)` */
export const json: typeof HttpResponse.json = (body, init) =>
  HttpResponse.json(body, init);

/** Shorthand for `new HttpResponse(null, init)` — use for HEAD/empty responses */
export const empty = (init?: ConstructorParameters<typeof HttpResponse>[1]) =>
  new HttpResponse(null, init);

const POSTGREST_URL = "http://test-postgrest";

/**
 * Spreadable partial context with `postgrest` pre-filled.
 * @example
 * const createContext = (): AppContext =>
 *   ({ ...testContext, authorization: { type: "user", userId: "user-1" } }) as unknown as AppContext;
 */
export const testContext = {
  postgrest: { client: createClient(POSTGREST_URL, "test-key") },
};

type Resolver = HttpResponseResolver<PathParams, DefaultBodyType, undefined>;

/**
 * Shorthand handlers for PostgREST table endpoints.
 * Eliminates the need to reference POSTGREST_URL in test files.
 *
 * @example
 * server.use(
 *   db.get("Project", () => HttpResponse.json(row)),
 *   db.head("Project", () => new HttpResponse(null, { headers: { "Content-Range": "* /3" } })),
 *   db.post("Project", () => HttpResponse.json(row, { status: 201 })),
 * );
 */
export const db = {
  get: (table: string, resolver: Resolver) =>
    http.get(`${POSTGREST_URL}/${table}`, resolver),
  head: (table: string, resolver: Resolver) =>
    http.head(`${POSTGREST_URL}/${table}`, resolver),
  post: (table: string, resolver: Resolver) =>
    http.post(`${POSTGREST_URL}/${table}`, resolver),
  patch: (table: string, resolver: Resolver) =>
    http.patch(`${POSTGREST_URL}/${table}`, resolver),
  delete: (table: string, resolver: Resolver) =>
    http.delete(`${POSTGREST_URL}/${table}`, resolver),
};

/**
 * Creates an MSW server and registers the standard vitest lifecycle hooks.
 * Call this at the top level of a test file (outside any describe block).
 *
 * @example
 * const server = createTestServer();
 * server.use(db.get("Project", () => HttpResponse.json(row)));
 */
export const createTestServer = () => {
  const server = setupServer();
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  return server;
};
