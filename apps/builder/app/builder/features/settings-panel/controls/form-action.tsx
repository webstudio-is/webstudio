import { useStore } from "@nanostores/react";
import { useState } from "react";
import {
  Box,
  InteractiveListArrowFocus,
  InteractiveListItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Flex,
  Grid,
  SmallIconButton,
  Text,
  Tooltip,
  InfoTooltip,
  useSortable,
  theme,
} from "@webstudio-is/design-system";
import { MinusIcon, PlusIcon } from "@webstudio-is/icons";
import {
  isFormSubmission,
  maxFormActions,
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
import { UrlControl } from "./url";

const ActionItem = ({
  id,
  index,
  variable,
  enabled,
  active,
  onRemove,
}: {
  id: string;
  index: number;
  variable?: DataSource;
  enabled: boolean;
  active: boolean;
  onRemove: () => void;
}) => {
  const isResource = variable?.type === "resource";
  const name = isResource ? variable.name : "Deleted Resource";
  const label = enabled ? name : `${name} (disabled in saved settings)`;
  return (
    <InteractiveListItem
      id={id}
      index={index}
      aria-label={`Action ${label}`}
      draggable
      active={active}
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
          {label}
        </Text>
      }
      buttons={
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
      }
    />
  );
};

export const FormActionControl = ({
  instanceId,
  prop,
  onChange,
  successRedirect,
}: ControlProps<"form-action"> & {
  successRedirect?: ControlProps<"url">;
}) => {
  const [showEmptyResourceTooltip, setShowEmptyResourceTooltip] =
    useState(false);
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
    : action.length === 0
      ? undefined
      : validateFormSubmission(action);

  return (
    <Box>
      <Flex align="center" justify="between">
        <FieldLabel
          description={
            <Flex direction="column" gap="1">
              <Text>
                Sends each form submission to all enabled destinations at the
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
            </Flex>
          }
          resettable={invalidSavedValue || action.length > 0}
          resetLabel="Reset"
          onReset={() => update([])}
        >
          Action
        </FieldLabel>
        {resources.length === 0 ? (
          <Tooltip
            content="Create a resource in the Variables section first."
            open={showEmptyResourceTooltip}
            onOpenChange={setShowEmptyResourceTooltip}
          >
            <SmallIconButton
              aria-label="Add action"
              icon={<PlusIcon />}
              onClick={() => setShowEmptyResourceTooltip(true)}
            />
          </Tooltip>
        ) : (
          <DropdownMenu>
            <Tooltip content="Add a resource to submit this Form.">
              <span style={{ display: "flex" }}>
                <DropdownMenuTrigger asChild>
                  <SmallIconButton
                    aria-label="Add action"
                    disabled={action.length >= maxFormActions}
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
                      action.length < maxFormActions &&
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
        )}
      </Flex>
      <Box css={{ py: theme.spacing[2] }}>
        <Flex direction="column" gap="2">
          {action.length > 0 && (
            <InteractiveListArrowFocus dragItemId={dragItemId}>
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
                    enabled={enabled}
                    active={dragItemId === id}
                    onRemove={() =>
                      update(action.filter((item) => item.dataSourceId !== id))
                    }
                  />
                ))}
                {placementIndicator}
              </Grid>
            </InteractiveListArrowFocus>
          )}
          {error && <Text>{error}</Text>}
          {action.length > 0 && successRedirect && (
            <UrlControl {...successRedirect} />
          )}
          {!invalidSavedValue && action.length === 0 && (
            <Flex align="center" justify="center" gap="1">
              <Text>Navigation mode</Text>
              <InfoTooltip
                label="About navigation mode"
                content="Submits the form fields as URL query parameters and navigates without a full page reload. Use this for search and filters that update page Resources from the URL."
              />
            </Flex>
          )}
        </Flex>
      </Box>
    </Box>
  );
};
