import { Flex, theme, useId, Select } from "@webstudio-is/design-system";
import { humanizeString } from "~/shared/string-utils";
import { type ControlProps, getLabel, VerticalLayout } from "../shared";

export const SelectControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
}: ControlProps<"select", "string">) => {
  const id = useId();
  const label = getLabel(meta, propName);

  // making sure that the current value is in the list of options
  const options =
    prop === undefined || meta.options.includes(prop.value)
      ? meta.options
      : [prop.value, ...meta.options];

  return (
    <VerticalLayout label={label} id={id} onDelete={onDelete}>
      <Flex css={{ py: theme.spacing[2] }}>
        <Select
          id={id}
          value={prop?.value}
          options={options}
          getLabel={humanizeString}
          onChange={(value) => onChange({ type: "string", value })}
          fullWidth
        />
      </Flex>
    </VerticalLayout>
  );
};
