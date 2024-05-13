import type {
  ChangeEvent,
  FocusEvent,
  FormEvent,
  InvalidEvent,
  ReactNode,
} from "react";
import { forwardRef, useEffect, useRef, useState } from "react";

export type Field<Type> = {
  value: Type;
  error: undefined | string;
  isErrorVisible: boolean;
  valid: boolean;
  onChange: (value: Type) => void;
  onBlur: () => void;
};

/**
 * @deprecated switch to useFormField or any other native validation
 */
export const useField = <Type,>({
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

/**
 * @deprecated switch to useFormField or any other native validation
 */
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

export const useFormField = ({
  defaultValue,
  validate,
}: {
  defaultValue: string;
  validate: (value: string) => string;
}) => {
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  // validate initial value
  useEffect(() => {
    ref.current?.setCustomValidity(validate(defaultValue));
  }, [defaultValue, validate]);
  const props = {
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      setError("");
      event.target.setCustomValidity(validate(event.target.value));
    },
    onBlur: (event: FocusEvent<HTMLInputElement>) => {
      event.target.checkValidity();
    },
    onInvalid: (event: InvalidEvent<HTMLInputElement>) => {
      setError(event.target.validationMessage);
    },
  };
  return {
    ref,
    error,
    props,
  };
};

/**
 * prevents default navigation
 * supports submit on enter
 * avoids submitting when invalid
 * resets attempts
 * does not affect layout
 */
export const Form = forwardRef<
  HTMLFormElement,
  { onSubmit: (event: FormEvent<HTMLFormElement>) => void; children: ReactNode }
>(({ onSubmit, children }, ref) => {
  return (
    <form
      ref={ref}
      // exclude from the flow
      style={{ display: "contents" }}
      onSubmit={(event) => {
        event.preventDefault();
        if (event.currentTarget.checkValidity() === false) {
          return;
        }
        onSubmit(event);
      }}
      onChange={(event) => {
        delete event.currentTarget.dataset.attemptedSubmit;
      }}
    >
      {/* submit is not triggered when press enter on input without submit button */}
      <button style={{ display: "none" }}>submit</button>
      {children}
    </form>
  );
});

/**
 * checks validity and allow request a submit on second attempt to not block user
 * attempts are reset when change event is propagated
 */
export const checkCanRequestSubmit = (form: HTMLFormElement) => {
  if (
    form.checkValidity() === false &&
    form.dataset.attemptedSubmit === undefined
  ) {
    form.dataset.attemptedSubmit = "true";
    return false;
  }
  return true;
};
