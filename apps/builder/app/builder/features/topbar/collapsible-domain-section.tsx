import {
  Box,
  Flex,
  Label,
  theme,
  SectionTitle,
  Grid,
} from "@webstudio-is/design-system";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";

export const CollapsibleDomainSection = ({
  initiallyOpen = false,
  children,
  title,
  suffix,
  prefix,
}: {
  initiallyOpen?: boolean;
  children: ReactNode;
  prefix: ReactNode;
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
    <CollapsibleSectionRoot
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
          <Grid gap="1" flow="column" align="center" justify="start">
            {prefix}
            <Label truncate>{title}</Label>
          </Grid>
        </SectionTitle>
      }
    >
      <Flex
        css={{
          paddingInline: theme.panel.paddingInline,
          overflowWrap: "anywhere",
        }}
        gap={2}
        direction={"column"}
      >
        {children}
      </Flex>
    </CollapsibleSectionRoot>
  );
};
