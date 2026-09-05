import {
  blockTemplateComponent,
  codeTextDefaultLanguage,
  codeTextDefaultTheme,
  findWritableContentBlockDocumentBindings,
  type Instance,
  type Prop,
  type StyleDecl,
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
    prop.type === "string"
      ? { type: "text", value: prop.value }
      : {
          type: "expression",
          value: prop.value,
          ...(prop.mode === undefined ? {} : { mode: prop.mode }),
        },
  ];
  return true;
};

export const migrateContentBlockDocumentBindingsMutable = (
  data: Pick<WebstudioData, "instances" | "props">
) => {
  const bindings = findWritableContentBlockDocumentBindings({
    instances: data.instances,
    props: data.props,
    compatibility: "legacy",
  });
  for (const { binding } of bindings.children) {
    binding.mode = "readwrite";
  }
  for (const { binding } of bindings.props) {
    binding.mode = "readwrite";
  }
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

const isLegacyContentBlockImageStyle = (declarations: StyleDecl[]) => {
  if (
    declarations.length !== 4 ||
    declarations.some(
      ({ breakpointId, state, listed }) =>
        breakpointId !== declarations[0]?.breakpointId ||
        state !== undefined ||
        listed !== undefined
    )
  ) {
    return false;
  }
  const byProperty = new Map(
    declarations.map((declaration) => [declaration.property, declaration.value])
  );
  const isKeyword = (property: "marginRight" | "marginLeft" | "height") => {
    const value = byProperty.get(property);
    return value?.type === "keyword" && value.value === "auto";
  };
  const width = byProperty.get("width");
  return (
    byProperty.size === 4 &&
    isKeyword("marginRight") &&
    isKeyword("marginLeft") &&
    isKeyword("height") &&
    width?.type === "unit" &&
    width.unit === "%" &&
    width.value === 100
  );
};

const migrateContentBlockImageStylesMutable = (
  data: Pick<
    WebstudioData,
    "instances" | "styleSourceSelections" | "styleSources" | "styles"
  >
) => {
  const templateImageIds = new Set<string>();
  for (const instance of data.instances.values()) {
    if (instance.component !== blockTemplateComponent) {
      continue;
    }
    for (const child of instance.children) {
      const image =
        child.type === "id" ? data.instances.get(child.value) : undefined;
      if (image?.component === "Image") {
        templateImageIds.add(image.id);
      }
    }
  }
  const sourceReferenceCounts = new Map<string, number>();
  for (const selection of data.styleSourceSelections.values()) {
    for (const styleSourceId of selection.values) {
      sourceReferenceCounts.set(
        styleSourceId,
        (sourceReferenceCounts.get(styleSourceId) ?? 0) + 1
      );
    }
  }
  for (const imageId of templateImageIds) {
    const selection = data.styleSourceSelections.get(imageId);
    if (selection === undefined) {
      continue;
    }
    for (const styleSourceId of selection.values) {
      if (
        data.styleSources.get(styleSourceId)?.type !== "local" ||
        sourceReferenceCounts.get(styleSourceId) !== 1
      ) {
        continue;
      }
      const declarations = Array.from(data.styles.values()).filter(
        (declaration) => declaration.styleSourceId === styleSourceId
      );
      if (isLegacyContentBlockImageStyle(declarations) === false) {
        continue;
      }
      selection.values = selection.values.filter(
        (candidate) => candidate !== styleSourceId
      );
      if (selection.values.length === 0) {
        data.styleSourceSelections.delete(imageId);
      }
      data.styleSources.delete(styleSourceId);
      for (const [key, declaration] of data.styles) {
        if (declaration.styleSourceId === styleSourceId) {
          data.styles.delete(key);
        }
      }
    }
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
  migrateContentBlockImageStylesMutable(data);
  migrateContentBlockDocumentBindingsMutable(data);
};
