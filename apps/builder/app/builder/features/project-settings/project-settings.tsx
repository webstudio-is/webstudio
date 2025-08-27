import type { FunctionComponent } from "react";
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
  rawTheme,
} from "@webstudio-is/design-system";
import {
  $openProjectSettings,
  type SectionName,
} from "~/shared/nano-states/project-settings";
import { $isDesignMode } from "~/shared/nano-states";
import { leftPanelWidth, rightPanelWidth } from "./utils";
import { SectionGeneral } from "./section-general";
import { SectionRedirects } from "./section-redirects";
import { SectionPublish } from "./section-publish";
import { SectionMarketplace } from "./section-marketplace";
import { SectionBackups } from "./section-backups";

const sections = new Map<SectionName, FunctionComponent>([
  ["general", SectionGeneral],
  ["redirects", SectionRedirects],
  ["publish", SectionPublish],
  ["marketplace", SectionMarketplace],
  ["backups", SectionBackups],
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
  const SectionComponent = currentSection
    ? sections.get(currentSection)
    : undefined;

  return (
    <Dialog
      draggable
      open={sections.has(currentSection!)}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        width={
          Number.parseInt(leftPanelWidth, 10) +
          Number.parseInt(rightPanelWidth, 10)
        }
        height={Number.parseInt(rawTheme.spacing[35], 10)}
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
            <ScrollArea css={{ width: "100%" }}>
              <Grid gap={2} css={{ py: theme.spacing[5] }}>
                {SectionComponent && <SectionComponent />}
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
