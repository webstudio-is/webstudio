import { type ReactElement } from "react";
import {
  theme,
  Flex,
  Tooltip,
  type TooltipProps,
  Text,
  ScrollArea,
} from "@webstudio-is/design-system";

const TooltipContent = ({
  title,
  description,
  propertyValues,
}: {
  title: string;
  description: React.ReactNode;
  propertyValues: string | string[];
}) => {
  return (
    <Flex direction="column" gap="2" css={{ maxWidth: theme.spacing[28] }}>
      <Text variant="titles">{title}</Text>
      <ScrollArea>
        <Text
          variant="monoBold"
          color="moreSubtle"
          css={{
            whiteSpace: "break-spaces",
            maxHeight: "3em",
            userSelect: "text",
            cursor: "text",
          }}
        >
          {Array.isArray(propertyValues)
            ? propertyValues.map((propertyValue) => (
                <div key={propertyValue}>{propertyValue}</div>
              ))
            : propertyValues}
        </Text>
      </ScrollArea>
      {description && <Text>{description}</Text>}
    </Flex>
  );
};

export const ValueTooltip = ({
  title,
  propertyValues,
  description,
  children,
  side,
  open,
  onOpenChange,
}: {
  title: string;
  propertyValues: string | string[];
  description: React.ReactNode;
  children: ReactElement;
  side?: TooltipProps["side"];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  return (
    <Tooltip
      open={open}
      onOpenChange={onOpenChange}
      side={side ?? "top"}
      // prevent closing tooltip on content click
      onPointerDown={(event) => event.preventDefault()}
      content={
        <TooltipContent
          title={title}
          propertyValues={propertyValues}
          description={description}
        />
      }
    >
      {children}
    </Tooltip>
  );
};
