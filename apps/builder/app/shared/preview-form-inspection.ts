import { $project } from "./sync/data-stores";
import { atom, onSet } from "nanostores";
import { z } from "zod";

const headers = z.array(z.object({ name: z.string(), value: z.string() }));
export const previewFormExchange = z.object({
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
export type PreviewFormExchange = z.infer<typeof previewFormExchange>;
export const previewFormExchanges = z.array(previewFormExchange).max(100);

/** Latest Preview submission only; private Builder memory, never project data or Canvas pubsub. */
export const $previewFormExchanges = atom(
  new Map<
    string,
    { formId: string; attempts: PreviewFormExchange[]; revision: number }
  >()
);
/** Latest explicit Resource editor reload, kept only in Builder memory. */
export const $resourcePreviewExchanges = atom(
  new Map<string, { exchange: PreviewFormExchange; revision: number }>()
);
let exchangeRevision = 0;

export const recordResourcePreviewExchange = (
  key: string,
  exchange: PreviewFormExchange
) => {
  const next = new Map($resourcePreviewExchanges.get());
  next.set(key, { exchange, revision: ++exchangeRevision });
  $resourcePreviewExchanges.set(next);
};

export const getLatestPreviewExchange = ({
  formInspection,
  resourceInspection,
}: {
  formInspection?: { attempts: PreviewFormExchange[]; revision: number };
  resourceInspection?: { exchange: PreviewFormExchange; revision: number };
}) =>
  resourceInspection !== undefined &&
  (formInspection === undefined ||
    resourceInspection.revision > formInspection.revision)
    ? resourceInspection.exchange
    : formInspection?.attempts.at(-1);
export const recordPreviewFormExchanges = (
  formId: string,
  exchanges: PreviewFormExchange[]
) => {
  const next = new Map($previewFormExchanges.get());
  for (const [id, value] of next) {
    if (value.formId === formId) {
      next.delete(id);
    }
  }
  for (const exchange of exchanges) {
    const previous = next.get(exchange.resourceId);
    const attempts =
      previous?.formId === formId
        ? [...previous.attempts, exchange]
        : [exchange];
    next.set(exchange.resourceId, {
      formId,
      attempts,
      revision: ++exchangeRevision,
    });
  }
  $previewFormExchanges.set(next);
};

onSet($project, () => {
  $previewFormExchanges.set(new Map());
  $resourcePreviewExchanges.set(new Map());
});
