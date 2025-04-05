import { createProgressAnimation } from "./shared/create-progress-animation";

export const VideoAnimation = createProgressAnimation<{ timeline?: boolean }>();
const displayName = "VideoAnimation";
VideoAnimation.displayName = displayName;
