import { useId, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  Button,
  Checkbox,
  CheckboxAndLabel,
  Flex,
  Grid,
  InputField,
  Label,
  LinkButton,
  ProChip,
  Separator,
  Text,
} from "@webstudio-is/design-system";
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [remove, setRemove] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const valueId = useId();
  const removeId = useId();
  const errorsId = useId();

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
    const mutation = executeRuntimeMutation({
      id: "projectSettings.update",
      input: {
        meta: { customHeaders: result.data.length ? result.data : null },
      },
    });
    if (mutation === undefined) {
      setErrors(["Changes could not be saved. Please try again."]);
      return;
    }
    setEditing(false);
    setErrors([]);
  };

  return (
    <Grid gap={2} css={sectionSpacing}>
      <Flex gap={2} align="center">
        <Text variant="labels">{definition.name}</Text>
        {definition.required && <Text color="subtle">Required</Text>}
      </Flex>
      {editing ? (
        <>
          {!definition.required && (
            <CheckboxAndLabel>
              <Checkbox
                id={removeId}
                checked={remove}
                onCheckedChange={(checked) => setRemove(checked === true)}
              />
              <Label htmlFor={removeId}>Remove header</Label>
            </CheckboxAndLabel>
          )}
          {!remove && (
            <>
              <Label htmlFor={valueId}>Value</Label>
              <InputField
                id={valueId}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                aria-describedby={errors.length ? errorsId : undefined}
              />
            </>
          )}
          <Flex gap={2}>
            <Button onClick={() => save(remove ? null : draft)}>Save</Button>
            <Button
              color="ghost"
              onClick={() => {
                setEditing(false);
                setErrors([]);
              }}
            >
              Cancel
            </Button>
          </Flex>
        </>
      ) : (
        <>
          <Text color="subtle" css={{ overflowWrap: "anywhere" }}>
            {value ?? "Removed"}
          </Text>
          <Flex gap={2}>
            <Button
              color="ghost"
              aria-label={`Edit ${definition.name}`}
              onClick={() => {
                setDraft(value ?? definition.defaultValue);
                setRemove(value === null && !definition.required);
                setEditing(true);
                setErrors([]);
              }}
            >
              Edit
            </Button>
            {value !== definition.defaultValue && (
              <Button
                color="ghost"
                aria-label={`Reset ${definition.name}`}
                onClick={() => save(definition.defaultValue)}
              >
                Reset to default
              </Button>
            )}
          </Flex>
        </>
      )}
      {errors.length > 0 && (
        <Text id={errorsId} role="alert">
          {errors.join(". ")}
        </Text>
      )}
    </Grid>
  );
};

export const SectionHeaders = () => {
  const { allowDynamicData } = useStore($permissions);
  const settings = useStore($projectSettings);
  const headers = getResponseHeaders(settings?.meta.customHeaders);
  return (
    <Grid gap={3}>
      <Grid gap={2} css={sectionSpacing}>
        <Flex align="center" gap={1}>
          <Text variant="titles">Headers</Text>
          {allowDynamicData === false && <ProChip>PRO</ProChip>}
        </Flex>
        <Text color="subtle">
          Configure HTTP response headers for your site. Required headers can be
          edited but cannot be removed. Publish to apply changes.
        </Text>
        {allowDynamicData === false && (
          <>
            <Text color="subtle">
              Customizing headers on a custom domain requires Pro. Default
              values and staging are free.
            </Text>
            <LinkButton
              color="primary"
              href="https://webstudio.is/pricing"
              target="_blank"
            >
              Upgrade
            </LinkButton>
          </>
        )}
      </Grid>
      {responseHeaderDefinitions.map((definition, index) => (
        <Grid key={definition.name} gap={3}>
          <Separator />
          <HeaderSetting definition={definition} value={headers[index].value} />
        </Grid>
      ))}
    </Grid>
  );
};
