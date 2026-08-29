import { atom } from "nanostores";
import { z } from "zod";
import { sidebarPanelNames } from "~/builder/sidebar-left/types";
import {
  clientSettingsStorageKey,
  colorSchemePreferences,
  parseColorSchemeCookie,
} from "~/shared/color-scheme";

const userSettings = z.object({
  navigatorLayout: z.enum(["docked", "undocked"]).default("undocked"),
  stylePanelMode: z.enum(["default", "focus", "advanced"]).default("default"),
  sidebarPanelWidths: z
    .partialRecord(z.enum(sidebarPanelNames), z.number())
    .default({}),
  lastDashboardSearch: z.string().default(""),
  colorScheme: z.enum(colorSchemePreferences).default("system"),
});
const persistedUserSettings = userSettings.omit({ colorScheme: true });

export type Settings = z.infer<typeof userSettings>;

const defaultSettings = userSettings.parse({});

const read = (): Settings => {
  let settings = defaultSettings;
  let settingsString;
  try {
    settingsString = localStorage.getItem(clientSettingsStorageKey);
  } catch {
    // We don't need to handle this one.
  }

  if (settingsString != null) {
    try {
      settings = userSettings.parse(JSON.parse(settingsString));
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
  }

  const sharedColorScheme =
    typeof document === "undefined"
      ? undefined
      : parseColorSchemeCookie(document.cookie);
  return sharedColorScheme === undefined
    ? settings
    : { ...settings, colorScheme: sharedColorScheme };
};

const write = (settings: Settings) => {
  localStorage.setItem(
    clientSettingsStorageKey,
    JSON.stringify(persistedUserSettings.parse(settings))
  );
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

export const synchronizeColorScheme = () => {
  const colorScheme = parseColorSchemeCookie(document.cookie);
  if (colorScheme !== undefined) {
    setSetting("colorScheme", colorScheme);
  }
};
