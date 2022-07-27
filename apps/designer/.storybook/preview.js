import React from "react";
import { globalCss, darkTheme } from "@webstudio-is/design-system";

const globalStyles = globalCss({
  body: {
    margin: "0",
    background: darkTheme.colors.background.value,
    color: darkTheme.colors.text.value,
    fontFamily: "$sans",
  },
});

export const decorators = [
  (Story) => {
    globalStyles();
    return (
      <div className={darkTheme}>
        <Story />
      </div>
    );
  },
];

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
