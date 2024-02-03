import { useStore } from "@nanostores/react";
import {
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
import { ImageControl } from "./image-control";
import { $assets } from "~/shared/nano-states";
import env from "~/shared/env";
import { Image, createImageLoader } from "@webstudio-is/image";
import { useIds } from "~/shared/form-utils";
import type { ProjectMeta } from "@webstudio-is/sdk";

const imgStyle = css({
  width: 72,
  height: 72,
  borderRadius: theme.borderRadius[4],
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.colors.borderMain,
});

export const MetaSection = (props: {
  meta: ProjectMeta;
  onMetaChange: (value: ProjectMeta) => void;
}) => {
  const ids = useIds(["siteName", "favicon", "code"]);
  const handleChange =
    <Name extends keyof ProjectMeta>(name: Name) =>
    (value: ProjectMeta[Name]) => {
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
