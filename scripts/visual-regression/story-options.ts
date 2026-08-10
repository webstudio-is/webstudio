export const defaultStoryDelay = 0;

export const storyOptions: Record<
  string,
  {
    delay?: number;
    disableIntervals?: boolean;
    finalizeExpression?: string;
    hideSelectors?: string[];
  }
> = {
  "builder-builder-help-remote-dialog--remote-dialog": {
    hideSelectors: ["iframe"],
  },
  "builder-dashboard--welcome": { hideSelectors: ["iframe"] },
  "builder-menu--menu-story": {
    hideSelectors: [
      '[aria-label="Menu Button"]',
      "[data-radix-popper-content-wrapper]",
    ],
  },
  "builder-builder-shared-loading--loading": { disableIntervals: true },
  "builder-pages-page-settings--page-settings": { delay: 3000 },
  "builder-settings-panel-props-section--props-section": { delay: 5000 },
  "builder-style-panel-css-editor--css-editor": { delay: 1000 },
  "design-system-button--button": { delay: 500 },
  "design-system-color-picker--color-picker": { delay: 500 },
};
