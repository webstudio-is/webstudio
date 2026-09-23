import { useId, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  Flex,
  Grid,
  InputErrorsTooltip,
  Label,
  LinkButton,
  ProChip,
  SmallIconButton,
  Text,
  TextArea,
  Tooltip,
  cssVar,
  theme,
} from "@webstudio-is/design-system";
import { InfoCircleIcon, ResetIcon, TrashIcon } from "@webstudio-is/icons";
import {
  customResponseHeaders,
  getResponseHeaders,
  responseHeaderDefinitions,
  type ResponseHeaderDefinition,
} from "@webstudio-is/sdk";
import { $projectSettings } from "~/shared/sync/data-stores";
import { $permissions } from "~/shared/nano-states";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { sectionSpacing } from "./utils";

const HeaderSetting = ({
  definition,
  value,
}: {
  definition: ResponseHeaderDefinition;
  value: string | null;
}) => {
  const [draft, setDraft] = useState<string>();
  const [errors, setErrors] = useState<string[]>([]);
  const valueId = useId();

  const save = (value: string | null) => {
    // Read the latest settings so saving one header preserves other edits.
    const headers = ($projectSettings.get()?.meta.customHeaders ?? []).filter(
      (header) => header.name.toLowerCase() !== definition.name.toLowerCase()
    );
    if (value?.trim() !== definition.defaultValue) {
      headers.push({ name: definition.name, value: value?.trim() ?? null });
    }
    const result = customResponseHeaders.safeParse(headers);
    if (!result.success) {
      setErrors(result.error.issues.map((issue) => issue.message));
      return;
    }
    try {
      const mutation = executeRuntimeMutation({
        id: "projectSettings.update",
        input: {
          meta: { customHeaders: result.data.length ? result.data : null },
        },
      });
      if (mutation !== undefined) {
        setDraft(undefined);
        setErrors([]);
        return;
      }
    } catch {
      // Keep the draft available for retry after a failed runtime mutation.
    }
    setErrors(["Changes could not be saved. Please try again."]);
  };

  return (
    <Grid gap={1}>
      <Flex
        justify="between"
        align="center"
        css={{ minHeight: theme.spacing[9] }}
      >
        <Label htmlFor={valueId}>{definition.name}</Label>
        <Flex gap={1}>
          {(value !== definition.defaultValue || draft !== undefined) && (
            <Tooltip content="Reset to default">
              <SmallIconButton
                icon={<ResetIcon fill="currentColor" />}
                aria-label={`Reset ${definition.name} to default`}
                onClick={() => save(definition.defaultValue)}
              />
            </Tooltip>
          )}
          {!definition.required && value !== null && (
            <Tooltip content="Remove header">
              <SmallIconButton
                variant="destructive"
                icon={<TrashIcon />}
                aria-label={`Remove ${definition.name}`}
                onClick={() => save(null)}
              />
            </Tooltip>
          )}
        </Flex>
      </Flex>
      <InputErrorsTooltip errors={errors.length ? errors : undefined}>
        <TextArea
          id={valueId}
          variant="mono"
          rows={1}
          maxRows={4}
          autoGrow
          value={draft ?? value ?? ""}
          placeholder="Not sent"
          disabled={value === null}
          color={errors.length ? "error" : undefined}
          aria-invalid={errors.length > 0}
          onChange={(value) => {
            setDraft(value);
            setErrors([]);
          }}
          onBlur={() => {
            if (draft !== undefined) {
              save(draft);
            }
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) {
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setDraft(undefined);
              setErrors([]);
            }
          }}
        />
      </InputErrorsTooltip>
    </Grid>
  );
};

export const SectionHeaders = () => {
  const { allowDynamicData } = useStore($permissions);
  const settings = useStore($projectSettings);
  const headers = getResponseHeaders(settings?.meta.customHeaders);
  return (
    <Grid gap={3} css={sectionSpacing}>
      <Flex align="center" gap={1}>
        <Text variant="titles">Headers</Text>
        {allowDynamicData === false && <ProChip>Pro</ProChip>}
        <Tooltip
          variant="wrapped"
          content={
            <>
              <Text>
                Configure your site's HTTP security headers. Changes are saved
                when you leave a field. Publish to apply them to your site.
              </Text>
              <br />
              <Text>
                All headers are required except X-Frame-Options, which can be
                removed. Reset restores a header's default value.
              </Text>
              {allowDynamicData === false && (
                <>
                  <br />
                  <Text>
                    Customizing headers on a custom domain requires Pro. Default
                    values and staging are free.
                  </Text>
                  <LinkButton
                    color="primary"
                    css={{ marginTop: theme.spacing[5], width: "100%" }}
                    href="https://webstudio.is/pricing"
                    target="_blank"
                  >
                    Upgrade
                  </LinkButton>
                </>
              )}
            </>
          }
        >
          <InfoCircleIcon
            color={cssVar("--foreground-secondary")}
            tabIndex={0}
            aria-label="About response headers"
          />
        </Tooltip>
      </Flex>
      {responseHeaderDefinitions.map((definition, index) => (
        <HeaderSetting
          key={definition.name}
          definition={definition}
          value={headers[index].value}
        />
      ))}
    </Grid>
  );
};
