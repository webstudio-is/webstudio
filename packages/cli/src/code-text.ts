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
  if (prop.type !== "string") {
    throw new Error(
      `Code Text "${instanceId}" ${label} must be a fixed selection.`
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
  const languages = new Set<string>();
  const themes = new Set<string>();
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
    if (language !== "plaintext") {
      languages.add(language);
    }
    themes.add(theme);
  }

  return {
    languages: [...languages].sort(),
    themes: [...themes].sort(),
  };
};
