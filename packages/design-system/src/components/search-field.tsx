import {
  type ComponentProps,
  type ForwardRefRenderFunction,
  forwardRef,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  CrossCircledFilledIcon,
  MagnifyingGlassIcon,
} from "@webstudio-is/icons";
import { styled } from "../stitches.config";
import { theme } from "../stitches.config";
import { InputField } from "./input-field";
import { IconButton } from "./icon-button";

const SearchIcon = styled(MagnifyingGlassIcon, {
  // need to center icon vertically
  display: "block",
  color: theme.colors.hint,
  padding: theme.spacing[3],
});

const AbortButton = styled(IconButton, {
  marginRight: theme.spacing[3],
  variants: {
    hidden: {
      false: { visibility: "hidden" },
      true: {},
    },
  },
});

const SearchFieldBase: ForwardRefRenderFunction<
  HTMLInputElement,
  ComponentProps<typeof InputField> & { onCancel?: () => void }
> = (props, ref) => {
  const {
    onChange,
    onCancel,
    value: propsValue = "",
    onKeyDown,
    ...rest
  } = props;
  const [value, setValue] = useState(String(propsValue));
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setValue(String(propsValue));
  }, [propsValue]);
  return (
    <InputField
      {...rest}
      ref={ref}
      // search field implements own reset button
      // type=search does not work here because
      // brings native reset button
      type="text"
      value={value}
      inputRef={inputRef}
      prefix={<SearchIcon />}
      suffix={
        <AbortButton
          hidden={value.length > 0 ? "true" : "false"}
          aria-label="Reset search"
          title="Reset search"
          tabIndex={-1}
          onClick={() => {
            setValue("");
            onCancel?.();
          }}
        >
          <CrossCircledFilledIcon />
        </AbortButton>
      }
      onChange={(event) => {
        setValue(event.target.value);
        onChange?.(event);
      }}
      onKeyDown={(event) => {
        // Make sure we clear the search on esc and preserve the default browser behavior
        if (event.key === "Escape" && value.length !== 0) {
          event.stopPropagation();
          return;
        }
        onKeyDown?.(event);
      }}
    />
  );
};

export const SearchField = forwardRef(SearchFieldBase);
