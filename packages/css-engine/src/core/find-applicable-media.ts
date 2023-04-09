import { compareMedia } from "./compare-media";
import { matchMedia } from "./match-media";
import type { MediaRuleOptions } from "./rules";

// Find media rule that matches the given width when rendered.
export const findApplicableMedia = <Media extends MediaRuleOptions>(
  media: Array<Media>,
  width: number
) => {
  const sortedMedia = media
    .sort(compareMedia)
    // Reverse order is needed because the last rule in CSSOM has higher source order specificity.
    .reverse();

  for (const options of sortedMedia) {
    if (matchMedia(options, width)) {
      return options;
    }
  }
};
