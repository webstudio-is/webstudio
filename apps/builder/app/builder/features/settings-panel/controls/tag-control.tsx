import { useStore } from "@nanostores/react";
import { Select } from "@webstudio-is/design-system";
import { $selectedInstance } from "~/shared/awareness";
import { updateWebstudioData } from "~/shared/instance-utils";
import { type ControlProps, VerticalLayout } from "../shared";
import { FieldLabel } from "../property-label";

export const TagControl = ({ meta, prop }: ControlProps<"tag">) => {
  const instance = useStore($selectedInstance);
  const propTag = prop?.type === "string" ? prop.value : undefined;
  const instanceTag = instance?.tag;
  const defaultTag = meta.options[0];
  const value = propTag ?? instanceTag ?? defaultTag;
  return (
    <VerticalLayout
      label={
        <FieldLabel description="Use this property to change the HTML tag of this element to semantically structure and describe the content of a webpage. This can be important for accessibility tools and search engine optimization.">
          Tag
        </FieldLabel>
      }
    >
      <Select
        fullWidth
        value={value}
        options={meta.options}
        onChange={(value) => {
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
        }}
      />
    </VerticalLayout>
  );
};
