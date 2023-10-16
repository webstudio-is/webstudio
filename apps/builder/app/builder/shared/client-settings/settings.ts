import { useEffect, useState } from "react";
import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import { sentryMessage } from "~/shared/sentry";

import { z } from "zod";

export const zSettings = z.object({
  navigatorLayout: z.enum(["docked", "undocked"]).default("undocked"),
  isAiMenuOpen: z.boolean().default(true),
});

export type Settings = z.infer<typeof zSettings>;

const defaultSettings = zSettings.parse({});

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
    return zSettings.parse(JSON.parse(settingsString));
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

const settingsContainer = atom<Settings>(defaultSettings);

export const useClientSettings = (): [Settings, typeof setSetting, boolean] => {
  const settings = useStore(settingsContainer);
  // We need to know if the settings were loaded from local storage.
  // E.g. to decide if we should wait till the actual setting is loaded or use the default.
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    settingsContainer.set(read());
    setIsLoaded(true);
  }, []);

  const setSettingValue = <Name extends keyof Settings>(
    name: Name,
    value: Settings[Name]
  ) => {
    if (settings[name] === value) {
      return;
    }
    settingsContainer.set({ ...settings, [name]: value });
    setSetting(name, value);
  };
  return [settings, setSettingValue, isLoaded];
};
