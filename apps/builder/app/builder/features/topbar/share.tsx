import { useStore } from "@nanostores/react";
import {
  Button,
  FloatingPanelPopover,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTitle,
  FloatingPanelPopoverTrigger,
  FloatingPanelAnchor,
  theme,
  Tooltip,
  rawTheme,
} from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/prisma-client";
import { ShareProjectContainer } from "~/shared/share-project";
import { $authPermit } from "~/shared/nano-states";
import { $isShareDialogOpen } from "~/builder/shared/nano-states";

export const ShareButton = ({
  projectId,
  hasProPlan,
}: {
  projectId: Project["id"];
  hasProPlan: boolean;
}) => {
  const isShareDialogOpen = useStore($isShareDialogOpen);
  const authPermit = useStore($authPermit);

  const isShareDisabled = authPermit !== "own";
  const tooltipContent = isShareDisabled
    ? "Only owner can share projects"
    : undefined;

  return (
    <FloatingPanelPopover
      modal
      open={isShareDialogOpen}
      onOpenChange={(isOpen) => {
        $isShareDialogOpen.set(isOpen);
      }}
    >
      <FloatingPanelAnchor>
        <Tooltip
          content={tooltipContent ?? "Share a project link"}
          sideOffset={Number.parseFloat(rawTheme.spacing[5])}
        >
          <FloatingPanelPopoverTrigger asChild>
            <Button disabled={isShareDisabled} color="gradient">
              Share
            </Button>
          </FloatingPanelPopoverTrigger>
        </Tooltip>
      </FloatingPanelAnchor>
      <FloatingPanelPopoverContent
        sideOffset={Number.parseFloat(rawTheme.spacing[8])}
        css={{
          marginRight: theme.spacing[3],
        }}
      >
        <ShareProjectContainer projectId={projectId} hasProPlan={hasProPlan} />
        <FloatingPanelPopoverTitle>Share</FloatingPanelPopoverTitle>
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};
