import { useState } from "react";
import {
  Grid,
  Label,
  CheckboxAndLabel,
  Checkbox,
  Text,
  InputField,
  InputErrorsTooltip,
} from "@webstudio-is/design-system";
import type { CompilerSettings } from "@webstudio-is/sdk";
import { $pages } from "~/shared/sync/data-stores";
import { useIds } from "~/shared/form-utils";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { sectionSpacing } from "./utils";

const defaultPublishSettings: CompilerSettings = {
  atomicStyles: true,
};

const validateUrl = (url: string) => {
  if (url.trim() === "") {
    return undefined;
  }
  try {
    new URL(url);
  } catch {
    return "URL is invalid";
  }
};

export const SectionPublish = () => {
  const ids = useIds(["atomicStyles", "publisherEndpoint", "publisherToken"]);
  const [settings, setSettings] = useState(
    () => $pages.get()?.compiler ?? defaultPublishSettings
  );
  const publisherEndpoint = settings.publisherEndpoint ?? "";
  const publisherToken = settings.publisherToken ?? "";
  const publisherEndpointError = validateUrl(publisherEndpoint);

  const handleSave = (settings: CompilerSettings) => {
    serverSyncStore.createTransaction([$pages], (pages) => {
      if (pages === undefined) {
        return;
      }
      pages.compiler = settings;
    });
  };

  return (
    <Grid gap={2}>
      <Text variant="titles" css={sectionSpacing}>
        Publishing
      </Text>
      <Grid gap={2} css={sectionSpacing}>
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
      <Grid gap={2} css={sectionSpacing}>
        <Text variant="labels">Custom publishing</Text>
        <Grid gap={1}>
          <Label htmlFor={ids.publisherEndpoint}>Publisher endpoint</Label>
          <InputErrorsTooltip
            errors={
              publisherEndpointError ? [publisherEndpointError] : undefined
            }
          >
            <InputField
              id={ids.publisherEndpoint}
              color={publisherEndpointError ? "error" : undefined}
              placeholder="https://api.github.com/repos/org/repo/actions/workflows/publish.yml/dispatches"
              value={publisherEndpoint}
              onChange={(event) => {
                const nextSettings = {
                  ...settings,
                  publisherEndpoint: event.target.value,
                  publisherToken,
                };
                setSettings(nextSettings);
                if (validateUrl(nextSettings.publisherEndpoint) === undefined) {
                  handleSave(nextSettings);
                }
              }}
            />
          </InputErrorsTooltip>
        </Grid>
        <Grid gap={1}>
          <Label htmlFor={ids.publisherToken}>Publisher token</Label>
          <InputField
            id={ids.publisherToken}
            type="password"
            placeholder="GitHub token or publisher secret"
            value={publisherToken}
            onChange={(event) => {
              const nextSettings = {
                ...settings,
                publisherEndpoint,
                publisherToken: event.target.value,
              };
              setSettings(nextSettings);
              if (publisherEndpointError === undefined) {
                handleSave(nextSettings);
              }
            }}
          />
        </Grid>
        <Text color="subtle">
          When configured, publishing dispatches this endpoint instead of the
          default Webstudio deployment pipeline.
        </Text>
      </Grid>
    </Grid>
  );
};
