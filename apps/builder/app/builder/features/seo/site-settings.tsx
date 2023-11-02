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
} from "@webstudio-is/design-system";
import { useEffect, useState } from "react";
import { $isSiteSettigsOpen } from "~/shared/nano-states/seo";
import { ImageControl } from "./image-control";
import { assetsStore, pagesStore } from "~/shared/nano-states";
import env from "~/shared/env";
import { Image, createImageLoader } from "@webstudio-is/image";
import { useIds } from "~/shared/form-utils";
import { serverSyncStore } from "~/shared/sync";
import { useEffectEvent } from "../ai/hooks/effect-event";
import type { Pages } from "@webstudio-is/sdk";

type Value = NonNullable<Pages["meta"]>;

type Props = {
  value: Value;
  onChange: (value: Value) => void;
};

const imgStyle = css({
  width: 72,
  height: 72,
  borderRadius: theme.borderRadius[4],
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.colors.borderMain,
});

const SiteSettingsContent = (props: Props) => {
  const ids = useIds(["siteName", "favicon", "code"]);
  const handleChange =
    <T extends keyof Value>(name: T) =>
    (val: Value[T]) => {
      props.onChange({
        ...props.value,
        [name]: val,
      });
    };

  const assets = useStore(assetsStore);
  const asset = assets.get(props.value.faviconAssetId ?? "");

  const favIconUrl = asset ? `${asset.name}` : undefined;

  const imageLoader = createImageLoader({
    imageBaseUrl: env.ASSET_BASE_URL,
  });

  return (
    <Grid
      gap={2}
      css={{
        my: theme.spacing[5],
      }}
    >
      <Grid
        gap={1}
        css={{
          width: theme.spacing[34],
          mx: theme.spacing[5],
          px: theme.spacing[5],
        }}
      >
        <Label htmlFor={ids.siteName}>Site Name</Label>
        <InputField
          id={ids.siteName}
          value={props.value.siteName ?? ""}
          onChange={(event) => handleChange("siteName")(event.target.value)}
          placeholder="Current Site Name"
          name="Name"
          autoFocus
        />
      </Grid>

      <Separator />

      <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
        <Label htmlFor={ids.favicon} sectionTitle>
          Favicon
        </Label>
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
            <ImageControl
              assetId={props.value.faviconAssetId ?? ""}
              onAssetIdChange={handleChange("faviconAssetId")}
            >
              <Button id={ids.favicon} css={{ justifySelf: "start" }}>
                Upload
              </Button>
            </ImageControl>
          </Grid>
        </Grid>
      </Grid>

      <Separator />

      <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
        <Label htmlFor={ids.code} sectionTitle>
          Custom Code
        </Label>
        <Text color="subtle">
          Custom code and scripts will be added at the end of the &lt;head&gt;
          tag to every page across the published site.
        </Text>
        <TextArea
          id={ids.code}
          rows={5}
          autoGrow
          maxRows={10}
          value={props.value.code ?? ""}
          onChange={handleChange("code")}
        />
      </Grid>
      <div />
    </Grid>
  );
};

const SiteSettingsView = () => {
  const [value, setValue] = useState(
    pagesStore.get()?.meta ?? {
      siteName: "",
      faviconAssetId: "",
      code: "",
    }
  );

  const isOpen = useStore($isSiteSettigsOpen);

  const handleSave = useEffectEvent(() => {
    serverSyncStore.createTransaction([pagesStore], (pages) => {
      if (pages === undefined) {
        return;
      }

      pages.meta = value;
    });
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        handleSave();
        $isSiteSettigsOpen.set(isOpen);
      }}
    >
      <DialogContent
        onBlur={handleSave}
        // Left Aside panels (e.g., Pages, Components) use zIndex: theme.zIndices[1].
        // For a dialog to appear above these panels, both overlay and content should also have zIndex: theme.zIndices[1].
        css={{
          zIndex: theme.zIndices[1],
        }}
        overlayCss={{
          zIndex: theme.zIndices[1],
        }}
      >
        <SiteSettingsContent value={value} onChange={setValue} />
        {/* Title is at the end intentionally,
         * to make the close button last in the tab order
         */}
        <DialogTitle>Site Settings</DialogTitle>
      </DialogContent>
    </Dialog>
  );
};

export const SiteSettings = () => {
  const [settingDialogLazyOpen, setSettingDialogLazyOpen] = useState(false);

  useEffect(() => {
    return $isSiteSettigsOpen.subscribe((isOpen) => {
      if (isOpen) {
        setSettingDialogLazyOpen(true);
      }
    });
  }, []);

  if (settingDialogLazyOpen === false) {
    return null;
  }

  return <SiteSettingsView />;
};
