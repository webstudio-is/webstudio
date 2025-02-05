import { atom } from "nanostores";
import { z } from "zod";

const Settings = z.object({
  navigatorLayout: z.enum(["docked", "undocked"]).default("undocked"),
  isAiMenuOpen: z.boolean().default(true),
  isAiCommandBarVisible: z.boolean().default(false),
  stylePanelMode: z.enum(["default", "focus", "advanced"]).default("default"),
});

export type Settings = z.infer<typeof Settings>;

const defaultSettings = Settings.parse({});

const namespace = "__webstudio_user_settings__";

const read = (): Settings => {
  let settingsString;
  try {
    settingsString = localStorage.getItem(namespace);
  } catch {
    // We don't need to handle this one.
  }

  if (settingsString == null) {
    return defaultSettings;
  }

  try {
    return Settings.parse(JSON.parse(settingsString));
  } catch (error) {
    if (error instanceof Error) {
      console.error({
        message: "Bad user settings in local storage",
        extras: {
          error: error.message,
        },
      });
    }
  }
  return defaultSettings;
};

const write = (settings: Settings) => {
  localStorage.setItem(namespace, JSON.stringify(settings));
};

export const $settings = atom<Settings>(defaultSettings);

export const setSetting = <Name extends keyof Settings>(
  name: Name,
  value: Settings[Name]
) => {
  const settings = $settings.get();
  if (settings[name] === value) {
    return;
  }
  const nextSettings = { ...settings, [name]: value };
  $settings.set(nextSettings);
  write(nextSettings);
};

export const getSetting = <Name extends keyof Settings>(name: Name) => {
  let settings = $settings.get();
  if (settings === defaultSettings) {
    settings = read();
    $settings.set(settings);
  }
  return settings[name];
};
