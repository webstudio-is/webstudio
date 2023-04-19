import * as React from "react";
import { useEffect } from "react";

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

export const decorators = [
  // waiting for fonts makes screenshot tests more stable
  (Story) => (
    <WaitForFonts>
      <Story />
    </WaitForFonts>
  ),
];
