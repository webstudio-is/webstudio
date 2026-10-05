import { useStore } from "@nanostores/react";
import {
  Box,
  CssValueListArrowFocus,
  CssValueListItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Flex,
  Grid,
  Label,
  SmallIconButton,
  SmallToggleButton,
  Text,
  Tooltip,
  useSortable,
  theme,
} from "@webstudio-is/design-system";
import {
  EyeClosedIcon,
  EyeOpenIcon,
  MinusIcon,
  PlusIcon,
} from "@webstudio-is/icons";
import {
  isFormSubmission,
  maxFormDestinations,
  validateFormSubmission,
  type FormSubmission,
  type DataSource,
} from "@webstudio-is/sdk";
import { findAvailableVariables } from "@webstudio-is/project-build/runtime";
import {
  $dataSources,
  $instances,
  $resources,
} from "~/shared/sync/data-stores";
import { VariablePopoverTrigger } from "../variable-popover";
import { type ControlProps } from "../shared";

const ActionItem = ({
  id,
  index,
  variable,
  formInstanceId,
  isEnabled,
  active,
  onToggle,
  onRemove,
}: {
  id: string;
  index: number;
  variable?: DataSource;
  formInstanceId: string;
  isEnabled: boolean;
  active: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) => {
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
      draggable
      active={active}
      label={
        <Label tag="label" color={source} truncate>
          {name}
        </Label>
      }
      buttons={
        <>
          <Tooltip content={isEnabled ? "Disable action" : "Enable action"}>
            <SmallToggleButton
              tabIndex={-1}
              variant="normal"
              pressed={!isEnabled}
              aria-label={`${isEnabled ? "Disable" : "Enable"} action ${name}`}
              icon={isEnabled ? <EyeOpenIcon /> : <EyeClosedIcon />}
              onPressedChange={onToggle}
            />
          </Tooltip>
          <SmallIconButton
            tabIndex={-1}
            variant="destructive"
            aria-label={`Remove action ${name}`}
            icon={<MinusIcon />}
            onClick={onRemove}
          />
        </>
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
  const resourcesById = useStore($resources);
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
  }).filter((variable) => {
    if (variable.type !== "resource") {
      return false;
    }
    const resource = resourcesById.get(variable.resourceId);
    return resource !== undefined && resource.control !== "system";
  });
  const update = (next: FormSubmission) =>
    onChange({ type: "json", value: next });
  const { dragItemId, placementIndicator, sortableRefCallback } = useSortable({
    items: submission.destinations.map((id) => ({ id })),
    onSort: (newIndex, oldIndex) => {
      const destinations = [...submission.destinations];
      const [moved] = destinations.splice(oldIndex, 1);
      destinations.splice(newIndex, 0, moved);
      update({ ...submission, destinations });
    },
  });
  const error = invalidSavedValue
    ? "Invalid Form submission settings"
    : validateFormSubmission(submission);

  return (
    <Box>
      <Flex align="center" justify="between">
        <Label>Actions</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SmallIconButton
              aria-label="Add action"
              disabled={
                submission.destinations.length >= maxFormDestinations ||
                resources.length === 0
              }
              icon={<PlusIcon />}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {resources.map((variable) => (
              <DropdownMenuItem
                key={variable.id}
                disabled={submission.destinations.includes(variable.id)}
                onSelect={() => {
                  if (
                    submission.destinations.length < maxFormDestinations &&
                    !submission.destinations.includes(variable.id)
                  ) {
                    update({
                      ...submission,
                      destinations: [...submission.destinations, variable.id],
                    });
                  }
                }}
              >
                {variable.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </Flex>
      <Box css={{ py: theme.spacing[2] }}>
        <Flex direction="column" gap="2">
          {submission.destinations.length > 0 && (
            <CssValueListArrowFocus dragItemId={dragItemId}>
              <Grid ref={sortableRefCallback}>
                {submission.destinations.map((id, index) => (
                  <ActionItem
                    key={id}
                    id={id}
                    index={index}
                    variable={dataSources.get(id)}
                    formInstanceId={instanceId}
                    isEnabled={!submission.disabledDestinations?.includes(id)}
                    active={dragItemId === id}
                    onToggle={() => {
                      const disabled = new Set(submission.disabledDestinations);
                      if (disabled.has(id)) {
                        disabled.delete(id);
                      } else {
                        disabled.add(id);
                      }
                      update({
                        ...submission,
                        disabledDestinations:
                          disabled.size === 0 ? undefined : [...disabled],
                      });
                    }}
                    onRemove={() =>
                      update({
                        ...submission,
                        destinations: submission.destinations.filter(
                          (selected) => selected !== id
                        ),
                        disabledDestinations:
                          submission.disabledDestinations?.filter(
                            (selected) => selected !== id
                          ),
                      })
                    }
                  />
                ))}
                {placementIndicator}
              </Grid>
            </CssValueListArrowFocus>
          )}
          {resources.length === 0 && (
            <Text>Create a Resource in Data variables to add an action.</Text>
          )}
          {error && <Text>{error}</Text>}
        </Flex>
      </Box>
    </Box>
  );
};
