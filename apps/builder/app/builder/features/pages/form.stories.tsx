import { Button, Flex, InputField, Text } from "@webstudio-is/design-system";
import { Form } from "./form";

export default {
  title: "Builder/Pages/Form",
  component: Form,
};

export const Form = () => (
  <Flex direction="column" gap="3" css={{ width: 300, height: 200 }}>
    <Form onSubmit={() => window.alert("Submitted!")}>
      <Flex direction="column" gap="3" css={{ padding: 16 }}>
        <Text variant="labels">Page name</Text>
        <InputField defaultValue="Home" />
        <Button type="submit">Save</Button>
      </Flex>
    </Form>
  </Flex>
);
