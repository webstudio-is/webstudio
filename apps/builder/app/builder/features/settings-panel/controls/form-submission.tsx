import { useStore } from "@nanostores/react";
import {
  Box,
  cssVar,
  CssValueListArrowFocus,
  CssValueListItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Flex,
  Grid,
  SmallIconButton,
  SmallToggleButton,
  Text,
  Tooltip,
  useSortable,
  theme,
} from "@webstudio-is/design-system";
import {
  AlertIcon,
  EyeClosedIcon,
  EyeOpenIcon,
  MinusIcon,
  PlusIcon,
} from "@webstudio-is/icons";
import {
  isFormSubmission,
  emptyFormDestinationMessage,
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
import { type ControlProps } from "../shared";
import { FieldLabel } from "../property-label";
import { showVariable } from "../variable-navigation";

const ActionItem = ({
  id,
  index,
  variable,
  isEnabled,
  active,
  onToggle,
  onRemove,
}: {
  id: string;
  index: number;
  variable?: DataSource;
  isEnabled: boolean;
  active: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) => {
  const isResource = variable?.type === "resource";
  const name = isResource ? variable.name : "Deleted Resource";
  return (
    <CssValueListItem
      id={id}
      index={index}
      aria-label={`Action ${name}`}
      draggable
      active={active}
      css={{ opacity: isEnabled ? undefined : 0.2 }}
      onClick={(event) => {
        const target = event.target;
        if (
          isResource &&
          target instanceof Element &&
          target.closest("[data-drag-handle]") === null &&
          event.defaultPrevented === false
        ) {
          showVariable(id);
        }
      }}
      label={
        <Text variant="labels" truncate>
          {name}
        </Text>
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
              onClick={(event) => event.stopPropagation()}
              onPressedChange={onToggle}
            />
          </Tooltip>
          <SmallIconButton
            tabIndex={-1}
            variant="destructive"
            aria-label={`Remove action ${name}`}
            icon={<MinusIcon />}
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
          />
        </>
      }
    />
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
  const action: FormSubmission =
    prop?.type === "json" && isFormSubmission(prop.value) ? prop.value : [];
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
    items: action.map(({ dataSourceId }) => ({ id: dataSourceId })),
    onSort: (newIndex, oldIndex) => {
      const destinations = [...action];
      const [moved] = destinations.splice(oldIndex, 1);
      destinations.splice(newIndex, 0, moved);
      update(destinations);
    },
  });
  const error = invalidSavedValue
    ? "Invalid Form action settings"
    : validateFormSubmission(action);

  return (
    <Box>
      <Flex align="center" justify="between">
        <FieldLabel
          description={
            <Flex direction="column" gap="1">
              <Text>
                Sends each form submission to all selected destinations at the
                same time.
              </Text>
              <Box as="ul" css={{ margin: 0, paddingLeft: theme.spacing[4] }}>
                <li>
                  <Text>
                    <code>formData</code> — submitted fields from this Form
                  </Text>
                </li>
                <li>
                  <Text>
                    <code>browserInfo</code> — visitor details
                  </Text>
                </li>
                <li>
                  <Text>
                    <code>formState</code> — current Form state: initial,
                    success, or error.
                  </Text>
                </li>
                <li>
                  <Text>
                    <code>results</code> — each action’s response, in order
                  </Text>
                </li>
                <li>
                  <Text>
                    <code>errors</code> — failed actions and their messages
                  </Text>
                </li>
              </Box>
              {action.length === 0 && (
                <Flex align="center" gap="1">
                  <AlertIcon
                    color={cssVar("--foreground-warning")}
                    style={{ flexShrink: 0 }}
                  />
                  <Text>Add at least one action.</Text>
                </Flex>
              )}
            </Flex>
          }
          resettable={invalidSavedValue || action.length > 0}
          resetLabel="Reset"
          onReset={() => update([])}
        >
          Action
        </FieldLabel>
        <DropdownMenu>
          <Tooltip content="Add a resource to submit this Form.">
            <span style={{ display: "flex" }}>
              <DropdownMenuTrigger asChild>
                <SmallIconButton
                  aria-label="Add action"
                  disabled={
                    action.length >= maxFormDestinations ||
                    resources.length === 0
                  }
                  icon={<PlusIcon />}
                />
              </DropdownMenuTrigger>
            </span>
          </Tooltip>
          <DropdownMenuContent>
            {resources.map((variable) => (
              <DropdownMenuItem
                key={variable.id}
                disabled={action.some(
                  ({ dataSourceId }) => dataSourceId === variable.id
                )}
                onSelect={() => {
                  if (
                    action.length < maxFormDestinations &&
                    !action.some(
                      ({ dataSourceId }) => dataSourceId === variable.id
                    )
                  ) {
                    update([
                      ...action,
                      { dataSourceId: variable.id, enabled: true },
                    ]);
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
          {action.length > 0 && (
            <CssValueListArrowFocus dragItemId={dragItemId}>
              <Grid
                ref={sortableRefCallback}
                css={{
                  marginInline: `calc(-1 * ${theme.panel.paddingInline})`,
                }}
              >
                {action.map(({ dataSourceId: id, enabled }, index) => (
                  <ActionItem
                    key={id}
                    id={id}
                    index={index}
                    variable={dataSources.get(id)}
                    isEnabled={enabled}
                    active={dragItemId === id}
                    onToggle={() =>
                      update(
                        action.map((item) =>
                          item.dataSourceId === id
                            ? { ...item, enabled: !item.enabled }
                            : item
                        )
                      )
                    }
                    onRemove={() =>
                      update(action.filter((item) => item.dataSourceId !== id))
                    }
                  />
                ))}
                {placementIndicator}
              </Grid>
            </CssValueListArrowFocus>
          )}
          {error && error !== emptyFormDestinationMessage && (
            <Text>{error}</Text>
          )}
        </Flex>
      </Box>
    </Box>
  );
};
