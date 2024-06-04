import type { Preview } from "@storybook/react";
import * as React from "react";
import { useEffect } from "react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { setEnv } from "../packages/feature-flags/src/index";
import { theme, globalCss } from "../packages/design-system/src/index";
import { color } from "../packages/design-system/src/__generated__/figma-design-tokens";

// this adds <style> tags to the <head> of the document
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "@fontsource/roboto-mono";

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

const globalStyles = globalCss({
  body: {
    backgroundColor: theme.colors.background,
    color: theme.colors.hiContrast,
    fontFamily: theme.fonts.sans,
  },
});

export const decorators: Preview["decorators"] = [
  (Story) => {
    globalStyles();
    setEnv("*");
    return (
      // waiting for fonts makes screenshot tests more stable
      <WaitForFonts>
        <TooltipProvider>
          <Story />
        </TooltipProvider>
      </WaitForFonts>
    );
  },
];

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
      { name: "White", value: "#ffffff" },
      { name: "Black", value: "#000000" },
      { name: "Panel", value: color.backgroundPanel },
      { name: "Maintenance Dark", value: color.maintenanceDark },
      { name: "Maintenance Medium", value: color.maintenanceMedium },
      { name: "Maintenance Light", value: color.maintenanceLight },
    ],
  },
};

export default {
  decorators,
  parameters,
} satisfies Preview;
