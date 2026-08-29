import { parse, serialize } from "cookie";

export const colorSchemePreferences = ["system", "light", "dark"] as const;

export type ColorSchemePreference = (typeof colorSchemePreferences)[number];
export type ColorScheme = Exclude<ColorSchemePreference, "system">;

export const colorSchemeMediaQuery = "(prefers-color-scheme: dark)";
export const clientSettingsStorageKey = "__webstudio_user_settings__";
export const colorSchemeCookieName = "__webstudio_color_scheme__";

const isColorSchemePreference = (
  value: unknown
): value is ColorSchemePreference =>
  value === "system" || value === "light" || value === "dark";

export const parseColorSchemeCookie = (cookie: string | null | undefined) => {
  if (cookie === null || cookie === undefined) {
    return;
  }
  const preference = parse(cookie)[colorSchemeCookieName];
  return isColorSchemePreference(preference) ? preference : undefined;
};

export const serializeColorSchemeCookie = ({
  preference,
  domain,
  secure,
}: {
  preference: ColorSchemePreference;
  domain: string;
  secure: boolean;
}) =>
  serialize(colorSchemeCookieName, preference, {
    domain,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure,
  });

export const applyColorScheme = ({
  preference,
  prefersDark,
  root,
}: {
  preference: ColorSchemePreference;
  prefersDark: boolean;
  root: HTMLElement;
}) => {
  const colorScheme: ColorScheme =
    preference === "system" ? (prefersDark ? "dark" : "light") : preference;

  root.dataset.colorScheme = colorScheme;
};

export const initializeStoredColorScheme = ({
  root,
  storage,
  storageKey,
  storedPreference,
  prefersDark,
}: {
  root: HTMLElement;
  storage: Pick<Storage, "getItem">;
  storageKey: string;
  storedPreference?: unknown;
  prefersDark: boolean;
}) => {
  const hasStoredPreference =
    storedPreference === "system" ||
    storedPreference === "light" ||
    storedPreference === "dark";
  let preference: ColorSchemePreference = hasStoredPreference
    ? storedPreference
    : "system";

  if (hasStoredPreference === false) {
    try {
      const storedSettings = JSON.parse(
        storage.getItem(storageKey) ?? "{}"
      ) as {
        colorScheme?: unknown;
      };

      if (
        storedSettings.colorScheme === "system" ||
        storedSettings.colorScheme === "light" ||
        storedSettings.colorScheme === "dark"
      ) {
        preference = storedSettings.colorScheme;
      }
    } catch {
      // Invalid or unavailable storage leaves the interface on the system scheme.
    }
  }

  const colorScheme: ColorScheme =
    preference === "system" ? (prefersDark ? "dark" : "light") : preference;

  root.dataset.colorScheme = colorScheme;
};

export const createColorSchemeBootstrapScript = (
  storedPreference?: ColorSchemePreference
) => `try { (${initializeStoredColorScheme.toString()})({
  root: document.documentElement,
  storage: window.localStorage,
  storageKey: ${JSON.stringify(clientSettingsStorageKey)},
  storedPreference: ${JSON.stringify(storedPreference)},
  prefersDark: window.matchMedia(${JSON.stringify(colorSchemeMediaQuery)}).matches
}); } catch {
  document.documentElement.dataset.colorScheme = window.matchMedia(${JSON.stringify(
    colorSchemeMediaQuery
  )}).matches ? "dark" : "light";
}`;
