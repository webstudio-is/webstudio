import type {
  Instances,
  Prop,
  Props,
  WsComponentMeta,
} from "@webstudio-is/sdk";

export const codeTextComponent = "CodeText";

type Selection = {
  language?: Prop;
  theme?: Prop;
};

const readOptions = (
  meta: WsComponentMeta | undefined,
  name: "language" | "theme"
) => {
  const propMeta = meta?.props?.[name];
  if (propMeta?.control !== "select") {
    throw new Error(`Code Text ${name} metadata must use a select control.`);
  }
  return new Set(propMeta.options);
};

const readSelection = ({
  instanceId,
  label,
  prop,
  supportedValues,
}: {
  instanceId: string;
  label: "Language" | "Theme";
  prop: Prop;
  supportedValues: ReadonlySet<string>;
}) => {
  if (prop.type === "expression") {
    return;
  }
  if (prop.type !== "string") {
    throw new Error(
      `Code Text "${instanceId}" ${label} must be a fixed selection or expression binding.`
    );
  }
  if (supportedValues.has(prop.value) === false) {
    throw new Error(
      `Code Text "${instanceId}" has an unsupported ${label.toLowerCase()} selection "${prop.value}".`
    );
  }
  return prop.value;
};

export const collectCodeTextAssets = ({
  instances,
  props,
  meta,
}: {
  instances: Instances;
  props: Props;
  meta: WsComponentMeta | undefined;
}) => {
  const selections = new Map<string, Selection>();
  for (const prop of props.values()) {
    if (prop.name !== "language" && prop.name !== "theme") {
      continue;
    }
    const instance = instances.get(prop.instanceId);
    if (instance?.component !== codeTextComponent) {
      continue;
    }
    const selection = selections.get(instance.id) ?? {};
    selection[prop.name] = prop;
    selections.set(instance.id, selection);
  }

  if (selections.size === 0) {
    return;
  }

  const supportedLanguages = readOptions(meta, "language");
  const supportedThemes = readOptions(meta, "theme");
  const staticLanguages = new Set<string>();
  const staticThemes = new Set<string>();
  let dynamicLanguages = false;
  let dynamicThemes = false;
  for (const [instanceId, selection] of selections) {
    if (selection.language === undefined || selection.theme === undefined) {
      throw new Error(
        `Code Text "${instanceId}" requires both Language and Theme selections.`
      );
    }
    const language = readSelection({
      instanceId,
      label: "Language",
      prop: selection.language,
      supportedValues: supportedLanguages,
    });
    const theme = readSelection({
      instanceId,
      label: "Theme",
      prop: selection.theme,
      supportedValues: supportedThemes,
    });
    if (language === undefined) {
      dynamicLanguages = true;
    } else if (language !== "plaintext") {
      staticLanguages.add(language);
    }
    if (theme === undefined) {
      dynamicThemes = true;
    } else {
      staticThemes.add(theme);
    }
  }

  const sortedStaticLanguages = [...staticLanguages].sort();
  const sortedStaticThemes = [...staticThemes].sort();
  return {
    staticLanguages: sortedStaticLanguages,
    staticThemes: sortedStaticThemes,
    dynamicLanguages,
    dynamicThemes,
  };
};
