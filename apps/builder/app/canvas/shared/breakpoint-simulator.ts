import {
  simulateMediaCondition,
  type SimulatorState,
} from "@webstudio-is/css-data";
import { $selectedBreakpoint } from "~/shared/nano-states";

/**
 * Simulates condition-based breakpoints by manipulating CSS media rules at runtime.
 * This allows designers to preview styles under different media conditions
 * without changing their actual device/browser settings.
 */

let state: SimulatorState | undefined;

/**
 * Subscribe to breakpoint changes and apply simulation.
 * Returns an unsubscribe function.
 */
export const subscribeBreakpointSimulator = (options: {
  signal: AbortSignal;
}): (() => void) => {
  // Apply initial simulation
  const selectedBreakpoint = $selectedBreakpoint.get();
  state = simulateMediaCondition(
    document,
    selectedBreakpoint?.condition,
    state
  );

  // Listen for changes
  const unsubscribe = $selectedBreakpoint.listen((breakpoint) => {
    state = simulateMediaCondition(document, breakpoint?.condition, state);
  });

  // Cleanup on abort
  options.signal.addEventListener("abort", () => {
    unsubscribe();
    simulateMediaCondition(document, undefined, state);
  });

  return () => {
    unsubscribe();
    simulateMediaCondition(document, undefined, state);
  };
};
