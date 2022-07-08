import { createCookie } from "@remix-run/node";
import browserCookies from "js-cookie";
import { darkTheme } from "~/shared/design-system/stitches.config";

type ColorScheme = "dark" | "light";

const placeholder = "__theme_placeholder__";

const cookieNamespace = "theme";

// @todo todo switch to light by default once ready
const defaultTheme = "dark";

export const getBrowserTheme = () => {
  return browserCookies.get(cookieNamespace) || defaultTheme;
};

const getCookieTheme = async (headers: Headers): Promise<ColorScheme> => {
  const cookieTheme = await createCookie(cookieNamespace).parse(
    headers.get("Cookie")
  );
  if (cookieTheme === "system") {
    const system = headers.get("Sec-CH-Prefers-Color-Scheme");
    if (system === "light" || system === "dark") {
      return system;
    }
  }
  return cookieTheme || defaultTheme;
};

export const getThemePlaceholder = () => {
  if (typeof document === "undefined") {
    return {
      className: placeholder,
      style: { colorScheme: placeholder },
    };
  }
  const theme = getBrowserTheme();
  return {
    className: theme === "dark" ? darkTheme.toString() : "light",
    style: { colorScheme: theme },
  };
};

export const insertTheme = async (markup: string, headers: Headers) => {
  const theme = await getCookieTheme(headers);
  return markup.replace(new RegExp(placeholder, "gi"), theme);
};
