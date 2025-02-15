/*
 * Inspired by
 * https://github.com/radix-ui/primitives/blob/main/packages/core/primitive/src/primitive.tsx
 */
export const composeEventHandlers = <CustomEvent>(
  handlers: Array<(event: CustomEvent) => void>,
  { checkForDefaultPrevented = true } = {}
) => {
  return function handleEvent(event: CustomEvent) {
    for (const handler of handlers) {
      handler?.(event);
      if (
        checkForDefaultPrevented &&
        (event as unknown as Event).defaultPrevented
      ) {
        break;
      }
    }
  };
};
