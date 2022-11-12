import { Flex, Text } from "@webstudio-is/design-system";
import type { ComponentProps } from "react";

type FilenameProps = Omit<ComponentProps<typeof Text>, "children"> & {
  children: string;
};

export const Filename = ({ children, ...props }: FilenameProps) => {
  const splitName = children.split(".");
  const extension = splitName[splitName.length - 1];
  const baseName = children.substr(0, children.length - extension.length - 1);
  return (
    <Flex>
      <Text truncate {...props}>
        {baseName}
      </Text>
      <Text {...props}>{extension}</Text>
    </Flex>
  );
};
