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
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { SectionMarketplace } from "./section-marketplace";
import { leftPanelWidth, rightPanelWidth } from "./utils";

const focusOutline = focusRingStyle();

const sectionNames = ["General", "Redirects"];

if (isFeatureEnabled("marketplace")) {
  sectionNames.push("Marketplace");
}

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
        // Left Aside panels (e.g., Pages, Components) use zIndex: theme.zIndices[1].
        // For a dialog to appear above these panels, both overlay and content should also have zIndex: theme.zIndices[1].
        css={{
          width: `calc(${leftPanelWidth} + ${rightPanelWidth})`,
          maxWidth: "none",
          height: theme.spacing[35],
          zIndex: theme.zIndices[1],
        }}
        overlayCss={{ zIndex: theme.zIndices[1] }}
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
                          color: theme.colors.foregroundContrastMain,
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
              {currentSection === "Marketplace" &&
                isFeatureEnabled("marketplace") && <SectionMarketplace />}
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
