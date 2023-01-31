import { z } from "zod";
import { Instance, Props, Styles } from "@webstudio-is/project-build";

const TYPE = "@webstudio/instance/v0.1" as const;

const InstanceCopyData = z.object({
  instance: Instance,
  props: Props,
  styles: Styles,
});

export type InstanceCopyData = z.infer<typeof InstanceCopyData>;

const SerialisedData = z.object({ [TYPE]: InstanceCopyData });

export const serialize = (data: InstanceCopyData) => {
  return JSON.stringify({ [TYPE]: data });
};

export const deserialize = (text: string) => {
  try {
    return SerialisedData.parse(JSON.parse(text))[TYPE];
  } catch (e) {
    return;
  }
};
