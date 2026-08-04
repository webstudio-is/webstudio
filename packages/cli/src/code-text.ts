import type { Instances, Prop, Props } from "@webstudio-is/sdk";
import { languageNames } from "@shikijs/langs";
import { themeNames } from "@shikijs/themes";

export const codeTextComponent = "CodeText";

type Selection = {
  lang?: Prop;
  theme?: Prop;
};

const codeTextLanguageSet = new Set<string>(["plaintext", ...languageNames]);
const codeTextThemeSet = new Set<string>(themeNames);

const readSelection = ({
  instanceId,
  label,
  prop,
  validate,
}: {
  instanceId: string;
  label: "Language" | "Theme";
  prop: Prop | undefined;
  validate: (value: string) => boolean;
}) => {
  if (prop === undefined) {
    return;
  }
  if (prop.type !== "string") {
    throw new Error(
      `Code Text "${instanceId}" ${label} must be a fixed selection.`
    );
  }
  if (validate(prop.value) === false) {
    throw new Error(
      `Code Text "${instanceId}" has an unsupported ${label.toLowerCase()} selection "${prop.value}".`
    );
  }
  return prop.value;
};

export const collectCodeTextAssets = ({
  instances,
  props,
}: {
  instances: Instances;
  props: Props;
}) => {
  const selections = new Map<string, Selection>();
  for (const prop of props.values()) {
    if (prop.name !== "lang" && prop.name !== "theme") {
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

  const languages = new Set<string>();
  const themes = new Set<string>();
  for (const [instanceId, selection] of selections) {
    // Theme did not exist before syntax highlighting. Treat instances without
    // it as legacy data, including instances that already have an HTML lang.
    if (selection.theme === undefined) {
      continue;
    }
    const lang = readSelection({
      instanceId,
      label: "Language",
      prop: selection.lang,
      validate: (value) => codeTextLanguageSet.has(value),
    });
    const theme = readSelection({
      instanceId,
      label: "Theme",
      prop: selection.theme,
      validate: (value) => codeTextThemeSet.has(value),
    });
    if (lang === undefined || theme === undefined) {
      throw new Error(
        `Code Text "${instanceId}" must include fixed Language and Theme selections.`
      );
    }
    if (lang !== "plaintext") {
      languages.add(lang);
    }
    themes.add(theme);
  }

  if (themes.size === 0) {
    return;
  }
  return {
    languages: [...languages].sort(),
    themes: [...themes].sort(),
  };
};
