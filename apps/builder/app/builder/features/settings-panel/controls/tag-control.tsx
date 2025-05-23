import { useState } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { Box, Combobox, Select, theme } from "@webstudio-is/design-system";
import { elementsByTag } from "@webstudio-is/html-data";
import { tags } from "@webstudio-is/sdk";
import { $selectedInstance, $selectedInstancePath } from "~/shared/awareness";
import { updateWebstudioData } from "~/shared/instance-utils";
import { isTreeSatisfyingContentModel } from "~/shared/content-model";
import {
  $instances,
  $props,
  $registeredComponentMetas,
} from "~/shared/nano-states";
import { type ControlProps, VerticalLayout } from "../shared";
import { FieldLabel } from "../property-label";

const $satisfyingTags = computed(
  [$selectedInstancePath, $instances, $props, $registeredComponentMetas],
  (instancePath, instances, props, metas) => {
    const satisfyingTags: string[] = [];
    if (instancePath === undefined) {
      return satisfyingTags;
    }
    const [{ instance, instanceSelector }] = instancePath;
    const newInstances = new Map(instances);
    for (const tag of tags) {
      newInstances.set(instance.id, { ...instance, tag });
      const isSatisfying = isTreeSatisfyingContentModel({
        instances: newInstances,
        props,
        metas,
        instanceSelector,
      });
      if (isSatisfying) {
        satisfyingTags.push(tag);
      }
    }
    return satisfyingTags;
  }
);

export const TagControl = ({ meta, prop }: ControlProps<"tag">) => {
  const instance = useStore($selectedInstance);
  const propTag = prop?.type === "string" ? prop.value : undefined;
  const instanceTag = instance?.tag;
  const defaultTag = meta.options[0];
  const computedTag = instanceTag ?? propTag ?? defaultTag;
  let satisfyingTags = useStore($satisfyingTags);
  // forbid changing tag on body element
  if (computedTag === "body") {
    satisfyingTags = ["body"];
  }
  const options = meta.options.filter((tag) => satisfyingTags.includes(tag));
  const [value, setValue] = useState<undefined | string>();
  const updateTag = (value: string) => {
    if (instance === undefined) {
      return;
    }
    const instanceId = instance.id;
    updateWebstudioData((data) => {
      // clean legacy <Box tag> and <Text tag>
      if (prop) {
        data.props.delete(prop.id);
      }
      const instance = data.instances.get(instanceId);
      if (instance) {
        instance.tag = value;
      }
    });
  };
  return (
    <VerticalLayout
      label={
        <FieldLabel description="Use this property to change the HTML tag of this element to semantically structure and describe the content of a webpage. This can be important for accessibility tools and search engine optimization.">
          Tag
        </FieldLabel>
      }
    >
      {options.length > 10 ? (
        <Combobox<string>
          getItems={() => options}
          itemToString={(item) => item ?? options[0]}
          value={value ?? computedTag}
          selectedItem={computedTag}
          onChange={(value) => setValue(value ?? undefined)}
          onItemSelect={(item) => {
            updateTag(item);
            setValue(undefined);
          }}
          getDescription={(item) => (
            <Box css={{ width: theme.spacing[28] }}>
              {elementsByTag[item ?? ""]?.description}
            </Box>
          )}
        />
      ) : (
        <Select
          fullWidth
          value={computedTag}
          options={options}
          onChange={updateTag}
          getDescription={(item) => (
            <Box css={{ width: theme.spacing[28] }}>
              {elementsByTag[item]?.description}
            </Box>
          )}
        />
      )}
    </VerticalLayout>
  );
};
