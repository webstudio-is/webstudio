import {
  type ComponentProps,
  type ForwardRefRenderFunction,
  forwardRef,
  useRef,
  useState,
  useEffect,
} from "react";
import { Cross2Icon, MagnifyingGlassIcon } from "@webstudio-is/icons";
import { TextField } from "./text-field";
import { IconButton } from "./icon-button";

const SearchFieldBase: ForwardRefRenderFunction<
  HTMLInputElement,
  ComponentProps<typeof TextField> & { onCancel?: () => void }
> = (props, ref) => {
  const { onChange, onCancel, value: propsValue = "", ...rest } = props;
  const [value, setValue] = useState(String(propsValue));
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setValue(String(propsValue));
  }, [propsValue]);
  return (
    <TextField
      {...rest}
      ref={ref}
      type="search"
      value={value}
      inputRef={inputRef}
      prefix={
        <IconButton aria-label="Search" css={{ color: "$hint" }} tabIndex={-1}>
          <MagnifyingGlassIcon />
        </IconButton>
      }
      suffix={
        value.length > 0 ? (
          <IconButton
            aria-label="Reset search"
            title="Reset search"
            tabIndex={-1}
            onClick={() => {
              inputRef.current?.focus();
              setValue("");
              onCancel?.();
            }}
          >
            <Cross2Icon />
          </IconButton>
        ) : null
      }
      onChange={(event) => {
        setValue(event.target.value);
        onChange?.(event);
      }}
    />
  );
};

export const SearchField = forwardRef(SearchFieldBase);
