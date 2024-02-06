import { useEffect, useState } from "react";
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
import type { CompilerSettings, ProjectMeta } from "@webstudio-is/sdk";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { $isProjectSettingsOpen } from "~/shared/nano-states/seo";
import { $pages } from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";
import { useEffectEvent } from "../ai/hooks/effect-event";
import { MetaSection } from "./meta-section";
import { CompilerSection } from "./compiler-section";
import { RedirectSection } from "./redirect-section";
import { ClonableSection } from "./clonable-section";

const defaultMetaSettings: ProjectMeta = {
  siteName: "",
  faviconAssetId: "",
  code: "",
};

const defaultCompilerSettings: CompilerSettings = {
  atomicStyles: true,
};

const ProjectSettingsView = () => {
  const [meta, setMeta] = useState($pages.get()?.meta ?? defaultMetaSettings);
  const [compilerSettings, setCompilerSettings] = useState(
    $pages.get()?.compiler ?? defaultCompilerSettings
  );
  const [redirects, setRedirects] = useState($pages.get()?.redirects ?? []);

  const isOpen = useStore($isProjectSettingsOpen);

  const handleSave = useEffectEvent(() => {
    serverSyncStore.createTransaction([$pages], (pages) => {
      if (pages === undefined) {
        return;
      }

      pages.meta = meta;
      pages.compiler = compilerSettings;
    });
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          handleSave();
        }
        $isProjectSettingsOpen.set(isOpen);
      }}
    >
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
            <MetaSection meta={meta} onChange={setMeta} />
            <Separator />
            <CompilerSection
              settings={compilerSettings}
              onChange={setCompilerSettings}
            />
            <Separator />
            <ClonableSection />
            {isFeatureEnabled("redirects") ? (
              <RedirectSection redirects={redirects} onChange={setRedirects} />
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
    return;
  }

  return <ProjectSettingsView />;
};
