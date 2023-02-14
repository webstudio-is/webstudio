import { Flex, DeprecatedText2 } from "@webstudio-is/design-system";
import type { ComponentProps } from "react";

type FilenameProps = Omit<
  ComponentProps<typeof DeprecatedText2>,
  "children"
> & {
  children: string;
};

export const Filename = ({ children, ...props }: FilenameProps) => {
  const splitName = children.split(".");
  const extension = splitName[splitName.length - 1];
  const baseName = children.substr(0, children.length - extension.length - 1);
  return (
    <Flex>
      <DeprecatedText2 truncate {...props}>
        {baseName}
      </DeprecatedText2>
      <DeprecatedText2 {...props}>{extension}</DeprecatedText2>
    </Flex>
  );
};
