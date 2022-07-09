import { useLoaderData } from "@remix-run/react";
import { darkTheme } from "~/shared/design-system";
import type { ColorScheme, ThemeSetting } from "./types";

// User selected theme setting.
let setting: ThemeSetting = "dark";
// Current systeme theme.
let system: ColorScheme;

/**
 * Subscribes color scheme change event and rerenders
 */
const subscribeSystemTheme = () => {
  if (typeof matchMedia === "undefined") return;
  const query = matchMedia("(prefers-color-scheme: light)");
  const getColorScheme = (query: MediaQueryList | MediaQueryListEvent) =>
    query.matches ? "light" : "dark";

  system = getColorScheme(query);

  query.addEventListener("change", (queryEvent) => {
    system = getColorScheme(queryEvent);
    renderThemeProps();
  });
};

subscribeSystemTheme();

// @todo todo switch to light by default once ready
const defaultTheme = "dark";

/**
 * Logic we use to decide depending on user setting which color scheme to use.
 * @returns
 */
const getColorScheme = (): ColorScheme => {
  if (setting === "system") {
    return system || defaultTheme;
  }
  return setting || defaultTheme;
};

const getThemeProps = () => {
  const theme = getColorScheme();
  return {
    className: theme,
    style: { colorScheme: theme },
  };
};

/**
 * We need to call it so that vars get injected.
 * Not loving this implicit behavior.
 * Light scheme is also rendered by default, so we only need to do it for the dark.
 */
const renderDarkThemeVars = () => {
  const theme = getColorScheme();
  if (theme === "dark") {
    darkTheme.toString();
  }
};

/**
 * When switching theme we need to apply the class/style manually.
 */
const renderThemeProps = () => {
  const { className, style } = getThemeProps();
  renderDarkThemeVars();
  document.documentElement.className = className;
  document.documentElement.style.colorScheme = style.colorScheme;
};

/**
 * Apply immediately and set the cookie on the server.
 */
export const setThemeSetting = (nextSetting: ThemeSetting) => {
  setting = nextSetting;
  renderThemeProps();
  fetch(`/rest/theme/${setting}`);
};

/**
 * Returns the class and style to applied to some root node serverside and during hydration.
 */
export const useThemeProps = () => {
  const data = useLoaderData();
  if (data.theme.setting) setting = data.theme.setting;
  if (data.theme.system) system = data.theme.system;
  renderDarkThemeVars();
  return getThemeProps();
};

/**
 * Currently selected by user theme setting.
 */
export const getThemeSetting = (): ThemeSetting => {
  return setting;
};
