import interactionResponse from "await-interaction-response";
import {
  type ComponentProps,
  type ComponentPropsWithoutRef,
  forwardRef,
  useCallback,
  useEffect,
  useState,
} from "react";
import { Root, List, Trigger, Content } from "@radix-ui/react-tabs";
import { getIndexWithinAncestorFromProps } from "@webstudio-is/sdk/runtime";

export const Tabs = forwardRef<HTMLDivElement, ComponentProps<typeof Root>>(
  ({ defaultValue, ...props }, ref) => {
    const currentValue = props.value ?? defaultValue ?? "";
    const [value, setValue] = useState(currentValue);
    // synchronize external value with local one when changed
    useEffect(() => setValue(currentValue), [currentValue]);

    const handleValueChange = useCallback(async (value: string) => {
      await interactionResponse();
      setValue(value);
    }, []);

    return (
      <Root
        ref={ref}
        {...props}
        value={value}
        onValueChange={handleValueChange}
      />
    );
  }
);

export const TabsList = List;

export const TabsTrigger = forwardRef<
  HTMLButtonElement,
  Omit<ComponentPropsWithoutRef<typeof Trigger>, "value"> & { value?: string }
>(({ value, ...props }, ref) => {
  const index = getIndexWithinAncestorFromProps(props);
  return <Trigger ref={ref} value={value ?? index ?? ""} {...props} />;
});

export const TabsContent = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof Content>, "value"> & { value?: string }
>(({ value, ...props }, ref) => {
  const index = getIndexWithinAncestorFromProps(props);
  return <Content ref={ref} value={value ?? index ?? ""} {...props} />;
});
