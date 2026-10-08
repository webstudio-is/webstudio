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
});
export type PreviewFormExchange = z.infer<typeof previewFormExchange>;
export const previewFormExchanges = z.array(previewFormExchange).max(100);

/** Latest Preview submission only; private Builder memory, never project data or Canvas pubsub. */
export const $previewFormExchanges = atom(
  new Map<string, { formId: string; attempts: PreviewFormExchange[] }>()
);
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
    next.set(exchange.resourceId, { formId, attempts });
  }
  $previewFormExchanges.set(next);
};

onSet($project, () => $previewFormExchanges.set(new Map()));
