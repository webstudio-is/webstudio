export const defaultStoryDelay = 0;

export const storyOptions: Record<
  string,
  { delay?: number; disableIntervals?: boolean; hideSelectors?: string[] }
> = {
  "builder-builder-help-remote-dialog--remote-dialog": {
    hideSelectors: ["iframe"],
  },
  "builder-builder-shared-loading--loading": { disableIntervals: true },
  "builder-pages-page-settings--page-settings": { delay: 3000 },
  "builder-settings-panel-props-section--props-section": { delay: 5000 },
  "builder-style-panel-css-editor--css-editor": { delay: 500 },
};
