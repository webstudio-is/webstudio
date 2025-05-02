type ScrollAxis = "block" | "inline" | "x" | "y";

interface ScrollTimelineOptions {
  source?: Element | Document | null;
  axis?: ScrollAxis;
}

declare class ScrollTimeline extends AnimationTimeline {
  constructor(options?: ScrollTimelineOptions);
}

interface ViewTimelineOptions {
  subject?: Element | Document | null;
  axis?: ScrollAxis;
  inset?: string;
}

declare class ViewTimeline extends ScrollTimeline {
  constructor(options?: ViewTimelineOptions);
}
