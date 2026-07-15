import { InputErrorsTooltip } from "@webstudio-is/design-system";
import { CustomMetadata } from "../custom-metadata";
import type {
  PageSettingsErrors,
  PageSettingsValues,
} from "@webstudio-is/project-build/runtime";
import type { OnChange } from "./shared";

export const CustomMetadataSection = ({
  values,
  errors,
  disabled,
  showBindingControls,
  onChange,
}: {
  values: PageSettingsValues;
  errors: PageSettingsErrors;
  disabled?: boolean;
  showBindingControls?: boolean;
  onChange: OnChange;
}) => {
  return (
    <InputErrorsTooltip errors={errors.customMetas}>
      <div role="group" aria-label="Custom metadata">
        <CustomMetadata
          customMetas={values.customMetas}
          disabled={disabled}
          showBindingControls={showBindingControls}
          onChange={(customMetas) => {
            onChange({
              field: "customMetas",
              value: customMetas,
            });
          }}
        />
      </div>
    </InputErrorsTooltip>
  );
};
