import { useState } from "react";
import { useStore } from "@nanostores/react";
import {
  Button,
  Chip,
  CssValueListArrowFocus,
  CssValueListItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Flex,
  Label,
  Select,
  SmallIconButton,
  Text,
} from "@webstudio-is/design-system";
import { EllipsesIcon } from "@webstudio-is/icons";
import {
  isFormSubmission,
  maxFormDestinations,
  validateFormSubmission,
  type FormSubmission,
  findTreeInstanceIds,
  type DataSource,
} from "@webstudio-is/sdk";
import { findAvailableVariables } from "@webstudio-is/project-build/runtime";
import { $dataSources, $instances, $props } from "~/shared/sync/data-stores";
import { VariablePopoverTrigger } from "../variable-popover";
import { type ControlProps, VerticalLayout } from "../shared";
import { PropertyLabel } from "../property-label";

const ActionItem = ({
  id,
  index,
  variable,
  formInstanceId,
  onRemove,
}: {
  id: string;
  index: number;
  variable?: DataSource;
  formInstanceId: string;
  onRemove: () => void;
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isResource = variable?.type === "resource";
  const name = isResource ? variable.name : "Deleted Resource";
  const source = isResource
    ? variable.scopeInstanceId === formInstanceId
      ? "local"
      : "remote"
    : "default";
  const item = (
    <CssValueListItem
      id={id}
      index={index}
      aria-label={isResource ? `Edit action ${name}` : `Remove missing action`}
      onClick={isResource ? undefined : () => setIsMenuOpen(true)}
      data-state={isMenuOpen ? "open" : undefined}
      label={
        <Label tag="label" color={source} truncate>
          {name}
        </Label>
      }
      suffix={
        isResource ? (
          <Chip
            title="Dynamic data variable"
            aria-label="Dynamic data variable"
          >
            D
          </Chip>
        ) : undefined
      }
      buttons={
        <DropdownMenu modal open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <SmallIconButton
              tabIndex={-1}
              aria-label={`Open action menu for ${name}`}
              icon={<EllipsesIcon />}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={onRemove}>
              Remove action
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
  return isResource ? (
    <VariablePopoverTrigger variable={variable} formDestination>
      {item}
    </VariablePopoverTrigger>
  ) : (
    item
  );
};

export const FormSubmissionControl = ({
  instanceId,
  prop,
  onChange,
}: ControlProps<"form-submission">) => {
  const instances = useStore($instances);
  const dataSources = useStore($dataSources);
  const props = useStore($props);
  const [selectedId, setSelectedId] = useState<string>();
  const invalidSavedValue =
    prop !== undefined &&
    (prop.type !== "json" || isFormSubmission(prop.value) === false);
  const submission: FormSubmission =
    prop?.type === "json" && isFormSubmission(prop.value)
      ? prop.value
      : { destinations: [] };
  const resources = findAvailableVariables({
    startingInstanceId: instanceId,
    instances,
    dataSources,
  }).filter((variable) => variable.type === "resource");
  const available = resources.filter(
    ({ id }) => submission.destinations.includes(id) === false
  );
  const update = (next: FormSubmission) =>
    onChange({ type: "json", value: next });
  const descendantIds = new Set(findTreeInstanceIds(instances, instanceId));
  const attributes = new Map<
    string,
    { name?: string; type?: string; tag?: string }
  >();
  for (const fieldProp of props.values()) {
    if (
      descendantIds.has(fieldProp.instanceId) &&
      fieldProp.type === "string" &&
      (fieldProp.name === "name" ||
        fieldProp.name === "type" ||
        fieldProp.name === "tag")
    ) {
      const entry = attributes.get(fieldProp.instanceId) ?? {};
      entry[fieldProp.name] = fieldProp.value;
      attributes.set(fieldProp.instanceId, entry);
    }
  }
  const emailFields = Array.from(attributes.entries())
    .filter(
      ([id, attributes]) =>
        (instances.get(id)?.tag === "input" ||
          attributes.tag === "input" ||
          instances.get(id)?.component === "Input") &&
        attributes.type === "email" &&
        Boolean(attributes.name)
    )
    .map(([, attributes]) => attributes.name!);
  const emailFieldOptions = Array.from(new Set(emailFields));
  const error = invalidSavedValue
    ? "Invalid Form submission settings"
    : (validateFormSubmission(submission) ??
      (submission.confirmationEmailField &&
      !emailFieldOptions.includes(submission.confirmationEmailField)
        ? "Selected visitor confirmation email field is unavailable"
        : undefined));

  return (
    <VerticalLayout label={<PropertyLabel name="submission" />}>
      <Flex direction="column" gap="2">
        {submission.destinations.length > 0 && (
          <CssValueListArrowFocus>
            {submission.destinations.map((id, index) => (
              <ActionItem
                key={id}
                id={id}
                index={index}
                variable={dataSources.get(id)}
                formInstanceId={instanceId}
                onRemove={() =>
                  update({
                    ...submission,
                    destinations: submission.destinations.filter(
                      (selected) => selected !== id
                    ),
                  })
                }
              />
            ))}
          </CssValueListArrowFocus>
        )}
        {submission.destinations.length < maxFormDestinations && (
          <Flex direction="column" gap="2">
            {available.length > 0 && (
              <Flex gap="2">
                <Select
                  fullWidth
                  value={selectedId}
                  placeholder="Select Resource"
                  options={available.map(({ id }) => id)}
                  getLabel={(id) =>
                    dataSources.get(id)?.name ?? "Deleted Resource"
                  }
                  onChange={setSelectedId}
                />
                <Button
                  type="button"
                  disabled={!selectedId}
                  onClick={() => {
                    if (
                      selectedId &&
                      available.some(({ id }) => id === selectedId)
                    ) {
                      update({
                        ...submission,
                        destinations: [...submission.destinations, selectedId],
                      });
                      setSelectedId(undefined);
                    }
                  }}
                >
                  Add
                </Button>
              </Flex>
            )}
            <VariablePopoverTrigger
              defaultType="resource"
              formDestination
              onCreatedResource={(id) => {
                if (
                  submission.destinations.length < maxFormDestinations &&
                  submission.destinations.includes(id) === false
                ) {
                  update({
                    ...submission,
                    destinations: [...submission.destinations, id],
                  });
                }
              }}
            >
              <Button type="button" color="ghost">
                Create Resource in Form
              </Button>
            </VariablePopoverTrigger>
          </Flex>
        )}
        <Text>Visitor confirmation email field (optional)</Text>
        {emailFieldOptions.length > 0 && (
          <Select
            fullWidth
            value={submission.confirmationEmailField || undefined}
            placeholder="Off"
            options={emailFieldOptions}
            getLabel={(name) => name}
            onChange={(name) =>
              update({ ...submission, confirmationEmailField: name })
            }
          />
        )}
        {submission.confirmationEmailField && (
          <Button
            type="button"
            color="ghost"
            onClick={() =>
              update({ ...submission, confirmationEmailField: undefined })
            }
          >
            Turn confirmation off
          </Button>
        )}
        {error && <Text>{error}</Text>}
      </Flex>
    </VerticalLayout>
  );
};
