import { $project } from "./sync/data-stores";
import { atom, onSet } from "nanostores";
import { z } from "zod";
import {
  previewResourceExchange,
  nextPreviewExchangeRevision,
  type PreviewResourceExchange,
} from "./preview-resource-inspection";

export const previewFormExchanges = z.array(previewResourceExchange).max(100);
export type PreviewFormExchange = PreviewResourceExchange;
export const $previewFormExchanges = atom(
  new Map<
    string,
    { formId: string; attempts: PreviewFormExchange[]; revision: number }
  >()
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
    next.set(exchange.resourceId, {
      formId,
      attempts,
      revision: nextPreviewExchangeRevision(),
    });
  }
  $previewFormExchanges.set(next);
};

onSet($project, () => {
  $previewFormExchanges.set(new Map());
});

/** Compare the latest Form attempt with an explicit Resource reload. */
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
