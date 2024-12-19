import { forwardRef, type ComponentProps, type Ref } from "react";
import { Button } from "../button";
import { styled, theme } from "../../stitches.config";

type CommandButtonProps = ComponentProps<typeof Button>;

const RoundedButton = styled(Button, {
  borderRadius: theme.borderRadius["pill"],
  aspectRatio: "1",
});

export const CommandBarButton = forwardRef(
  ({ children, ...props }: CommandButtonProps, ref: Ref<HTMLButtonElement>) => {
    return <RoundedButton {...props} prefix={children} ref={ref as null} />;
  }
);

CommandBarButton.displayName = "CommandButton";
