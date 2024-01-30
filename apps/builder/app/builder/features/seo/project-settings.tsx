import { useStore } from "@nanostores/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  InputField,
  Label,
  theme,
  Text,
  TextArea,
  Separator,
  Button,
  css,
  CheckboxAndLabel,
  Checkbox,
  ScrollArea,
} from "@webstudio-is/design-system";
import { useEffect, useState } from "react";
import { $isProjectSettingsOpen } from "~/shared/nano-states/seo";
import { ImageControl } from "./image-control";
import { $assets, $pages } from "~/shared/nano-states";
import env from "~/shared/env";
import { Image, createImageLoader } from "@webstudio-is/image";
import { useIds } from "~/shared/form-utils";
import { serverSyncStore } from "~/shared/sync";
import { useEffectEvent } from "../ai/hooks/effect-event";
import type { Pages } from "@webstudio-is/sdk";
import { ProjectRedirectionSettings } from "./project-redirects";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

type ProjectMeta = NonNullable<Pages["meta"]>;
export type ProjectSettings = NonNullable<Pages["settings"]>;

const imgStyle = css({
  width: 72,
  height: 72,
  borderRadius: theme.borderRadius[4],
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.colors.borderMain,
});

const ProjectSettingsContentMeta = (props: {
  meta: ProjectMeta;
  onMetaChange: (value: ProjectMeta) => void;
}) => {
  const ids = useIds(["siteName", "favicon", "code"]);
  const handleChange =
    <T extends keyof ProjectMeta>(name: T) =>
    (value: ProjectMeta[T]) => {
      props.onMetaChange({
        ...props.meta,
        [name]: value,
      });
    };

  const assets = useStore($assets);
  const asset = assets.get(props.meta.faviconAssetId ?? "");

  const favIconUrl = asset ? `${asset.name}` : undefined;

  const imageLoader = createImageLoader({
    imageBaseUrl: env.IMAGE_BASE_URL,
  });

  return (
    <>
      <Grid
        gap={1}
        css={{
          mx: theme.spacing[5],
          px: theme.spacing[5],
        }}
      >
        <Label htmlFor={ids.siteName}>Project Name</Label>
        <InputField
          id={ids.siteName}
          value={props.meta.siteName ?? ""}
          onChange={(event) => handleChange("siteName")(event.target.value)}
          placeholder="Current Project Name"
          name="Name"
          autoFocus
        />
      </Grid>

      <Separator />

      <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
        <Text variant="titles">Favicon</Text>
        <Grid flow="column" gap={3}>
          <Image
            width={72}
            height={72}
            className={imgStyle()}
            src={favIconUrl}
            loader={imageLoader}
          />

          <Grid gap={2}>
            <Text color="subtle">
              Upload a 32 x 32 px image to display in browser tabs.
            </Text>
            <ImageControl onAssetIdChange={handleChange("faviconAssetId")}>
              <Button id={ids.favicon} css={{ justifySelf: "start" }}>
                Upload
              </Button>
            </ImageControl>
          </Grid>
        </Grid>
      </Grid>

      <Separator />

      <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
        <Text variant="titles">Custom Code</Text>
        <Text color="subtle">
          Custom code and scripts will be added at the end of the &lt;head&gt;
          tag to every page across the published project.
        </Text>
        <TextArea
          id={ids.code}
          rows={5}
          autoGrow
          maxRows={10}
          value={props.meta.code ?? ""}
          onChange={handleChange("code")}
        />
      </Grid>
    </>
  );
};

const ProjectAdvancedSettings = (props: {
  settings: ProjectSettings;
  onSettingsChange: (settings: ProjectSettings) => void;
}) => {
  const ids = useIds(["atomicStyles"]);

  const handleChange =
    <T extends keyof ProjectSettings>(name: T) =>
    (val: ProjectSettings[T]) => {
      props.onSettingsChange({
        ...props.settings,
        [name]: val,
      });
    };

  return (
    <>
      <Separator />
      <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
        <Text variant="titles">Publish Settings</Text>
        <CheckboxAndLabel>
          <Checkbox
            checked={props.settings.atomicStyles ?? true}
            id={ids.atomicStyles}
            onCheckedChange={(checked) => {
              if (typeof checked === "boolean") {
                handleChange("atomicStyles")(checked);
              }
            }}
          />
          <Label htmlFor={ids.atomicStyles}>
            Generate atomic CSS when publishing
          </Label>
        </CheckboxAndLabel>
      </Grid>
    </>
  );
};

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
          <Grid
            gap={2}
            css={{
              my: theme.spacing[5],
            }}
          >
            <ProjectSettingsContentMeta meta={meta} onMetaChange={setMeta} />
            <ProjectAdvancedSettings
              settings={settings}
              onSettingsChange={setSettings}
            />
            {isFeatureEnabled("redirects") ? (
              <ProjectRedirectionSettings
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
