import { useState, useEffect } from "react";
import { IconButton, Tooltip } from "@webstudio-is/design-system";
import { LockOpenIcon, LockCloseIcon } from "@webstudio-is/icons";
import type { Style } from "@webstudio-is/react-sdk";
import type { CreateBatchUpdate } from "./use-style-data";

export const Lock = ({
  name,
  pairedKeys,
  currentStyle,
  batchUpdate,
}: {
  name: string;
  pairedKeys: Array<keyof Style>;
  currentStyle: Style;
  batchUpdate: ReturnType<CreateBatchUpdate>;
}) => {
  const aKey = pairedKeys[0];
  const bKey = pairedKeys[1];
  const aVal = parseFloat(currentStyle[aKey]?.value as string);
  const bVal = parseFloat(currentStyle[bKey]?.value as string);
  const [isPaired, setIsPaired] = useState(aVal === bVal);

  useEffect(() => {
    if (!isPaired) return;
    if (aVal === bVal) return;
    batchUpdate.setProperty(aKey)(String(aVal));
    batchUpdate.setProperty(bKey)(String(aVal));
    batchUpdate.publish();
  }, [batchUpdate, isPaired, aKey, bKey, aVal, bVal]);

  return (
    <Tooltip
      content={isPaired ? "Locked" : "Unlocked"}
      delayDuration={400}
      disableHoverableContent={true}
    >
      <IconButton
        data-property={name}
        css={{ width: "100%", gridArea: name }}
        onClick={() => setIsPaired((value) => !value)}
      >
        {isPaired ? <LockCloseIcon /> : <LockOpenIcon />}
      </IconButton>
    </Tooltip>
  );
};
