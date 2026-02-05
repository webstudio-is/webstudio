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

const applySimulation = () => {
  const condition = $selectedBreakpoint.get()?.condition;
  state = simulateMediaCondition(document, condition, state);
};

/**
 * Subscribe to breakpoint changes and apply simulation.
 * Returns an unsubscribe function.
 */
export const subscribeBreakpointSimulator = (options: {
  signal: AbortSignal;
}): (() => void) => {
  applySimulation();

  const unsubscribe = $selectedBreakpoint.listen(() => applySimulation());

  // Re-apply simulation when <style> elements are re-rendered,
  // because replacing textContent destroys old CSSOM rules
  // and creates fresh unmodified ones.
  const observer = new MutationObserver(() => applySimulation());
  observer.observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  const cleanup = () => {
    unsubscribe();
    observer.disconnect();
    simulateMediaCondition(document, undefined, state);
    state = undefined;
  };

  options.signal.addEventListener("abort", cleanup);

  return cleanup;
};
