import { createCookie } from "@remix-run/node";
import { cookieNamespace, type ColorScheme, type ThemeSetting } from "./shared";

export const themeCookieParser = createCookie(cookieNamespace);

export const getServerTheme = async (
  request: Request
): Promise<{ system?: ColorScheme; option?: ThemeSetting }> => {
  const system = (request.headers.get("Sec-CH-Prefers-Color-Scheme") ??
    undefined) as ColorScheme | undefined;
  const option: ThemeSetting =
    (await themeCookieParser.parse(request.headers.get("Cookie"))) ?? undefined;
  return { system, option };
};
