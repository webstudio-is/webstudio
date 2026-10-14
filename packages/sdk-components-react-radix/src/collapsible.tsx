import {
  type ReactNode,
  forwardRef,
  Children,
  type ComponentProps,
  type ComponentPropsWithoutRef,
  useState,
  useEffect,
} from "react";
import { Root, Trigger, Content } from "@radix-ui/react-collapsible";

export const Collapsible = forwardRef<
  HTMLDivElement,
  Omit<ComponentProps<typeof Root>, "defaultOpen" | "asChild">
>((props, ref) => {
  const currentOpen = props.open ?? false;
  const [open, setOpen] = useState(currentOpen);
  // synchronize external value with local one when changed
  useEffect(() => setOpen(currentOpen), [currentOpen]);
  return <Root {...props} ref={ref} open={open} onOpenChange={setOpen} />;
});

/**
 * We're not exposing the 'asChild' property for the Trigger.
 * Instead, we're enforcing 'asChild=true' for the Trigger and making it style-less.
 * This avoids situations where the Trigger inadvertently passes all styles to its child,
 * which would prevent us from displaying styles properly in the builder.
 */
export const CollapsibleTrigger = forwardRef<
  HTMLButtonElement,
  { children: ReactNode }
>(({ children, ...props }, ref) => {
  const firstChild = Children.toArray(children)[0];
  return (
    <Trigger asChild={true} ref={ref} {...props}>
      {firstChild ?? <button>Add button</button>}
    </Trigger>
  );
});

export const CollapsibleContent = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof Content>, "asChild" | "forceMount"> & {
    /** Used to force mounting when more control is needed. Useful when controlling animation with React animation libraries or keeping content available in the DOM. */
    forceMount?: boolean;
  }
>(({ forceMount, ...props }, ref) => {
  const contentProps = forceMount ? { forceMount: true as const } : {};
  return <Content ref={ref} {...contentProps} {...props} />;
});
