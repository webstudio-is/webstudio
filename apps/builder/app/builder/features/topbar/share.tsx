import { useStore } from "@nanostores/react";
import {
  Button,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
  theme,
  Tooltip,
  rawTheme,
  Popover,
} from "@webstudio-is/design-system";
import { ShareProjectContainer } from "~/shared/share-project";
import { $authPermit } from "~/shared/nano-states";
import { $isShareDialogOpen } from "~/builder/shared/nano-states";

export const ShareButton = ({
  projectId,
  hasProPlan,
}: {
  projectId: string;
  hasProPlan: boolean;
}) => {
  const isShareDialogOpen = useStore($isShareDialogOpen);
  const authPermit = useStore($authPermit);

  const isShareDisabled = authPermit !== "own";
  const tooltipContent = isShareDisabled
    ? "Only owner can share projects"
    : undefined;

  return (
    <Popover
      modal
      open={isShareDialogOpen}
      onOpenChange={(isOpen) => {
        $isShareDialogOpen.set(isOpen);
      }}
    >
      <Tooltip
        content={tooltipContent ?? "Share a project link"}
        sideOffset={Number.parseFloat(rawTheme.spacing[5])}
      >
        <PopoverTrigger asChild>
          <Button disabled={isShareDisabled} color="gradient">
            Share
          </Button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        sideOffset={Number.parseFloat(rawTheme.spacing[8])}
        css={{ marginRight: theme.spacing[3] }}
      >
        <ShareProjectContainer projectId={projectId} hasProPlan={hasProPlan} />
        <PopoverTitle>Share</PopoverTitle>
      </PopoverContent>
    </Popover>
  );
};
