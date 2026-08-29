import type { MdxAuthoredProp } from "@webstudio-is/content-engine/mdx";
import type { Prop } from "@webstudio-is/sdk";

export type MdxStaticPropType = "string" | "number" | "boolean";

type MdxStaticPropBinding =
  | { type: "string"; value: string }
  | { type: "number"; value: number }
  | { type: "boolean"; value: boolean };

export const serializeMdxStaticProp = (
  prop: Prop
): MdxAuthoredProp | undefined => {
  if (prop.type === "string") {
    return { name: prop.name, value: prop.value };
  }
  if (prop.type === "number" && Number.isFinite(prop.value)) {
    return { name: prop.name, value: String(prop.value) };
  }
  if (prop.type === "boolean") {
    return { name: prop.name, value: prop.value ? true : "false" };
  }
};

export const parseMdxStaticProp = ({
  prop,
  type,
}: {
  prop: MdxAuthoredProp;
  type: MdxStaticPropType;
}): MdxStaticPropBinding | undefined => {
  if (type === "string" && typeof prop.value === "string") {
    return { type, value: prop.value };
  }
  if (type === "number" && typeof prop.value === "string") {
    if (prop.value.trim() === "") {
      return;
    }
    try {
      const value: unknown = JSON.parse(prop.value);
      if (typeof value === "number" && Number.isFinite(value)) {
        return { type, value };
      }
    } catch {
      return;
    }
    return;
  }
  if (type === "boolean") {
    if (prop.value === true || prop.value === "true") {
      return { type, value: true };
    }
    if (prop.value === "false") {
      return { type, value: false };
    }
  }
};
