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
import { useEffect, useState } from "react";
import { $isProjectSettingsOpen } from "~/shared/nano-states/seo";
import { $pages } from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";
import { useEffectEvent } from "../ai/hooks/effect-event";
import type { Pages } from "@webstudio-is/sdk";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { MetaSection } from "./meta-section";
import { PublishSection } from "./publish-section";
import { RedirectSection } from "./redirect-settings";

export type ProjectSettings = NonNullable<Pages["settings"]>;

const ProjectSettingsView = () => {
  const [meta, setMeta] = useState(
    $pages.get()?.meta ?? {
      siteName: "",
      faviconAssetId: "",
      code: "",
    }
  );

  const [settings, setSettings] = useState(
    $pages.get()?.settings ?? {
      atomicStyles: true,
    }
  );

  const isOpen = useStore($isProjectSettingsOpen);

  const handleSave = useEffectEvent(() => {
    serverSyncStore.createTransaction([$pages], (pages) => {
      if (pages === undefined) {
        return;
      }

      pages.meta = meta;
      pages.settings = settings;
    });
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        handleSave();
        $isProjectSettingsOpen.set(isOpen);
      }}
    >
      <DialogContent
        onBlur={handleSave}
        // Left Aside panels (e.g., Pages, Components) use zIndex: theme.zIndices[1].
        // For a dialog to appear above these panels, both overlay and content should also have zIndex: theme.zIndices[1].
        css={{
          width: theme.spacing[34],
          zIndex: theme.zIndices[1],
        }}
        overlayCss={{
          zIndex: theme.zIndices[1],
        }}
      >
        <ScrollArea>
          <Grid gap={2} css={{ my: theme.spacing[5] }}>
            <MetaSection meta={meta} onMetaChange={setMeta} />
            <Separator />
            <PublishSection
              settings={settings}
              onSettingsChange={setSettings}
            />
            {isFeatureEnabled("redirects") ? (
              <RedirectSection
                settings={settings}
                onSettingsChange={setSettings}
              />
            ) : null}
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
  const [settingDialogLazyOpen, setSettingDialogLazyOpen] = useState(false);

  useEffect(() => {
    return $isProjectSettingsOpen.subscribe((isOpen) => {
      if (isOpen) {
        setSettingDialogLazyOpen(true);
      }
    });
  }, []);

  if (settingDialogLazyOpen === false) {
    return null;
  }

  return <ProjectSettingsView />;
};
