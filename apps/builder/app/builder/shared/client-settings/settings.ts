import { atom } from "nanostores";
import { z } from "zod";
import { sidebarPanelNames } from "~/builder/sidebar-left/types";

const Settings = z.object({
  navigatorLayout: z.enum(["docked", "undocked"]).default("undocked"),
  stylePanelMode: z.enum(["default", "focus", "advanced"]).default("default"),
  sidebarPanelWidths: z
    .record(z.enum(sidebarPanelNames), z.number())
    .default({}),
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

const initialSettings = read();

export const $settings = atom<Settings>(initialSettings);

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
  return $settings.get()[name];
};
