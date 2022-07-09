import { useLoaderData } from "@remix-run/react";
import { darkTheme } from "~/shared/design-system";
import { type ColorScheme, type ThemeSetting } from "./shared";

// User selected theme setting.
let setting: ThemeSetting = "dark";
// Current systeme theme.
let system: ColorScheme;

const subscribeSystemTheme = () => {
  if (typeof matchMedia === "undefined") return;
  const query = matchMedia("(prefers-color-scheme: light)");
  const getColorScheme = (query: MediaQueryList | MediaQueryListEvent) =>
    query.matches ? "light" : "dark";

  system = getColorScheme(query);

  query.addEventListener("change", (queryEvent) => {
    system = getColorScheme(queryEvent);
    setDomProps();
  });
};

subscribeSystemTheme();

export const getThemeSetting = (): ThemeSetting => {
  return setting;
};

// @todo todo switch to light by default once ready
export const defaultTheme = "dark";

const selectTheme = ({
  system = defaultTheme,
  setting,
}: {
  system: ColorScheme;
  setting?: ThemeSetting;
}): ColorScheme => {
  if (setting === "system") {
    return system;
  }
  return setting || defaultTheme;
};

const getThemeProps = () => {
  const theme = selectTheme({ setting, system });
  if (theme === "dark") {
    // We need to call it so that vars get injected!!!
    darkTheme.toString();
  }
  return {
    className: theme,
    style: { colorScheme: theme },
  };
};

const setDomProps = () => {
  const props = getThemeProps();
  document.documentElement.className = props.className;
  document.documentElement.style.colorScheme = props.style.colorScheme;
};

export const setThemeSetting = (nextsetting: ThemeSetting) => {
  setting = nextsetting;
  setDomProps();
  fetch(`/rest/theme/${setting}`);
};

export const useThemeProps = () => {
  const data = useLoaderData();
  if (data.theme.setting) setting = data.theme.setting;
  if (data.theme.system) system = data.theme.system;
  return getThemeProps();
};
