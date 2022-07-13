import { useSubscribe } from "@webstudio-is/sdk";
import { sentryException } from "~/shared/sentry";
import * as values from "./values";

type Name = keyof typeof values;
type Value = typeof values[Name]["values"][number];
type Settings = Partial<Record<Name, Value>>;

const namespace = "__webstudio_user_settings__";

const read = (): Settings => {
  let settingsString;
  try {
    settingsString = localStorage.getItem(namespace);
  } catch (_error) {
    // We don't need to handle this one.
  }

  if (settingsString == null) return {};

  try {
    return JSON.parse(settingsString);
  } catch (error) {
    if (error instanceof Error) {
      sentryException({
        message: "Bad user settings in local storage",
        extra: {
          error: error.message,
        },
      });
    }
  }
  return {};
};

const write = (settings: Settings) => {
  localStorage.setItem(namespace, JSON.stringify(settings));
};

/**
 * Get a value from local storage or a default.
 */
export const getSetting = (name: Name) => {
  const settings = read();
  const validValues = values[name].values;
  const value = settings[name];
  const isValidValue = value !== undefined && validValues.includes(value);
  if (isValidValue) return value;
  return values[name].defaultValue;
};

export const setSetting = (name: Name, value: Value) => {
  const settings = read();
  const validValues = values[name].values;
  const isValidValue = validValues.includes(value);
  if (isValidValue) write({ ...settings, [name]: value });
};

export const useSubscribeClientSetting = () => {
  useSubscribe<"setClientSetting", { name: Name; value: Value }>(
    "setClientSetting",
    (payload) => {
      setSetting(payload.name, payload.value);
    }
  );
};
