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

const focusOutline = focusRingStyle();

const settingNames = ["General", "Redirects"];

if (isFeatureEnabled("marketplace")) {
  settingNames.push("Marketplace");
}

const ProjectSettingsView = ({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const [selectedSetting, setSelectedSetting] = useState<
    (typeof settingNames)[number]
  >(settingNames[0]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        // Left Aside panels (e.g., Pages, Components) use zIndex: theme.zIndices[1].
        // For a dialog to appear above these panels, both overlay and content should also have zIndex: theme.zIndices[1].
        css={{
          width: "max-content",
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
              css={{
                width: theme.spacing[26],
                borderRight: `1px solid  ${theme.colors.borderMain}`,
              }}
            >
              {settingNames.map((name, index) => {
                return (
                  <ListItem
                    current={selectedSetting === name}
                    asChild
                    index={index}
                    key={name}
                    onSelect={() => {
                      setSelectedSetting(name);
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
            <Grid
              gap={2}
              css={{ my: theme.spacing[5], width: theme.spacing[34] }}
            >
              {selectedSetting === "General" && <SectionGeneral />}
              {selectedSetting === "Redirects" && <SectionRedirects />}
              {selectedSetting === "Marketplace" && <SectionMarketplace />}
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

  return (
    <ProjectSettingsView
      isOpen={isOpen}
      onOpenChange={$isProjectSettingsOpen.set}
    />
  );
};
