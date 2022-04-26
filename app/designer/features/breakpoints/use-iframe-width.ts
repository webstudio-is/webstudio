import { useSelectedBreakpoint } from "~/designer/shared/nano-values";

// Doesn't make sense to allow resizing the canvas lower than this.
const minWidth = 200;

export const useIframeWidth = () => {
  const [selectedBreakpoint] = useSelectedBreakpoint();
  if (selectedBreakpoint === undefined || selectedBreakpoint.minWidth === 0) {
    return "100%";
  }

  return Math.max(selectedBreakpoint.minWidth, minWidth);
};
