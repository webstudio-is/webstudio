import { useState } from "react";

export type Field<Type> = {
  value: Type;
  error: undefined | string;
  isErrorVisible: boolean;
  valid: boolean;
  onChange: (value: Type) => void;
  onBlur: () => void;
};

export const useField = <Type>({
  initialValue,
  validate,
}: {
  initialValue: Type;
  validate: (value: Type) => undefined | string;
}): Field<Type> => {
  const [value, setValue] = useState(initialValue);
  const [touched, setTouched] = useState(false);
  const error = validate?.(value);
  return {
    value,
    // show error only when user stop interactinig with control
    error: touched ? error : undefined,
    // inform when user see the error and not need to trigger it
    isErrorVisible: error === undefined || touched,
    valid: error === undefined,
    // hide error when user is typing
    onChange: (value) => {
      setValue(value);
      setTouched(false);
    },
    // show error when user focus on another control
    onBlur: () => {
      setTouched(true);
    },
  };
};

export type ComposedFields = {
  valid: boolean;
  allErrorsVisible: boolean;
  showAllErrors: () => void;
};

export const composeFields = (
  // allow passing fields with more tight types
  // by ensuring their onChange will not refine
  ...fields: Omit<Field<unknown>, "onChange">[]
): ComposedFields => {
  return {
    valid: fields.every((field) => field.valid),
    allErrorsVisible: fields.every((field) => field.isErrorVisible),
    showAllErrors: () => {
      for (const field of fields) {
        field.onBlur();
      }
    },
  };
};
