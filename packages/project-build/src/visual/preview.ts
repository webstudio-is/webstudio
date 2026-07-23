export const projectPreviewSources = ["local", "session"] as const;
export type ProjectPreviewSource = (typeof projectPreviewSources)[number];

export const projectPreviewModes = ["iterative", "production"] as const;
export type ProjectPreviewMode = (typeof projectPreviewModes)[number];
