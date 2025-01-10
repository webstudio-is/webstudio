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
  css,
  Flex,
  Tooltip,
  InputErrorsTooltip,
  ProBadge,
  TextArea,
  IconButton,
} from "@webstudio-is/design-system";
import { CopyIcon, InfoCircleIcon } from "@webstudio-is/icons";
import { Image, wsImageLoader } from "@webstudio-is/image";
import type { ProjectMeta } from "@webstudio-is/sdk";
import { ImageControl } from "./image-control";
import {
  $assets,
  $pages,
  $project,
  $userPlanFeatures,
} from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";
import { sectionSpacing } from "./utils";
import { CodeEditor } from "~/builder/shared/code-editor";
import { CopyToClipboard } from "~/builder/shared/copy-to-clipboard";

const imgStyle = css({
  objectFit: "contain",
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

const validateContactEmail = (
  contactEmail: string,
  maxContactEmails: number
) => {
  contactEmail = contactEmail.trim();
  if (contactEmail.length === 0) {
    return;
  }
  const emails = contactEmail.split(/\s*,\s*/);
  if (emails.length > maxContactEmails) {
    return `Only ${maxContactEmails} emails are allowed.`;
  }
  if (emails.every((email) => Email.safeParse(email).success) === false) {
    return "Contact email is invalid.";
  }
};

const saveSetting = <Name extends keyof ProjectMeta>(
  name: keyof ProjectMeta,
  value: ProjectMeta[Name]
) => {
  serverSyncStore.createTransaction([$pages], (pages) => {
    if (pages === undefined) {
      return;
    }
    if (pages.meta === undefined) {
      pages.meta = {};
    }
    pages.meta[name] = value;
  });
};

export const SectionGeneral = () => {
  const { maxContactEmails } = useStore($userPlanFeatures);
  const allowContactEmail = maxContactEmails > 0;
  const [meta, setMeta] = useState(
    () => $pages.get()?.meta ?? defaultMetaSettings
  );
  const siteNameId = useId();
  const contactEmailId = useId();
  const contactEmailError = validateContactEmail(
    meta.contactEmail ?? "",
    maxContactEmails
  );
  const assets = useStore($assets);
  const asset = assets.get(meta.faviconAssetId ?? "");
  const favIconUrl = asset ? `${asset.name}` : undefined;
  const project = $project.get();

  if (project === undefined) {
    return;
  }

  const handleSave = <Name extends keyof ProjectMeta>(
    name: keyof ProjectMeta
  ) => {
    return (value: ProjectMeta[Name]) => {
      setMeta({ ...meta, [name]: value });
      saveSetting(name, value);
    };
  };

  return (
    <Grid gap={2}>
      <Text variant="titles" css={sectionSpacing}>
        General
      </Text>

      <Grid gap={1} css={sectionSpacing}>
        <Flex gap={1} align="center">
          <Text variant="labelsSentenceCase">Project ID:</Text>
          <Text userSelect="text">{project.id}</Text>
          <CopyToClipboard text={project.id} copyText="Copy ID">
            <IconButton aria-label="Copy ID">
              <CopyIcon aria-hidden />
            </IconButton>
          </CopyToClipboard>
        </Flex>
      </Grid>

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
          <TextArea
            id={contactEmailId}
            color={contactEmailError ? "error" : undefined}
            placeholder="john@company.com, jane@company.com"
            disabled={allowContactEmail === false}
            autoGrow={true}
            rows={1}
            value={meta.contactEmail ?? ""}
            onChange={(value) => {
              setMeta({ ...meta, contactEmail: value });
              if (validateContactEmail(value, maxContactEmails) === undefined) {
                saveSetting("contactEmail", value);
              }
            }}
          />
        </InputErrorsTooltip>
      </Grid>

      <Separator />

      <Grid gap={2} css={sectionSpacing} justify={"start"}>
        <Label>Favicon</Label>
        <Grid flow="column" gap={3}>
          <Image
            width={72}
            height={72}
            className={imgStyle()}
            src={favIconUrl}
            loader={wsImageLoader}
          />

          <Grid gap={2}>
            <Text color="subtle">
              Upload a square image to display in browser tabs.
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
        <CodeEditor
          title="Custom code"
          lang="html"
          value={meta.code ?? ""}
          onChange={handleSave("code")}
          onChangeComplete={handleSave("code")}
        />
      </Grid>
    </Grid>
  );
};
