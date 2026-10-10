import { $project } from "./sync/data-stores";
import { atom, onSet } from "nanostores";
import { z } from "zod";

const headers = z.array(z.object({ name: z.string(), value: z.string() }));
export const previewResourceExchange = z.object({
  resourceId: z.string(),
  resourceName: z.string(),
  kind: z.enum(["http", "email"]),
  request: z.object({
    method: z.string(),
    url: z.string(),
    headers,
    body: z.unknown(),
    truncated: z.boolean(),
  }),
  response: z.object({
    status: z.number(),
    statusText: z.string(),
    url: z.string().optional(),
    headers,
    body: z.unknown(),
    truncated: z.boolean(),
  }),
  outcome: z
    .object({
      ok: z.boolean(),
      status: z.number(),
      statusText: z.string(),
      body: z.unknown(),
      truncated: z.boolean(),
    })
    .optional(),
});
export type PreviewResourceExchange = z.infer<typeof previewResourceExchange>;

/** Latest explicit Resource editor reload, kept only in Builder memory. */
export const $resourcePreviewExchanges = atom(
  new Map<string, { exchange: PreviewResourceExchange; revision: number }>()
);
let exchangeRevision = 0;
export const nextPreviewExchangeRevision = () => ++exchangeRevision;

export const recordResourcePreviewExchange = (
  key: string,
  exchange: PreviewResourceExchange
) => {
  const next = new Map($resourcePreviewExchanges.get());
  next.set(key, { exchange, revision: nextPreviewExchangeRevision() });
  $resourcePreviewExchanges.set(next);
};

onSet($project, () => {
  $resourcePreviewExchanges.set(new Map());
});
