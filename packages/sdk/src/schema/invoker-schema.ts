import { z } from "zod";
import { commandStringSchema } from "./animation-schema";

/**
 * HTML Invoker Commands Schema
 *
 * Implements the HTML Invoker Commands API for declarative button behaviors.
 * This enables buttons to trigger animations on other elements without JavaScript.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API
 *
 * HTML Output:
 * ```html
 * <button commandfor="animation-group-id" command="--play-intro">
 *   Play Animation
 * </button>
 * ```
 *
 * The target Animation Group listens for "command" events and triggers
 * the animation when the command matches.
 */

/**
 * Invoker prop value - defines how a button invokes commands on target elements
 *
 * Note: Empty values are allowed during editing. The component generator
 * will skip rendering commandfor/command attributes if values are incomplete.
 */
export const invokerSchema = z.object({
  /**
   * Target instance ID - the Animation Group that receives this command
   * This becomes the HTML `commandfor` attribute value (referencing the element's id)
   * Empty string means not yet configured
   */
  targetInstanceId: z.string(),

  /**
   * Command name with -- prefix (HTML Invoker Commands standard)
   * Custom commands must start with "--" to avoid conflicts with built-in commands
   * Examples: "--play-intro", "--toggle-menu", "--show-modal"
   * "--" alone means not yet configured
   */
  command: z.string(),
});

/**
 * Check if an invoker value is complete and valid for rendering
 */
export const isCompleteInvoker = (invoker: Invoker): boolean => {
  return (
    invoker.targetInstanceId.length >= 1 &&
    invoker.command.length >= 3 &&
    invoker.command.startsWith("--")
  );
};

export type Invoker = z.infer<typeof invokerSchema>;

/**
 * Check if a command is a valid HTML Invoker custom command
 */
export const isValidCommand = (command: string): boolean => {
  return commandStringSchema.safeParse(command).success;
};
