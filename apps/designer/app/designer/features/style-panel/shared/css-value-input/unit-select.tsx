import { Select } from "@webstudio-is/design-system";
import { type Unit, type UnitValue, StyleValue } from "@webstudio-is/react-sdk";
import { useState, useMemo } from "react";

const unitRenderMap: Map<Unit, string> = new Map([
  ["px", "PX"],
  ["%", "%"],
  ["em", "EM"],
  ["rem", "REM"],
  ["ch", "CH"],
  ["vw", "VW"],
  ["vh", "VH"],
  ["number", "-"],
]);

const renderUnitMap: Map<string, Unit> = new Map();
for (const [key, value] of unitRenderMap.entries()) {
  renderUnitMap.set(value, key);
}

const defaultUnits = Array.from(unitRenderMap.keys());

type UseUnitSelectType = {
  value?: UnitValue;
  onChange: (value: StyleValue) => void;
  units?: Array<Unit>;
};

export const useUnitSelect = ({
  onChange,
  value,
  units = defaultUnits,
  ...props
}: UseUnitSelectType) => {
  const [isOpen, setIsOpen] = useState(false);
  const renderUnits = useMemo(
    () => units.map((unit) => unitRenderMap.get(unit) ?? unit),
    [units]
  );
  if (value === undefined) return [isOpen, null];
  const element = (
    <Select
      {...props}
      value={unitRenderMap.get(value.unit)}
      options={renderUnits}
      suffix={null}
      ghost
      open={isOpen}
      onOpenChange={setIsOpen}
      onChange={(item) => {
        const unit = renderUnitMap.get(item);
        if (unit === undefined) return;
        onChange?.({
          ...value,
          unit,
        });
      }}
      onCloseAutoFocus={(event) => {
        // We don't want to focus the unit trigger when closing the select (no matter if unit was selected, clicked outside or esc was pressed)
        event.preventDefault();
      }}
    />
  );

  return [isOpen, element];
};
