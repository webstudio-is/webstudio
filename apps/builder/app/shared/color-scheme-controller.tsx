import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import {
  $settings,
  synchronizeColorScheme,
} from "~/builder/shared/client-settings";
import { getAuthorizationServerOrigin } from "./router-utils/origins";
import {
  applyColorScheme,
  colorSchemeMediaQuery,
  serializeColorSchemeCookie,
} from "./color-scheme";

export const ColorSchemeController = () => {
  const { colorScheme: preference } = useStore($settings);

  useEffect(() => {
    const mediaQuery = window.matchMedia(colorSchemeMediaQuery);
    const cookieDomain = new URL(
      getAuthorizationServerOrigin(window.location.origin)
    ).hostname;
    const updateColorScheme = () => {
      applyColorScheme({
        preference,
        prefersDark: mediaQuery.matches,
        root: document.documentElement,
      });
    };

    document.cookie = serializeColorSchemeCookie({
      preference,
      domain: cookieDomain,
      secure: window.location.protocol === "https:",
    });
    updateColorScheme();

    if (preference !== "system") {
      return;
    }

    mediaQuery.addEventListener("change", updateColorScheme);
    return () => {
      mediaQuery.removeEventListener("change", updateColorScheme);
    };
  }, [preference]);

  useEffect(() => {
    const synchronizeVisibleDocument = () => {
      if (document.visibilityState === "visible") {
        synchronizeColorScheme();
      }
    };

    window.addEventListener("focus", synchronizeColorScheme);
    document.addEventListener("visibilitychange", synchronizeVisibleDocument);
    return () => {
      window.removeEventListener("focus", synchronizeColorScheme);
      document.removeEventListener(
        "visibilitychange",
        synchronizeVisibleDocument
      );
    };
  }, []);

  return null;
};
