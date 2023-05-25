import {
  Box,
  Flex,
  Label,
  theme,
  SectionTitle,
} from "@webstudio-is/design-system";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CollapsibleSectionBase } from "~/builder/shared/collapsible-section";

export const CollapsibleDomainSection = ({
  initiallyOpen = false,
  children,
  title,
  suffix,
}: {
  initiallyOpen?: boolean;
  children: ReactNode;
  suffix: ReactNode;
  title: string;
}) => {
  const [open, setOpen] = useState(initiallyOpen);
  const titleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      titleRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [open]);

  return (
    <CollapsibleSectionBase
      label=""
      fullWidth
      isOpen={open}
      onOpenChange={setOpen}
      trigger={
        <SectionTitle
          ref={titleRef}
          suffix={
            <Box
              css={{ display: "contents" }}
              onClick={(event) => {
                if (event.defaultPrevented) {
                  return;
                }
                setOpen(!open);
              }}
            >
              {suffix}
            </Box>
          }
        >
          <Label truncate>{title}</Label>
        </SectionTitle>
      }
    >
      <Flex
        css={{
          mx: theme.spacing[9],
          overflowWrap: "anywhere",
        }}
        gap={2}
        direction={"column"}
      >
        {children}
      </Flex>
    </CollapsibleSectionBase>
  );
};
