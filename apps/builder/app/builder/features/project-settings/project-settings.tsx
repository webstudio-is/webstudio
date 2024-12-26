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
  Text,
} from "@webstudio-is/design-system";
import { $openProjectSettings } from "~/shared/nano-states/project-settings";
import { SectionGeneral } from "./section-general";
import { SectionRedirects } from "./section-redirects";
import { SectionPublish } from "./section-publish";
import { SectionMarketplace } from "./section-marketplace";
import { leftPanelWidth, rightPanelWidth } from "./utils";
import type { FunctionComponent } from "react";
import { $isDesignMode } from "~/shared/nano-states";

type SectionName = "general" | "redirects" | "publish" | "marketplace";

const sections = new Map<SectionName, FunctionComponent>([
  ["general", SectionGeneral],
  ["redirects", SectionRedirects],
  ["publish", SectionPublish],
  ["marketplace", SectionMarketplace],
] as const);

export const ProjectSettingsView = ({
  currentSection,
  onSectionChange,
  onOpenChange,
}: {
  currentSection?: SectionName;
  onSectionChange?: (section: SectionName) => void;
  onOpenChange?: (isOpen: boolean) => void;
}) => {
  const isDesignMode = useStore($isDesignMode);

  return (
    <Dialog
      draggable
      open={sections.has(currentSection!)}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        css={{
          width: `calc(${leftPanelWidth} + ${rightPanelWidth})`,
          maxWidth: "none",
          height: theme.spacing[35],
        }}
      >
        <fieldset style={{ display: "contents" }} disabled={!isDesignMode}>
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
                {Array.from(sections.keys()).map((name, index) => {
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
                          paddingInline: theme.panel.paddingInline,
                          outline: "none",
                          "&:focus-visible, &:hover": {
                            background: theme.colors.backgroundHover,
                          },
                          "&[aria-current=true]": {
                            background: theme.colors.backgroundItemCurrent,
                            color: theme.colors.foregroundMain,
                          },
                        }}
                        align="center"
                      >
                        <Text variant="labelsTitleCase" truncate>
                          {name}
                        </Text>
                      </Flex>
                    </ListItem>
                  );
                })}
              </Flex>
            </List>
            <ScrollArea>
              <Grid gap={2} css={{ py: theme.spacing[5] }}>
                {currentSection === "general" && <SectionGeneral />}
                {currentSection === "redirects" && <SectionRedirects />}
                {currentSection === "publish" && <SectionPublish />}
                {currentSection === "marketplace" && <SectionMarketplace />}
                <div />
              </Grid>
            </ScrollArea>
          </Flex>
          {/* Title is at the end intentionally,
           * to make the close button last in the tab order
           */}
          <DialogTitle>Project Settings</DialogTitle>
        </fieldset>
      </DialogContent>
    </Dialog>
  );
};

export const ProjectSettings = () => {
  const currentSection = useStore($openProjectSettings);

  return (
    <ProjectSettingsView
      currentSection={currentSection}
      onSectionChange={$openProjectSettings.set}
      onOpenChange={(open) => {
        $openProjectSettings.set(open ? "general" : undefined);
      }}
    />
  );
};
