import { Flex, DeprecatedText2 } from "@webstudio-is/design-system";
import type { ComponentProps } from "react";

type FilenameProps = Omit<
  ComponentProps<typeof DeprecatedText2>,
  "children"
> & {
  children: string;
};

export const Filename = ({ children, ...props }: FilenameProps) => {
  const parts = children.split(".");
  const extension = parts.length > 1 ? parts.pop() : "";
  const baseName = parts.join(".");

  return (
    <Flex>
      <DeprecatedText2 truncate {...props}>
        {baseName}
      </DeprecatedText2>
      <DeprecatedText2 {...props}>{extension}</DeprecatedText2>
    </Flex>
  );
};
