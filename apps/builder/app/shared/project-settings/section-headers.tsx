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
  type CustomResponseHeader,
} from "@webstudio-is/sdk";
import { $projectSettings } from "~/shared/sync/data-stores";
import { $permissions } from "~/shared/nano-states";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { sectionSpacing } from "./utils";

export const SectionHeaders = () => {
  const { allowDynamicData } = useStore($permissions);
  const settings = useStore($projectSettings);
  const headers = settings?.meta.customHeaders ?? [];
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [remove, setRemove] = useState(false);
  const [editing, setEditing] = useState<string>();
  const [errors, setErrors] = useState<string[]>([]);
  const nameId = useId();
  const valueId = useId();
  const removeId = useId();
  const errorsId = useId();

  const reset = () => {
    setName("");
    setValue("");
    setRemove(false);
    setEditing(undefined);
    setErrors([]);
  };

  const save = (nextHeaders: CustomResponseHeader[]) => {
    const result = customResponseHeaders.safeParse(nextHeaders);
    if (!result.success) {
      setErrors(result.error.issues.map((issue) => issue.message));
      return false;
    }
    const mutation = executeRuntimeMutation({
      id: "projectSettings.update",
      input: {
        meta: { customHeaders: result.data.length ? result.data : null },
      },
    });
    if (mutation === undefined) {
      setErrors(["Changes could not be saved. Please try again."]);
      return false;
    }
    setErrors([]);
    return true;
  };

  return (
    <Grid gap={3}>
      <Grid gap={2} css={sectionSpacing}>
        <Flex align="center" gap={1}>
          <Text variant="titles">Headers</Text>
          {allowDynamicData === false && <ProChip>PRO</ProChip>}
        </Flex>
        <Text color="subtle">
          Set or remove HTTP response headers for your site. Publish to apply
          changes.
        </Text>
        {allowDynamicData === false && (
          <>
            <Text color="subtle">
              Publishing custom headers to a custom domain requires Pro. Staging
              is free.
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
        <Label htmlFor={nameId}>Header name</Label>
        <InputField
          id={nameId}
          placeholder="Content-Security-Policy"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-describedby={errors.length ? errorsId : undefined}
        />
        <CheckboxAndLabel>
          <Checkbox
            id={removeId}
            checked={remove}
            onCheckedChange={(checked) => setRemove(checked === true)}
          />
          <Label htmlFor={removeId}>Remove header</Label>
        </CheckboxAndLabel>
        {!remove && (
          <>
            <Label htmlFor={valueId}>Header value</Label>
            <InputField
              id={valueId}
              placeholder="frame-ancestors 'self' https://example.com"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-describedby={errors.length ? errorsId : undefined}
            />
          </>
        )}
        {errors.length > 0 && (
          <Text id={errorsId} role="alert">
            {errors.join(". ")}
          </Text>
        )}
        <Flex gap={2}>
          <Button
            onClick={() => {
              if (
                editing !== undefined &&
                !headers.some((current) => current.name === editing)
              ) {
                setEditing(undefined);
                setErrors([
                  "This header was removed or renamed. Review the current headers before adding it again.",
                ]);
                return;
              }
              const header = {
                name: name.trim(),
                value: remove ? null : value,
              };
              if (
                save(
                  editing === undefined
                    ? [...headers, header]
                    : headers.map((current) =>
                        current.name === editing ? header : current
                      )
                )
              ) {
                reset();
              }
            }}
          >
            {editing === undefined ? "Add header" : "Save header"}
          </Button>
          {editing !== undefined && (
            <Button color="ghost" onClick={reset}>
              Cancel
            </Button>
          )}
        </Flex>
      </Grid>
      <Separator />
      <Grid gap={3} css={sectionSpacing}>
        {headers.length === 0 && (
          <Text color="subtle">No headers configured.</Text>
        )}
        {headers.map((header) => (
          <Grid key={header.name} gap={1}>
            <Text variant="labels" css={{ overflowWrap: "anywhere" }}>
              {header.name}
            </Text>
            <Text color="subtle" css={{ overflowWrap: "anywhere" }}>
              {header.value === null
                ? "Remove header"
                : header.value === ""
                  ? "Empty value"
                  : header.value}
            </Text>
            <Flex gap={2}>
              <Button
                color="ghost"
                aria-label={`Edit ${header.name}`}
                onClick={() => {
                  setName(header.name);
                  setValue(header.value ?? "");
                  setRemove(header.value === null);
                  setEditing(header.name);
                  setErrors([]);
                }}
              >
                Edit
              </Button>
              <Button
                color="ghost"
                aria-label={`Delete ${header.name} configuration`}
                onClick={() => {
                  if (
                    save(headers.filter((current) => current !== header)) &&
                    editing === header.name
                  ) {
                    reset();
                  }
                }}
              >
                Delete rule
              </Button>
            </Flex>
          </Grid>
        ))}
      </Grid>
    </Grid>
  );
};
