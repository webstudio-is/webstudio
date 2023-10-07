import { forwardRef, type ComponentProps, type Ref } from "react";
import { Button } from "../button";
import { styled, theme } from "../../stitches.config";

type CommandButtonProps = ComponentProps<typeof Button>;

const RoundedButton = styled(Button, {
  borderRadius: theme.borderRadius["pill"],
  width: "min-content",
});

export const CommandBarButton = forwardRef(
  ({ children, ...props }: CommandButtonProps, ref: Ref<HTMLButtonElement>) => {
    return <RoundedButton ref={ref} {...props} prefix={children} />;
  }
);

CommandBarButton.displayName = "CommandButton";
