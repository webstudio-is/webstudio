import { usePress } from "@react-aria/interactions";
import { Slot, type SlotProps } from "@radix-ui/react-slot";
import { ArrowFocus } from "./arrow-focus";

type ListProps = SlotProps & {
  asChild?: boolean;
};

export const List = ({ asChild, ...props }: ListProps) => {
  const Component = asChild ? Slot : "ul";
  return (
    <ArrowFocus
      render={({ handleKeyDown }) => {
        return (
          <Component role="listbox" onKeyDown={handleKeyDown} {...props} />
        );
      }}
    />
  );
};
List.displayName = "List";

type ListItemProps = SlotProps & {
  state?: "disabled" | "selected";
  current?: boolean;
  index?: number;
  onSelect?: () => void;
  asChild?: boolean;
};

export const ListItem = ({
  state,
  current,
  index,
  onSelect,
  asChild,
  ...props
}: ListItemProps) => {
  const stateProp =
    state === "disabled"
      ? { "data-state": "disabled" }
      : state === "selected"
      ? { "data-state": "selected" }
      : undefined;
  const { pressProps } = usePress({
    onPress() {
      onSelect?.();
    },
  });
  const Component = asChild ? Slot : "li";
  return (
    <Component
      tabIndex={index === 0 ? 0 : -1}
      role="option"
      key={index}
      {...(state === "selected" ? { "aria-selected": true } : undefined)}
      {...(current ? { "aria-current": true } : undefined)}
      {...props}
      {...stateProp}
      {...pressProps}
    />
  );
};

ListItem.displayName = "ListItem";
