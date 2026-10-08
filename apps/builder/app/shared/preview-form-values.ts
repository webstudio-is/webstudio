import { atom, onSet } from "nanostores";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import { getFormDataValue } from "@webstudio-is/sdk-components-react";
import { $project } from "./sync/data-stores";

export const $livePreviewFormValues = atom(
  new Map<string, Record<string, unknown>>()
);
onSet($project, () => $livePreviewFormValues.set(new Map()));

export const getFormOccurrenceKey = (
  selector: readonly string[] | undefined,
  formId: string
) => {
  const formIndex = selector?.indexOf(formId) ?? -1;
  if (formIndex < 0 || selector === undefined) {
    return undefined;
  }
  const occurrence = selector.slice(formIndex);
  if (occurrence.at(-1) === ROOT_INSTANCE_ID) {
    occurrence.pop();
  }
  return occurrence.join(",");
};

declare module "~/shared/pubsub" {
  interface PubsubMap {
    previewFormValues: {
      selector: string;
      values: Record<string, unknown> | null;
    };
  }
}

/** Match actual Form submission values without submitting or transferring upload bytes. */
export const readPreviewFormValues = (form: HTMLFormElement) => {
  const metadata = (
    value: FormDataEntryValue | FormDataEntryValue[]
  ): unknown =>
    Array.isArray(value)
      ? value.map(metadata)
      : typeof value === "string"
        ? value
        : { name: value.name, type: value.type, size: value.size };
  return Object.fromEntries(
    Object.entries(getFormDataValue(form)).map(([name, value]) => [
      name,
      metadata(value),
    ])
  );
};
