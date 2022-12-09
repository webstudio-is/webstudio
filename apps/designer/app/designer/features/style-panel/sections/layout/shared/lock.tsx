import { useState, useEffect } from "react";
import {
  Flex,
  IconButton_deprecated,
  Tooltip,
} from "@webstudio-is/design-system";
import { LockOpenIcon, LockCloseIcon } from "@webstudio-is/icons";
import type { Style } from "@webstudio-is/css-data";
import type { CreateBatchUpdate } from "../../../shared/use-style-data";

export const Lock = ({
  pairedKeys,
  currentStyle,
  batchUpdate,
}: {
  pairedKeys: Array<keyof Style>;
  currentStyle: Style;
  batchUpdate: ReturnType<CreateBatchUpdate>;
}) => {
  const aKey = pairedKeys[0];
  const bKey = pairedKeys[1];
  const a = currentStyle[aKey];
  const b = currentStyle[bKey];
  const aVal =
    a?.value + (a?.type === "unit" && a.unit !== "number" ? a.unit : "");
  const bVal =
    b?.value + (b?.type === "unit" && b.unit !== "number" ? b.unit : "");
  const [isPaired, setIsPaired] = useState(aVal === bVal);

  useEffect(() => {
    if (isPaired === false) {
      return;
    }
    if (aVal === bVal) {
      return;
    }
    batchUpdate.setProperty(aKey)(aVal);
    batchUpdate.setProperty(bKey)(aVal);
    batchUpdate.publish();
  }, [aKey, bKey, aVal, bVal, isPaired, batchUpdate]);

  return (
    <Tooltip
      content={isPaired ? "Unlock" : "Lock"}
      delayDuration={400}
      disableHoverableContent={true}
    >
      <Flex
        css={{
          width: "100%",
          justifyContent: "center",
        }}
      >
        <IconButton_deprecated onClick={() => setIsPaired((value) => !value)}>
          {isPaired ? <LockCloseIcon /> : <LockOpenIcon />}
        </IconButton_deprecated>
      </Flex>
    </Tooltip>
  );
};
