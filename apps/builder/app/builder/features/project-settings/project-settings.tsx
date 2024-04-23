import { useStore } from "@nanostores/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  theme,
  ScrollArea,
  Flex,
  List,
  ListItem,
  focusRingStyle,
  Text,
} from "@webstudio-is/design-system";
import { $isProjectSettingsOpen } from "~/shared/nano-states/seo";
import { SectionGeneral } from "./section-general";
import { SectionRedirects } from "./section-redirects";
import { useState } from "react";
import { SectionMarketplace } from "./section-marketplace";
import { leftPanelWidth, rightPanelWidth } from "./utils";

const focusOutline = focusRingStyle();

const sectionNames = ["General", "Redirects", "Marketplace"];

type SectionName = (typeof sectionNames)[number];

export const ProjectSettingsView = ({
  currentSection,
  onSectionChange,
  isOpen,
  onOpenChange,
}: {
  currentSection: SectionName;
  onSectionChange?: (section: SectionName) => void;
  isOpen: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        css={{
          width: `calc(${leftPanelWidth} + ${rightPanelWidth})`,
          maxWidth: "none",
          height: theme.spacing[35],
        }}
      >
        <Flex grow>
          <List asChild>
            <Flex
              direction="column"
              shrink={false}
              css={{
                width: leftPanelWidth,
                borderRight: `1px solid  ${theme.colors.borderMain}`,
              }}
            >
              {sectionNames.map((name, index) => {
                return (
                  <ListItem
                    current={currentSection === name}
                    asChild
                    index={index}
                    key={name}
                    onSelect={() => {
                      onSectionChange?.(name);
                    }}
                  >
                    <Flex
                      css={{
                        position: "relative",
                        height: theme.spacing[13],
                        px: theme.spacing[9],
                        outline: "none",
                        "&:focus-visible": focusOutline,
                        "&:hover": focusOutline,
                        "&[aria-current=true]": {
                          background: theme.colors.backgroundItemCurrent,
                          color: theme.colors.foregroundMain,
                        },
                      }}
                      align="center"
                    >
                      <Text variant="labelsSentenceCase" truncate>
                        {name}
                      </Text>
                    </Flex>
                  </ListItem>
                );
              })}
            </Flex>
          </List>
          <ScrollArea>
            <Grid gap={2} css={{ my: theme.spacing[5] }}>
              {currentSection === "General" && <SectionGeneral />}
              {currentSection === "Redirects" && <SectionRedirects />}
              {currentSection === "Marketplace" && <SectionMarketplace />}
              <div />
            </Grid>
          </ScrollArea>
        </Flex>
        {/* Title is at the end intentionally,
         * to make the close button last in the tab order
         */}
        <DialogTitle>Project Settings</DialogTitle>
      </DialogContent>
    </Dialog>
  );
};

export const ProjectSettings = () => {
  const isOpen = useStore($isProjectSettingsOpen);
  const [currentSection, setCurrentSection] = useState<SectionName>(
    sectionNames[0]
  );

  return (
    <ProjectSettingsView
      isOpen={isOpen}
      currentSection={currentSection}
      onSectionChange={setCurrentSection}
      onOpenChange={$isProjectSettingsOpen.set}
    />
  );
};
