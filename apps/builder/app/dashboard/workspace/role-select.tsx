import type { ComponentProps } from "react";
import { Box, Select, theme } from "@webstudio-is/design-system";
import { type Role, roles, roleLabels } from "@webstudio-is/project";
import { roleDescriptions } from "~/shared/permissions";

type RoleSelectProps = {
  value: Role;
  onChange: (role: Role) => void;
  disabled?: boolean;
  color?: ComponentProps<typeof Select>["color"];
};

export const RoleSelect = ({
  value,
  onChange,
  disabled,
  color,
}: RoleSelectProps) => (
  <Select
    color={color}
    options={[...roles]}
    value={value}
    getLabel={(option: Role) => roleLabels[option]}
    getDescription={(option: Role) => (
      <Box css={{ width: theme.spacing[28] }}>{roleDescriptions[option]}</Box>
    )}
    onChange={onChange}
    disabled={disabled}
  />
);
