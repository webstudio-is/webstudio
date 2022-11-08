import { useLoaderData } from "@remix-run/react";
import { darkTheme } from "@webstudio-is/design-system";
import { restThemePath } from "~/shared/router-utils";
import type { ColorScheme, ThemeSetting } from "./types";

// User selected theme setting.
let setting: ThemeSetting = "system";
// Current systeme theme.
let system: ColorScheme;

/**
 * Subscribes color scheme change event and rerenders
 */
const subscribeSystemTheme = () => {
  if (typeof matchMedia === "undefined") return;
  const query = matchMedia("(prefers-color-scheme: light)");
  const queryColorScheme = (query: MediaQueryList | MediaQueryListEvent) =>
    query.matches ? "light" : "dark";

  system = queryColorScheme(query);

  query.addEventListener("change", (queryEvent) => {
    system = queryColorScheme(queryEvent);
    renderThemeProps();
  });
};

subscribeSystemTheme();

const fallbackTheme = "light";

/**
 * Logic we use to decide depending on user setting which color scheme to use.
 */
const getColorScheme = (): ColorScheme => {
  if (setting === "system") {
    return system || fallbackTheme;
  }
  return setting || fallbackTheme;
};

/**
 * When switching theme we need to apply the class/style manually.
 */
const renderThemeProps = () => {
  const theme = getColorScheme();
  const root = document.documentElement;
  theme === "dark"
    ? root.classList.add(darkTheme.className)
    : root.classList.remove(darkTheme.className);
  root.style.colorScheme = theme;
  root.dataset.theme = theme;
};

/**
 * Apply immediately and set the cookie on the server.
 */
export const setThemeSetting = (nextSetting: ThemeSetting) => {
  setting = nextSetting;
  renderThemeProps();
  fetch(restThemePath({ setting }));
};

/**
 * Returns the class and style to applied to some root node serverside and during hydration.
 */
export const useThemeProps = () => {
  const data = useLoaderData();
  if (data.theme.setting) setting = data.theme.setting;
  if (data.theme.system) system = data.theme.system;
  const theme = getColorScheme();
  return {
    className: theme === "dark" ? darkTheme.className : undefined,
    style: { colorScheme: theme },
    "data-theme": theme,
  };
};

/**
 * Currently selected by user theme setting.
 */
export const getThemeSetting = (): ThemeSetting => {
  return setting;
};
