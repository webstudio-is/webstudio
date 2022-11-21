import {
  Button,
  Flex,
  List,
  ListItem,
  useList,
} from "@webstudio-is/design-system";
import { useEffect, useRef, useState } from "react";
import { ValuePickerPopover } from "../style-panel/shared/value-picker-popover";

const fetchData = async () => {
  const request = await fetch(
    "https://api.jsonbin.io/v3/b/637a9eef0e6a79321e4f5db9",
    {
      headers: {
        "X-Master-Key":
          "$2b$10$dhCKolWv6qdY81LVmiu/WOH2mXJF9KKBkgAs1UWtTcnAu6LSgJMne",
      },
    }
  );

  const data = await request.json();
  return data.record.values.global;
};

const useSelectProperty = (isSelectingProperty: any, onSelect: any) => {
  useEffect(() => {
    if (isSelectingProperty === false) return;

    const handleMouseDown = (event: any) => {
      const element = event.target?.closest?.("[data-control]");
      if (element && element.dataset.control) onSelect(element.dataset.control);
    };

    document.addEventListener("mousedown", handleMouseDown, {
      passive: true,
      capture: true,
    });

    const handleMouseEnter = (event: any) => {
      const element = event.target?.closest?.("[data-control]");
      if (element) {
        element.style.outline = "1px solid red";
      }
    };

    const handleMouseLeave = (event: any) => {
      const element = event.target?.closest?.("[data-control]");
      element?.removeAttribute("style");
    };

    document.addEventListener("mouseenter", handleMouseEnter, {
      passive: true,
      capture: true,
    });

    document.addEventListener("mouseleave", handleMouseLeave, {
      passive: true,
      capture: true,
    });

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isSelectingProperty]);
};

const BindingSelector = ({ property, onChange }: any) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [data, setData] = useState({});
  const prevValue = useRef();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData().then(setData);
    }, 1000);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [data]);

  useEffect(() => {
    setCurrentIndex(currentIndex);
    const items = Object.keys(data);
    const value = data[items[currentIndex]]?.value;
    if (value === prevValue.current) return;
    prevValue.current = value;
    onChange(value);
  }, [currentIndex, data]);

  const { getItemProps, getListProps } = useList({
    items: Object.keys(data),
    selectedIndex,
    currentIndex,
    onSelect: setSelectedIndex,
    onChangeCurrent: setCurrentIndex,
  });

  return (
    <Flex direction="column" css={{ padding: "$spacing$5" }}>
      <List {...getListProps()}>
        {Object.keys(data).map((name, index) => {
          return <ListItem {...getItemProps({ index })}>{name}</ListItem>;
        })}
      </List>
    </Flex>
  );
};

export const AddBinding = ({ setProperty }) => {
  const [mode, setMode] = useState<string | undefined>("selectingBinding");
  const [selectedProperty, setSelectedProperty] = useState();

  useSelectProperty(mode === "selectingProperty", (property: any) => {
    setSelectedProperty(property);
  });

  return (
    <ValuePickerPopover
      title="Design Tokens"
      content={
        <BindingSelector
          property={selectedProperty}
          onChange={(value) => {
            if (selectedProperty) {
              setProperty(selectedProperty)(value);
            }
          }}
        />
      }
      onOpenChange={(isOpen) => {
        if (isOpen === false) setMode(undefined);
      }}
      modal={false}
      onInteractOutside={(event) => {
        event.preventDefault();
      }}
    >
      <Button
        onClick={() => {
          setMode("selectingProperty");
        }}
      >
        Binding Mode
      </Button>
    </ValuePickerPopover>
  );
};
