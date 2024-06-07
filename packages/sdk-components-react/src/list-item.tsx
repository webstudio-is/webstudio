import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "li";

type Props = ComponentProps<typeof defaultTag>;

export const ListItem = forwardRef<ElementRef<typeof defaultTag>, Props>(
  ({ children, ...props }, ref) => {
    return (
      <li {...props} ref={ref}>
        {children}
      </li>
    );
  }
);

ListItem.displayName = "ListItem";
