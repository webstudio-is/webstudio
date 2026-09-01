import type { Preview } from "@storybook/react";
import * as React from "react";
import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { setEnv } from "../packages/feature-flags/src/index";
import {
  cssVar,
  type ThemeVariableName,
} from "../packages/design-system/src/index";

import "../packages/design-system/src/global.css";

const themeTestCases = {
  default: {},
  monochrome: {
    "--theme-color-neutral": "oklch(50% 0 0)",
    "--theme-color-accent": "oklch(50% 0 0)",
    "--theme-color-positive": "oklch(50% 0.14 152)",
    "--theme-color-negative": "oklch(50% 0.19 27)",
    "--theme-color-warning": "oklch(50% 0.14 75)",
    "--theme-color-informative": "oklch(50% 0.14 225)",
    "--theme-contrast-content": "100%",
    "--theme-contrast-surface": "70%",
    "--theme-contrast-border": "100%",
  },
  warm: {
    "--theme-color-neutral": "oklch(55% 0.02 70)",
    "--theme-color-accent": "oklch(60% 0.18 35)",
    "--theme-color-positive": "oklch(55% 0.14 135)",
    "--theme-color-negative": "oklch(55% 0.19 25)",
    "--theme-color-warning": "oklch(55% 0.14 85)",
    "--theme-color-informative": "oklch(55% 0.14 210)",
    "--theme-contrast-content": "15%",
    "--theme-contrast-surface": "0%",
    "--theme-contrast-border": "0%",
  },
  vivid: {
    "--theme-color-neutral": "oklch(45% 0.02 300)",
    "--theme-color-accent": "oklch(65% 0.3 300)",
    "--theme-color-positive": "oklch(60% 0.3 145)",
    "--theme-color-negative": "oklch(60% 0.3 20)",
    "--theme-color-warning": "oklch(65% 0.3 80)",
    "--theme-color-informative": "oklch(60% 0.3 225)",
    "--theme-contrast-content": "100%",
    "--theme-contrast-surface": "100%",
    "--theme-contrast-border": "100%",
  },
} satisfies Record<string, Partial<Record<ThemeVariableName, string>>>;

const themeVariableNames = new Set(
  Object.values(themeTestCases).flatMap((testCase) => Object.keys(testCase))
);

type ThemeTestCase = keyof typeof themeTestCases;
type ColorScheme = "light" | "dark";

const isThemeTestCase = (value: unknown): value is ThemeTestCase =>
  typeof value === "string" && value in themeTestCases;

const ThemeGlobals = ({
  children,
  themeTestCase,
  colorScheme,
}: {
  children: ReactNode;
  themeTestCase: ThemeTestCase;
  colorScheme: ColorScheme;
}) => {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousScheme = root.getAttribute("data-color-scheme");
    const previousBodyBackground = document.body.style.backgroundColor;
    const previousBodyBackgroundPriority =
      document.body.style.getPropertyPriority("background-color");
    const previousTheme = new Map(
      Array.from(themeVariableNames, (name) => [
        name,
        root.style.getPropertyValue(name),
      ])
    );

    for (const name of themeVariableNames) {
      root.style.removeProperty(name);
    }
    for (const [name, value] of Object.entries(themeTestCases[themeTestCase])) {
      root.style.setProperty(name, value);
    }
    root.setAttribute("data-color-scheme", colorScheme);

    if (themeTestCase !== "default" || colorScheme === "dark") {
      document.body.style.setProperty(
        "background-color",
        "var(--background-primary)",
        "important"
      );
    }

    return () => {
      for (const [name, value] of previousTheme) {
        if (value === "") {
          root.style.removeProperty(name);
        } else {
          root.style.setProperty(name, value);
        }
      }
      if (previousScheme === null) {
        root.removeAttribute("data-color-scheme");
      } else {
        root.setAttribute("data-color-scheme", previousScheme);
      }
      document.body.style.setProperty(
        "background-color",
        previousBodyBackground,
        previousBodyBackgroundPriority
      );
    };
  }, [colorScheme, themeTestCase]);

  return children;
};

const WaitForFonts = ({ children }) => {
  const [isFontsLoaded, setIsFontsLoaded] = React.useState(false);

  useEffect(() => {
    let isUnsubscribed = false;
    document.fonts.ready.then(() => {
      if (isUnsubscribed === false) {
        setIsFontsLoaded(true);
      }
    });
    return () => {
      isUnsubscribed = true;
    };
  }, []);

  return isFontsLoaded ? (
    children
  ) : (
    <div>
      Waiting for fonts to load ...
      {/* not rendering children initially breaks backgrounds addon,
       * so we always render it */}
      <div style={{ display: "none" }}>{children}</div>
    </div>
  );
};

const decorators: Preview["decorators"] = [
  (Story, { globals }) => {
    setEnv("*");
    const themeTestCase = isThemeTestCase(globals.themeTestCase)
      ? globals.themeTestCase
      : "default";
    const colorScheme = globals.colorScheme === "dark" ? "dark" : "light";
    return (
      // waiting for fonts makes screenshot tests more stable
      <ThemeGlobals themeTestCase={themeTestCase} colorScheme={colorScheme}>
        <WaitForFonts>
          <TooltipProvider>
            <Story />
          </TooltipProvider>
        </WaitForFonts>
      </ThemeGlobals>
    );
  },
];

const globalTypes: Preview["globalTypes"] = {
  themeTestCase: {
    name: "Theme test case",
    description: "Apply a bounded theme configuration to every story.",
    toolbar: {
      title: "Theme",
      icon: "paintbrush",
      items: [
        { value: "default", title: "Default" },
        { value: "monochrome", title: "Monochrome high contrast" },
        { value: "warm", title: "Warm and soft" },
        { value: "vivid", title: "Vivid and structured" },
      ],
      dynamicTitle: true,
    },
  },
  colorScheme: {
    name: "Color scheme",
    description: "Render semantic colors in the light or dark scheme.",
    toolbar: {
      title: "Color scheme",
      icon: "mirror",
      items: [
        { value: "light", title: "Light" },
        { value: "dark", title: "Dark" },
      ],
      dynamicTitle: true,
    },
  },
};

const initialGlobals: Preview["initialGlobals"] = {
  themeTestCase: "default",
  colorScheme: "light",
};

const parameters: Preview["parameters"] = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  backgrounds: {
    default: "White",
    values: [
      { name: "Primary", value: cssVar("--background-primary") },
      { name: "Secondary", value: cssVar("--background-secondary") },
      { name: "Inverse", value: cssVar("--background-inverse") },
      { name: "White", value: "#ffffff" },
      { name: "Black", value: "#000000" },
    ],
  },
};

export default {
  decorators,
  globalTypes,
  initialGlobals,
  parameters,
} satisfies Preview;
