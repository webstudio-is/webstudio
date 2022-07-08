import { useLoaderData } from "@remix-run/react";
import { darkTheme } from "~/shared/design-system";
import { type ThemeName, type ThemeOption } from "./shared";

// User selected theme option.
let option: ThemeOption = "dark";
// Current systeme theme.
let system: ThemeName;

const subscribeSystemTheme = () => {
  if (typeof matchMedia === "undefined") return;
  const query = matchMedia("(prefers-color-scheme: light)");
  const getTheme = (query: MediaQueryList | MediaQueryListEvent) =>
    query.matches ? "light" : "dark";

  system = getTheme(query);

  query.addEventListener("change", (queryEvent) => {
    system = getTheme(queryEvent);
    setDomProps();
  });
};

subscribeSystemTheme();

export const getThemeOption = (): ThemeOption => {
  return option;
};

// @todo todo switch to light by default once ready
export const defaultTheme = "dark";

const selectTheme = ({
  system = defaultTheme,
  option,
}: {
  system: ThemeName;
  option?: ThemeOption;
}): ThemeName => {
  if (option === "system") {
    return system;
  }
  return option || defaultTheme;
};

const getThemeProps = () => {
  const theme = selectTheme({ option, system });
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

export const setThemeOption = (nextOption: ThemeOption) => {
  option = nextOption;
  setDomProps();
  fetch(`/rest/theme/${option}`);
};

export const useThemeProps = () => {
  const data = useLoaderData();
  if (data.theme.option) option = data.theme.option;
  if (data.theme.system) system = data.theme.system;
  return getThemeProps();
};
