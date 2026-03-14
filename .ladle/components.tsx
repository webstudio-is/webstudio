import * as React from "react";
import { useEffect } from "react";
import type { GlobalProvider } from "@ladle/react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { setEnv } from "../packages/feature-flags/src/index";
import { theme, globalCss } from "../packages/design-system/src/index";

// this adds <style> tags to the <head> of the document
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "@fontsource/roboto-mono";

const WaitForFonts = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode => {
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
      <div style={{ display: "none" }}>{children}</div>
    </div>
  );
};

const globalStyles = globalCss({
  body: {
    color: theme.colors.foregroundMain,
    fontFamily: theme.fonts.sans,
  },
});

export const Provider: GlobalProvider = ({ children }) => {
  globalStyles();
  setEnv("*");

  // for styling radix components
  useEffect(() => {
    document.body.setAttribute("data-ws-component", "Body");
  }, []);

  return (
    <WaitForFonts>
      <TooltipProvider>{children}</TooltipProvider>
    </WaitForFonts>
  );
};
