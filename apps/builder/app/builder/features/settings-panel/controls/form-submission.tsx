import { useState } from "react";
import { useStore } from "@nanostores/react";
import {
  Button,
  Flex,
  Select,
  Text,
  ToggleGroup,
  ToggleGroupButton,
  Tooltip,
} from "@webstudio-is/design-system";
import { GearIcon, LinkIcon } from "@webstudio-is/icons";
import {
  isFormSubmission,
  maxFormDestinations,
  validateFormSubmission,
  type FormSubmission,
} from "@webstudio-is/sdk";
import { findAvailableVariables } from "@webstudio-is/project-build/runtime";
import { $dataSources, $instances } from "~/shared/sync/data-stores";
import { VariablePopoverTrigger } from "../variable-popover";
import { type ControlProps, VerticalLayout } from "../shared";
import { PropertyLabel } from "../property-label";

export const FormSubmissionControl = ({
  instanceId,
  prop,
  onChange,
}: ControlProps<"form-submission">) => {
  const instances = useStore($instances);
  const dataSources = useStore($dataSources);
  const [selectedId, setSelectedId] = useState<string>();
  const invalidSavedValue =
    prop !== undefined &&
    (prop.type !== "json" || isFormSubmission(prop.value) === false);
  const submission: FormSubmission =
    prop?.type === "json" && isFormSubmission(prop.value)
      ? prop.value
      : { mode: invalidSavedValue ? "resources" : "native", destinations: [] };
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
  const error = invalidSavedValue
    ? "Invalid Form submission settings"
    : validateFormSubmission(submission);

  return (
    <VerticalLayout label={<PropertyLabel name="submission" />}>
      <Flex direction="column" gap="2">
        <ToggleGroup
          type="single"
          value={submission.mode}
          onValueChange={(mode) => {
            if (mode === "native" || mode === "resources") {
              update({ ...submission, mode });
            }
          }}
        >
          <Tooltip content="Native browser form">
            <ToggleGroupButton value="native" aria-label="Native browser form">
              <LinkIcon />
            </ToggleGroupButton>
          </Tooltip>
          <Tooltip content="Resources">
            <ToggleGroupButton value="resources" aria-label="Resources">
              <GearIcon />
            </ToggleGroupButton>
          </Tooltip>
        </ToggleGroup>
        {submission.mode === "resources" && (
          <>
            {submission.destinations.map((id) => {
              const variable = dataSources.get(id);
              return (
                <Flex key={id} align="center" justify="between">
                  <Text>{variable?.name ?? "Deleted Resource"}</Text>
                  {variable?.type === "resource" && (
                    <VariablePopoverTrigger variable={variable}>
                      <Button type="button" color="ghost">
                        Edit
                      </Button>
                    </VariablePopoverTrigger>
                  )}
                  <Button
                    type="button"
                    color="ghost"
                    onClick={() =>
                      update({
                        ...submission,
                        destinations: submission.destinations.filter(
                          (selected) => selected !== id
                        ),
                      })
                    }
                  >
                    Remove
                  </Button>
                </Flex>
              );
            })}
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
                            destinations: [
                              ...submission.destinations,
                              selectedId,
                            ],
                          });
                          setSelectedId(undefined);
                        }
                      }}
                    >
                      Add
                    </Button>
                  </Flex>
                )}
                <VariablePopoverTrigger defaultType="resource">
                  <Button type="button" color="ghost">
                    Create Resource in Form
                  </Button>
                </VariablePopoverTrigger>
              </Flex>
            )}
            {error && <Text>{error}</Text>}
          </>
        )}
      </Flex>
    </VerticalLayout>
  );
};
