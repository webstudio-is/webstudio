import { createCookie } from "@remix-run/node";
import { cookieNamespace, type ThemeName, type ThemeOption } from "./shared";

export const themeCookieParser = createCookie(cookieNamespace);

export const getServerTheme = async (
  request: Request
): Promise<{ system?: ThemeName; option?: ThemeOption }> => {
  const system = (request.headers.get("Sec-CH-Prefers-Color-Scheme") ??
    undefined) as ThemeName | undefined;
  const option: ThemeOption =
    (await themeCookieParser.parse(request.headers.get("Cookie"))) ?? undefined;
  return { system, option };
};
