import { IconButton } from "@webstudio-is/design-system";
import { LockOpened } from "@webstudio-is/icons";
import type { Style } from "@webstudio-is/react-sdk";
import type { CreateBatchUpdate } from "../shared/use-style-data";

const LockControl = ({
  name,
}: {
  name: string;
  currentStyle: Style;
  batchUpdate: ReturnType<CreateBatchUpdate>;
}) => {
  return (
    <IconButton data-property={name} css={{ width: "100%", gridArea: name }}>
      <LockOpened />
    </IconButton>
  );
};

export { LockControl };
