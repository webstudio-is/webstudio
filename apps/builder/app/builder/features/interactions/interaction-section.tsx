import { useStore } from "@nanostores/react";
import { type Instance, Props } from "@webstudio-is/sdk";
import {
  $memoryProps,
  $selectedBreakpoint,
  $propsIndex,
  $props,
} from "~/shared/nano-states";
import { AnimationSection } from "./animation/animation-section";
import { nanoid } from "nanoid";
import { matchMediaBreakpoints } from "./match-media-breakpoints";
import { $matchingBreakpoints } from "../style-panel/shared/model";
import { serverSyncStore } from "~/shared/sync";

type PropsSectionProps = {
  selectedInstance: Instance;
  selectedInstanceKey: string;
};

// A UI componet with minimum logic that can be demoed in Storybook etc.
export const InteractionSection = ({
  selectedInstance,
  selectedInstanceKey,
}: PropsSectionProps) => {
  const matchingBreakpoints = useStore($matchingBreakpoints);
  const selectedBreakpoint = useStore($selectedBreakpoint);
  const { propsByInstanceId } = useStore($propsIndex);

  const selectedItemProps = propsByInstanceId.get(selectedInstance.id);

  const propName = "action";

  const matchMediaValue = matchMediaBreakpoints(matchingBreakpoints);

  if (selectedBreakpoint?.id === undefined) {
    return;
  }

  const actionProp = selectedItemProps?.find(
    (prop) => prop.type === "animationAction"
  );

  return (
    <AnimationSection
      action={actionProp?.value}
      isAnimationEnabled={matchMediaValue}
      selectedBreakpointId={selectedBreakpoint?.id}
      onChange={(value, isEphemeral) => {
        const memoryProps = new Map($memoryProps.get());
        const memoryInstanceProp: Props = new Map(
          memoryProps.get(selectedInstanceKey)
        );

        if (isEphemeral && value !== undefined) {
          memoryInstanceProp.set(propName, {
            id: nanoid(),
            instanceId: selectedInstance.id,
            type: "animationAction",
            name: propName,
            value,
          });
          memoryProps.set(selectedInstanceKey, memoryInstanceProp);
          $memoryProps.set(memoryProps);
          return;
        }

        if (memoryInstanceProp.has(propName)) {
          memoryInstanceProp.delete(propName);
          memoryProps.set(selectedInstanceKey, memoryInstanceProp);

          $memoryProps.set(memoryProps);
        }

        if (isEphemeral || value === undefined) {
          return;
        }

        isEphemeral satisfies false;

        serverSyncStore.createTransaction([$props], (props) => {
          const componentProps = $propsIndex
            .get()
            .propsByInstanceId.get(selectedInstance.id);

          const actionProp = componentProps?.find(
            (prop) => prop.name === propName
          );

          const newId = nanoid();

          props.set(actionProp?.id ?? newId, {
            id: actionProp?.id ?? newId,
            instanceId: selectedInstance.id,
            type: "animationAction",
            name: propName,
            value,
          });
        });
      }}
    />
  );
};
