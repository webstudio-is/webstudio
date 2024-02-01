import { useEffect } from "react";
import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import { sentryMessage } from "~/shared/sentry";

import { z } from "zod";

const Settings = z.object({
  navigatorLayout: z.enum(["docked", "undocked"]).default("undocked"),
  isAiMenuOpen: z.boolean().default(true),
  isAiCommandBarVisible: z.boolean().default(false),
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
      sentryMessage({
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

/**
 * Get a value from local storage or a default.
 */
export const getSetting = <Name extends keyof Settings>(name: Name) => {
  const settings = read();
  const value = settings[name];
  return value;
};

export const setSetting = <Name extends keyof Settings>(
  name: Name,
  value: Settings[Name]
) => {
  const settings = read();

  write({ ...settings, [name]: value });
};

const $settings = atom<Settings>(defaultSettings);

export const useClientSettings = (): [Settings, typeof setSetting, boolean] => {
  const settings = useStore($settings);

  useEffect(() => {
    $settings.set(read());
  }, []);

  const setSettingValue = <Name extends keyof Settings>(
    name: Name,
    value: Settings[Name]
  ) => {
    if (settings[name] === value) {
      return;
    }
    $settings.set({ ...settings, [name]: value });
    setSetting(name, value);
  };

  const isLoaded = settings !== defaultSettings;

  return [settings, setSettingValue, isLoaded];
};
