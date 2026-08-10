export const defaultStoryDelay = 2000;

export const storyOptions: Record<
  string,
  { delay?: number; disableIntervals?: boolean }
> = {
  "builder-builder-shared-loading--loading": { disableIntervals: true },
  "builder-pages-page-settings--page-settings": { delay: 3000 },
  "builder-settings-panel-props-section--props-section": { delay: 5000 },
};
