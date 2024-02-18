import { useStore } from "@nanostores/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  theme,
  Separator,
  ScrollArea,
} from "@webstudio-is/design-system";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { $isProjectSettingsOpen } from "~/shared/nano-states/seo";
import { MetaSection } from "./meta-section";
import { CompilerSection } from "./compiler-section";
import { RedirectSection } from "./redirect-section";

const ProjectSettingsView = ({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        // Left Aside panels (e.g., Pages, Components) use zIndex: theme.zIndices[1].
        // For a dialog to appear above these panels, both overlay and content should also have zIndex: theme.zIndices[1].
        css={{
          width: theme.spacing[34],
          zIndex: theme.zIndices[1],
        }}
        overlayCss={{ zIndex: theme.zIndices[1] }}
      >
        <ScrollArea>
          <Grid gap={2} css={{ my: theme.spacing[5] }}>
            <MetaSection />
            <Separator />
            <CompilerSection />
            {isFeatureEnabled("redirects") && (
              <>
                <Separator />
                <RedirectSection />
              </>
            )}
            <div />
          </Grid>
        </ScrollArea>
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
