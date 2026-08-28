import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import { $settings } from "~/builder/shared/client-settings";
import { applyColorScheme, colorSchemeMediaQuery } from "./color-scheme";

export const ColorSchemeController = () => {
  const { colorScheme: preference } = useStore($settings);

  useEffect(() => {
    const mediaQuery = window.matchMedia(colorSchemeMediaQuery);
    const updateColorScheme = () => {
      applyColorScheme({
        preference,
        prefersDark: mediaQuery.matches,
        root: document.documentElement,
      });
    };

    updateColorScheme();

    if (preference !== "system") {
      return;
    }

    mediaQuery.addEventListener("change", updateColorScheme);
    return () => {
      mediaQuery.removeEventListener("change", updateColorScheme);
    };
  }, [preference]);

  return null;
};
