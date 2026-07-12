type ScrollAxis = "block" | "inline" | "x" | "y";

interface ScrollTimelineOptions {
  source?: Element | Document | null;
  axis?: ScrollAxis;
}

declare class ScrollTimeline extends AnimationTimeline {
  constructor(options?: ScrollTimelineOptions);
}

// https://drafts.csswg.org/scroll-animations-1/#dictdef-keyframeanimationoptions
interface KeyframeAnimationOptions {
  rangeStart?: string;
  rangeEnd?: string;
}

interface ViewTimelineOptions {
  subject?: Element | Document | null;
  axis?: ScrollAxis;
  inset?: string;
}

declare class ViewTimeline extends ScrollTimeline {
  constructor(options?: ViewTimelineOptions);
}
