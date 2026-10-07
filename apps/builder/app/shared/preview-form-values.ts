import { atom, onSet } from "nanostores";
import { getFormDataValue } from "@webstudio-is/sdk-components-react";
import { $project } from "./sync/data-stores";

export const $livePreviewFormValues = atom(
  new Map<string, Record<string, unknown>>()
);
onSet($project, () => $livePreviewFormValues.set(new Map()));

declare module "~/shared/pubsub" {
  interface PubsubMap {
    previewFormValues: {
      formId: string;
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
