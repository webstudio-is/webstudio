import {
  useState,
  useRef,
  useCallback,
  useMemo,
  type ComponentProps,
  useEffect,
} from "react";
import useDebounce from "react-use/lib/useDebounce";
import {
  TextField,
  MenuAnchor,
  Menu,
  MenuContent,
  MenuItem,
} from "~/shared/design-system";

type Items = Array<{ label: string }>;

const findIndex = (
  items: Items,
  value: string,
  exact: boolean = false
): number => {
  const item = items.find(({ label }) => {
    return exact ? label === value : label.includes(value);
  });
  if (item === undefined) return -1;
  return items.indexOf(item);
};

type AutocompleteProps = {
  items: Items;
  onChangeValue: (value: string) => void;
  value: string;
} & ComponentProps<typeof TextField>;

export const Autocomplete = ({
  items,
  onChangeValue,
  value,
  ...rest
}: AutocompleteProps) => {
  const [debouncedValue, setDebouncedValue] = useState<string>();
  const [isOpen, setIsOpen] = useState<boolean>();
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>();
  const isMouseInRef = useRef<boolean>(false);
  const previousValueRef = useRef<string>(value);
  const contentRefCallback = useCallback(
    (contentElement) => {
      contentRef.current = contentElement;
      // When we open with an arrow
      // menu catches the key event and focuses the first item,
      // which triggers onFocus handler.
      // We need to prevent that handler from executing.
      cancelDebounce();

      if (contentElement && inputRef.current !== null) {
        inputRef.current.focus();
      }
    },
    [inputRef]
  );

  const currentIndex = useMemo(() => {
    // We try to match exact item first, then non-exact as a fallback.
    const exactMatchIndex = findIndex(items, value, true);
    const index =
      exactMatchIndex === -1 ? findIndex(items, value) : exactMatchIndex;

    return index;
  }, [items, value]);

  useEffect(() => {
    if (isOpen === false) return;
    if (currentIndex === -1) {
      close();
      return;
    }

    // We don't want to auto scroll when pointer is on the menu
    if (contentRef.current && isMouseInRef.current === false) {
      contentRef.current.children[currentIndex]?.scrollIntoView({
        block: "center",
      });
    }
  }, [currentIndex, isOpen, contentRef.current, isMouseInRef.current]);

  useEffect(() => {
    if (isOpen === false) {
      // Remember the value we had before opening autocomplete
      // so that when we press ESC we can restore it.
      previousValueRef.current = value;
    }
  }, [value, isOpen]);

  const [, cancelDebounce] = useDebounce(
    () => {
      if (debouncedValue !== undefined) {
        select(debouncedValue);
      }
    },
    500,
    [debouncedValue]
  );

  const select = (nextValue?: string) => {
    cancelDebounce();
    if (nextValue !== undefined && nextValue !== value) {
      onChangeValue(nextValue);
    }
  };

  const open = () => {
    if (isOpen !== true && currentIndex !== -1) setIsOpen(true);
  };

  const close = () => {
    setDebouncedValue(undefined);
    cancelDebounce();
    setIsOpen(false);
  };

  const abort = () => {
    if (previousValueRef.current !== undefined) {
      select(previousValueRef.current);
    }
    close();
  };

  return (
    <Menu open={isOpen} modal={false}>
      <MenuAnchor asChild>
        <TextField
          {...rest}
          value={value}
          ref={inputRef}
          autoComplete="off"
          onClick={() => {
            open();
          }}
          onFocus={() => {
            inputRef.current?.select();
            if (isOpen === undefined) open();
          }}
          onChange={(event) => {
            const value = event.target.value.trim();
            select(value);
            open();
            onChangeValue(value);
          }}
          onKeyDown={(event) => {
            switch (event.key) {
              case "Escape":
                event.preventDefault();
                abort();
                break;
              case "Enter": {
                event.preventDefault();
                select(items[currentIndex]?.label);
                isOpen ? close() : open();
                break;
              }
              case "ArrowDown": {
                event.preventDefault();
                if (isOpen === false) {
                  open();
                  break;
                }
                const index = items[currentIndex + 1] ? currentIndex + 1 : 0;
                select(items[index]?.label);
                break;
              }
              case "ArrowUp": {
                event.preventDefault();
                if (isOpen === false) {
                  open();
                  break;
                }
                const index = items[currentIndex - 1]
                  ? currentIndex - 1
                  : items.length - 1;
                select(items[index]?.label);
                break;
              }
            }
          }}
        />
      </MenuAnchor>
      <MenuContent
        loop
        portalled
        css={{ maxHeight: 200, overflow: "auto" }}
        asChild
        onMouseEnter={() => {
          isMouseInRef.current = true;
        }}
        onMouseLeave={() => {
          isMouseInRef.current = false;
        }}
        onPointerDownOutside={() => {
          abort();
        }}
      >
        <div ref={contentRefCallback}>
          {items.map(({ label }, index) => {
            return (
              <MenuItem
                key={index}
                {...(index === currentIndex
                  ? { "data-found": true }
                  : undefined)}
                onSelect={() => {
                  select(label);
                  close();
                }}
                onFocus={(event) => {
                  setDebouncedValue(items[index]?.label);
                }}
              >
                {label}
              </MenuItem>
            );
          })}
        </div>
      </MenuContent>
    </Menu>
  );
};
