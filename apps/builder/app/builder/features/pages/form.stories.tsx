import { Button, Flex, InputField, Text } from "@webstudio-is/design-system";
import { Form as FormComponent } from "./form";

export default {
  title: "Builder/Pages/Form",
  component: FormComponent,
};

export const Form = () => (
  <Flex direction="column" gap="3" css={{ width: 300, height: 200 }}>
    <FormComponent onSubmit={() => window.alert("Submitted!")}>
      <Flex direction="column" gap="3" css={{ padding: 16 }}>
        <Text variant="labels">Page name</Text>
        <InputField defaultValue="Home" />
        <Button type="submit">Save</Button>
      </Flex>
    </FormComponent>
  </Flex>
);
