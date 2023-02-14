import {
  Separator as SeparatorPrimitive,
  styled,
} from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";

export const Separator = styled(SeparatorPrimitive, {
  marginTop: theme.spacing[3],
  marginBottom: theme.spacing[5],
});
