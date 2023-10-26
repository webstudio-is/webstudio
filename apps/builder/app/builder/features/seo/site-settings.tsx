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
import { assetsStore } from "~/shared/nano-states";
import env from "~/shared/env";
import { Image, createImageLoader } from "@webstudio-is/image";

type Value = {
  siteName: string;
  faviconAssetId: string;
  customCode: string;
};
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
  const handleChange =
    <T extends keyof Value>(name: T) =>
    (val: Value[T]) => {
      props.onChange({
        ...props.value,
        [name]: val,
      });
    };

  const assets = useStore(assetsStore);
  const asset = assets.get(props.value.faviconAssetId);

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
        <Label>Site Name</Label>
        <InputField
          value={props.value.siteName}
          onChange={(event) => handleChange("siteName")(event.target.value)}
          placeholder="Current Site Name"
          name="Name"
          autoFocus
        />
      </Grid>

      <Separator />

      <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
        <Label sectionTitle>Favicon</Label>
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
              assetId={props.value.faviconAssetId}
              onAssetIdChange={handleChange("faviconAssetId")}
            >
              <Button css={{ justifySelf: "start" }}>Upload</Button>
            </ImageControl>
          </Grid>
        </Grid>
      </Grid>

      <Separator />

      <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
        <Label sectionTitle>Custom Code</Label>
        <Text color="subtle">
          Custom code and scripts will be added at the end of the &lt;head&gt;
          tag to every page across the published site.
        </Text>
        <TextArea
          rows={5}
          autoGrow
          maxRows={10}
          value={props.value.customCode}
          onChange={handleChange("customCode")}
        />
      </Grid>
      <div />
    </Grid>
  );
};

export const SiteSettings = () => {
  const [value, setValue] = useState({
    siteName: "",
    faviconAssetId: "",
    customCode: "",
  });

  const open = useStore($isSiteSettigsOpen);

  const handleSave = () => {
    // @todo: Next PR
    // eslint-disable-next-line no-console
    console.info("Save is not implemented");
  };

  useEffect(() => handleSave, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        handleSave();
        $isSiteSettigsOpen.set(isOpen);
      }}
    >
      <DialogContent onBlur={handleSave}>
        <SiteSettingsContent value={value} onChange={setValue} />
        {/* Title is at the end intentionally,
         * to make the close button last in the tab order
         */}
        <DialogTitle>Site Settings</DialogTitle>
      </DialogContent>
    </Dialog>
  );
};
