import "@webstudio-is/storybook-config/setup-fonts";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

export const decorators = [
  (StoryFn) => {
    document.body.style.fontFamily = "sans-serif";
    return <StoryFn />;
  },
];
