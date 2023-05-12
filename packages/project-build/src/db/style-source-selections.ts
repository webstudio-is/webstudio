import {
  StyleSourceSelectionsList,
  StyleSourceSelections,
} from "../schema/style-source-selections";

export const parseStyleSourceSelections = (
  styleSourceSelectionsString: string,
  skipValidation = false
): StyleSourceSelections => {
  const styleSourceSelectionsList = skipValidation
    ? (JSON.parse(styleSourceSelectionsString) as StyleSourceSelectionsList)
    : StyleSourceSelectionsList.parse(JSON.parse(styleSourceSelectionsString));

  return new Map(
    styleSourceSelectionsList.map((item) => [item.instanceId, item])
  );
};

export const serializeStyleSourceSelections = (
  styleSourceSelectionsMap: StyleSourceSelections
) => {
  const styleSourceSelectionsList: StyleSourceSelectionsList = Array.from(
    styleSourceSelectionsMap.values()
  );
  return JSON.stringify(styleSourceSelectionsList);
};
