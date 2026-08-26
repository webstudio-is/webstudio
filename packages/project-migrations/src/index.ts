import {
  codeTextDefaultLanguage,
  codeTextDefaultTheme,
  type Instance,
  type Prop,
  type WebstudioData,
} from "@webstudio-is/sdk";
import { migratePages } from "./pages";
import { migrateResourcesMutable } from "./resources";
import { migrateStylesMutable } from "./styles";

export { migratePages, serializePages, type SerializedPages } from "./pages";

export const migrateCodeTextPropMutable = ({
  instance,
  prop,
}: {
  instance: Instance | undefined;
  prop: Prop;
}) => {
  if (instance?.component !== "CodeText") {
    return false;
  }
  if (
    prop.type === "string" &&
    ((prop.name === "language" && prop.value === codeTextDefaultLanguage) ||
      (prop.name === "theme" && prop.value === codeTextDefaultTheme))
  ) {
    return true;
  }
  if (
    prop.name !== "code" ||
    (prop.type !== "string" && prop.type !== "expression")
  ) {
    return false;
  }
  instance.children = [
    {
      type: prop.type === "string" ? "text" : "expression",
      value: prop.value,
    },
  ];
  return true;
};

export const migrateCodeTextContentMutable = (
  data: Pick<WebstudioData, "instances" | "props">
) => {
  for (const [propId, prop] of data.props) {
    const instance = data.instances.get(prop.instanceId);
    if (migrateCodeTextPropMutable({ instance, prop }) === false) {
      continue;
    }
    data.props.delete(propId);
  }
};

/**
 * Normalizes persisted project data after loading.
 *
 * This is intentionally idempotent because data can pass through multiple
 * load boundaries before all callers stop seeing older persisted shapes.
 */
export const migrateWebstudioDataMutable = (data: WebstudioData) => {
  data.pages = migratePages(data.pages);
  migrateResourcesMutable(data.resources.values());
  migrateStylesMutable(data.styles);
  migrateCodeTextContentMutable(data);
};
