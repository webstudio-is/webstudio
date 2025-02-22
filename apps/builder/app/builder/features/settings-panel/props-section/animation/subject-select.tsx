import { Select, toast } from "@webstudio-is/design-system";
import { nanoid } from "nanoid";
import { useState } from "react";
import {
  $hoveredInstanceSelector,
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
} from "~/shared/nano-states";
import { getInstanceStyleDecl } from "~/builder/features/style-panel/shared/model";
import { getInstanceLabel } from "~/shared/instance-utils";
import { toValue } from "@webstudio-is/css-engine";
import type { AnimationAction } from "@webstudio-is/sdk";
import { animationActionSchema } from "@webstudio-is/sdk";
import { setListedCssProperty } from "./set-css-property";
import { serverSyncStore } from "~/shared/sync";

import {
  $breakpoints,
  $styles,
  $styleSources,
  $styleSourceSelections,
} from "~/shared/nano-states";

const initSubjects = () => {
  const selectedInstanceSelector = $selectedInstanceSelector.get();
  const instances = $instances.get();
  const metas = $registeredComponentMetas.get();

  if (
    selectedInstanceSelector === undefined ||
    selectedInstanceSelector.length === 0
  ) {
    return [];
  }

  const subjects = [
    {
      value: "self",
      label: "Self",
      isTimelineExists: true,
      instanceId: selectedInstanceSelector.at(0)!,
      selector: selectedInstanceSelector,
    },
  ];

  for (
    let selector = selectedInstanceSelector.slice(1);
    selector.length !== 0;
    selector = selector.slice(1)
  ) {
    const styleDecl = getInstanceStyleDecl("viewTimelineName", selector);
    const instanceId = selector.at(0)!;

    const instance = instances.get(selector[0]);
    if (instance === undefined) {
      continue;
    }
    const meta = metas.get(instance.component);

    if (meta === undefined) {
      continue;
    }

    const viewTimelineName = toValue(styleDecl.computedValue);
    const isTimelineExists = viewTimelineName.startsWith("--");
    const value = isTimelineExists
      ? viewTimelineName
      : `--generated-timeline-${nanoid()}`;

    subjects.push({
      value,
      label: getInstanceLabel(instance, meta),
      isTimelineExists,
      instanceId,
      selector,
    });
  }

  return subjects;
};

export const SubjectSelect = ({
  value,
  onChange,
  id,
}: {
  value: AnimationAction;
  onChange: (value: AnimationAction) => void;
  id: string;
}) => {
  const [subjects] = useState(() => initSubjects());

  if (value.type !== "view") {
    return;
  }

  return (
    <Select
      id={id}
      options={subjects.map((subject) => subject.value)}
      value={value.subject ?? "self"}
      getLabel={(subject) =>
        subjects.find((s) => s.value === subject)?.label ?? "-"
      }
      onItemHighlight={(subject) => {
        const selector =
          subjects.find((s) => s.value === subject)?.selector ?? undefined;
        $hoveredInstanceSelector.set(selector);
      }}
      onChange={(subject) => {
        const newValue = {
          ...value,
          subject: subject === "self" ? undefined : subject,
        };
        const parsedValue = animationActionSchema.safeParse(newValue);

        if (parsedValue.success) {
          const subjectItem = subjects.find((s) => s.value === subject);

          if (subjectItem === undefined) {
            toast.error(`Subject "${newValue.subject}" not found`);
            return;
          }

          if (
            subjectItem.isTimelineExists === false &&
            newValue.subject !== undefined
          ) {
            serverSyncStore.createTransaction(
              [$breakpoints, $styles, $styleSources, $styleSourceSelections],
              (breakpoints, styles, styleSources, styleSourceSelections) => {
                if (newValue.subject === undefined) {
                  return;
                }

                setListedCssProperty(
                  breakpoints,
                  styleSources,
                  styleSourceSelections,
                  styles
                )(subjectItem.instanceId, "viewTimelineName", {
                  type: "unparsed",
                  value: newValue.subject,
                });
              }
            );
          }

          onChange(parsedValue.data);
          return;
        }

        toast.error("Schemas are incompatible, try fix");
      }}
    />
  );
};
