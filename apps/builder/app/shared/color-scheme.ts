export const colorSchemePreferences = ["system", "light", "dark"] as const;

export type ColorSchemePreference = (typeof colorSchemePreferences)[number];
export type ColorScheme = Exclude<ColorSchemePreference, "system">;

export const colorSchemeMediaQuery = "(prefers-color-scheme: dark)";
export const clientSettingsStorageKey = "__webstudio_user_settings__";

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
  prefersDark,
}: {
  root: HTMLElement;
  storage: Pick<Storage, "getItem">;
  storageKey: string;
  prefersDark: boolean;
}) => {
  let preference: ColorSchemePreference = "system";

  try {
    const storedSettings = JSON.parse(storage.getItem(storageKey) ?? "{}") as {
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

  const colorScheme: ColorScheme =
    preference === "system" ? (prefersDark ? "dark" : "light") : preference;

  root.dataset.colorScheme = colorScheme;
};

export const colorSchemeBootstrapScript = `try { (${initializeStoredColorScheme.toString()})({
  root: document.documentElement,
  storage: window.localStorage,
  storageKey: ${JSON.stringify(clientSettingsStorageKey)},
  prefersDark: window.matchMedia(${JSON.stringify(colorSchemeMediaQuery)}).matches
}); } catch {
  document.documentElement.dataset.colorScheme = window.matchMedia(${JSON.stringify(
    colorSchemeMediaQuery
  )}).matches ? "dark" : "light";
}`;
