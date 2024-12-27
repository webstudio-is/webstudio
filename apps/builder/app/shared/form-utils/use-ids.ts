import { useId, useRef } from "react";

export const useIds = <FieldName extends string>(
  fieldNames: readonly FieldName[]
) => {
  if (process.env.NODE_ENV !== "production") {
    // It's OK to disable because process.env.NODE_ENV is not going to change
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const fieldNamesLength = useRef<number>(fieldNames.length);
    if (fieldNamesLength.current !== fieldNames.length) {
      throw new Error("changing fieldNames length is not supported");
    }
    fieldNamesLength.current = fieldNames.length;
  }

  const result: Record<string, string> = {};

  for (const fieldName of fieldNames) {
    // It's OK to disable because of the check above
    // eslint-disable-next-line react-hooks/rules-of-hooks
    result[fieldName] = useId();
  }

  return result as Record<FieldName, string>;
};
