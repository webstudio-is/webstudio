import type {
  StyleSourceSelections,
  StyleSourceSelection,
} from "../schema/style-source-selections";

export const parseStyleSourceSelections = (
  styleSourceSelectionsString: string
): StyleSourceSelections => {
  const styleSourceSelectionsList = JSON.parse(
    styleSourceSelectionsString
  ) as StyleSourceSelection[];

  return new Map(
    styleSourceSelectionsList.map((item) => [item.instanceId, item])
  );
};

export const serializeStyleSourceSelections = (
  styleSourceSelectionsMap: StyleSourceSelections
) => {
  const styleSourceSelectionsList: StyleSourceSelection[] = Array.from(
    styleSourceSelectionsMap.values()
  );
  return JSON.stringify(styleSourceSelectionsList);
};
