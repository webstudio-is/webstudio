import { useId } from "react";

export const useIds = <FieldName extends string>(
  fieldNames: readonly FieldName[]
) => {
  const id = useId();
  return Object.fromEntries(
    fieldNames.map((fieldName) => [fieldName, `${id}-${fieldName}`])
  ) as Record<FieldName, string>;
};
