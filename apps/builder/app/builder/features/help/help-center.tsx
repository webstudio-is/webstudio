import {
  Button,
  Flex,
  Popover,
  PopoverContent,
  PopoverTrigger,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import { type ComponentProps } from "react";
import { $remoteDialog } from "../../shared/nano-states";
import { help } from "~/shared/help";

export const HelpCenter = ({
  children,
  side = "right",
  ...popoverProps
}: {
  children: React.ReactNode;
  side?: "bottom" | "left" | "right" | "top";
} & Pick<ComponentProps<typeof Popover>, "open" | "onOpenChange">) => {
  return (
    <Popover {...popoverProps}>
      {children}
      <PopoverContent
        avoidCollisions
        sideOffset={0}
        // Height of the footer
        collisionPadding={{ bottom: Number.parseFloat(rawTheme.spacing[11]) }}
        side={side}
      >
        <Flex
          as="form"
          target="_blank"
          direction="column"
          css={{ padding: theme.spacing[5] }}
          gap="2"
        >
          {help.map((item) => (
            <Button
              key={item.url}
              prefix={item.icon}
              css={{ justifyContent: "start" }}
              color="ghost"
              formAction={item.url}
              onClick={() => {
                if ("target" in item && item.target === "embed") {
                  $remoteDialog.set({
                    title: item.label,
                    url: item.url,
                  });
                }
              }}
            >
              {item.label}
            </Button>
          ))}
        </Flex>
      </PopoverContent>
    </Popover>
  );
};

HelpCenter.Trigger = PopoverTrigger;
