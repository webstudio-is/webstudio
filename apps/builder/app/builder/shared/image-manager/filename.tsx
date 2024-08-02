import { Flex, Text } from "@webstudio-is/design-system";
import type { ComponentProps } from "react";

type FilenameProps = Omit<ComponentProps<typeof Text>, "children"> & {
  children: string;
};

export const Filename = ({ children, ...props }: FilenameProps) => {
  const parts = children.split(".");
  const extension = parts.length > 1 ? parts.pop() : "";
  const baseName = parts.join(".");

  return (
    <Flex>
      <Text truncate {...props}>
        {baseName}
      </Text>
      <Text {...props}>{extension}</Text>
    </Flex>
  );
};
