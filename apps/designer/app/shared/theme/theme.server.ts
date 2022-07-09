import { createCookie } from "@remix-run/node";
import type { ColorScheme, ThemeSetting } from "./types";

const cookieNamespace = "theme";

export const themeCookieParser = createCookie(cookieNamespace);

export const getThemeData = async (
  request: Request
): Promise<{ system?: ColorScheme; setting?: ThemeSetting }> => {
  const system = (request.headers.get("Sec-CH-Prefers-Color-Scheme") ??
    undefined) as ColorScheme | undefined;
  const setting: ThemeSetting =
    (await themeCookieParser.parse(request.headers.get("Cookie"))) ?? undefined;
  return { system, setting };
};
