import { z } from "zod";
import { useId, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  Grid,
  InputField,
  Label,
  theme,
  Text,
  Separator,
  Button,
  CheckboxAndLabel,
  Checkbox,
  css,
  Flex,
  Tooltip,
  InputErrorsTooltip,
  ProBadge,
} from "@webstudio-is/design-system";
import { InfoCircleIcon } from "@webstudio-is/icons";
import { ImageControl } from "./image-control";
import { Image } from "@webstudio-is/image";
import type { ProjectMeta, CompilerSettings } from "@webstudio-is/sdk";
import { $assets, $imageLoader, $pages } from "~/shared/nano-states";
import { useIds } from "~/shared/form-utils";
import { serverSyncStore } from "~/shared/sync";
import { sectionSpacing } from "./utils";
import { CodeEditor } from "~/builder/shared/code-editor";
import { $userPlanFeatures } from "~/builder/shared/nano-states";

const imgStyle = css({
  width: 72,
  height: 72,
  borderRadius: theme.borderRadius[4],
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.colors.borderMain,
});

const defaultMetaSettings: ProjectMeta = {
  siteName: "",
  contactEmail: "",
  faviconAssetId: "",
  code: "",
};

const Email = z.string().email();

export const SectionGeneral = () => {
  const { allowContactEmail } = useStore($userPlanFeatures);
  const [meta, setMeta] = useState(
    () => $pages.get()?.meta ?? defaultMetaSettings
  );
  const siteNameId = useId();
  const contactEmailId = useId();
  const contactEmailError =
    (meta.contactEmail ?? "").trim().length === 0 ||
    Email.safeParse(meta.contactEmail).success
      ? undefined
      : "Contact email is invalid.";
  const assets = useStore($assets);
  const asset = assets.get(meta.faviconAssetId ?? "");
  const favIconUrl = asset ? `${asset.name}` : undefined;
  const imageLoader = useStore($imageLoader);

  const handleSave = <Setting extends keyof ProjectMeta>(setting: Setting) => {
    return (value: ProjectMeta[Setting]) => {
      setMeta({
        ...meta,
        [setting]: value,
      });
      serverSyncStore.createTransaction([$pages], (pages) => {
        if (pages === undefined) {
          return;
        }
        if (pages.meta === undefined) {
          pages.meta = {};
        }
        pages.meta[setting] = value;
      });
    };
  };

  return (
    <Grid gap={2}>
      <Text variant="titles" css={sectionSpacing}>
        General
      </Text>

      <Grid gap={1} css={sectionSpacing}>
        <Flex gap={1} align="center">
          <Label htmlFor={siteNameId}>Site Name</Label>
          <Tooltip
            variant="wrapped"
            content="Used in search results and social previews."
          >
            <InfoCircleIcon tabIndex={0} />
          </Tooltip>
        </Flex>
        <InputField
          id={siteNameId}
          placeholder="Current Site Name"
          autoFocus={true}
          value={meta.siteName ?? ""}
          onChange={(event) => {
            handleSave("siteName")(event.target.value);
          }}
        />
      </Grid>

      <Grid gap={1} css={sectionSpacing}>
        <Flex gap={1} align="center">
          <Label htmlFor={contactEmailId}>Contact Email</Label>
          <Tooltip
            variant="wrapped"
            content="Used as the email recipient when submitting a webhook form without an action."
          >
            <InfoCircleIcon tabIndex={0} />
          </Tooltip>
          {allowContactEmail === false && <ProBadge>Pro</ProBadge>}
        </Flex>
        <InputErrorsTooltip
          errors={contactEmailError ? [contactEmailError] : undefined}
        >
          <InputField
            id={contactEmailId}
            color={contactEmailError ? "error" : undefined}
            placeholder="email@address.com"
            disabled={allowContactEmail === false}
            value={meta.contactEmail ?? ""}
            onChange={(event) => {
              handleSave("contactEmail")(event.target.value);
            }}
          />
        </InputErrorsTooltip>
      </Grid>

      <Separator />

      <Grid gap={2} css={sectionSpacing}>
        <Label>Favicon</Label>
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
            <ImageControl onAssetIdChange={handleSave("faviconAssetId")}>
              <Button css={{ justifySelf: "start" }}>Upload</Button>
            </ImageControl>
          </Grid>
        </Grid>
      </Grid>

      <Separator />

      <Grid gap={2} css={sectionSpacing}>
        <Label>Custom Code</Label>
        <Text color="subtle">
          Custom code and scripts will be added at the end of the &lt;head&gt;
          tag to every page across the published project.
        </Text>
        <CodeEditor value={meta.code ?? ""} onChange={handleSave("code")} />
      </Grid>

      <Separator />

      <CompilerSection />
    </Grid>
  );
};

const defaultCompilerSettings: CompilerSettings = {
  atomicStyles: true,
};

const CompilerSection = () => {
  const ids = useIds(["atomicStyles"]);
  const [settings, setSettings] = useState(
    () => $pages.get()?.compiler ?? defaultCompilerSettings
  );

  const handleSave = (settings: CompilerSettings) => {
    serverSyncStore.createTransaction([$pages], (pages) => {
      if (pages === undefined) {
        return;
      }
      pages.compiler = settings;
    });
  };

  return (
    <Grid gap={2} css={sectionSpacing}>
      <Label htmlFor={ids.atomicStyles}>Compiler</Label>
      <CheckboxAndLabel>
        <Checkbox
          checked={settings.atomicStyles ?? true}
          id={ids.atomicStyles}
          onCheckedChange={(atomicStyles) => {
            if (typeof atomicStyles === "boolean") {
              const nextSettings = { ...settings, atomicStyles };
              setSettings(nextSettings);
              handleSave(nextSettings);
            }
          }}
        />
        <Label htmlFor={ids.atomicStyles}>
          Generate atomic CSS when publishing
        </Label>
      </CheckboxAndLabel>
    </Grid>
  );
};
