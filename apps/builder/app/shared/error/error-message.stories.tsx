import { Flex } from "@webstudio-is/design-system";
import { ErrorMessage } from "./error-message.client";

export default {
  title: "Error Message",
  component: ErrorMessage,
};

export const ErrorMessage = () => (
  <Flex direction="column" gap="9">
    <ErrorMessage
      error={{
        status: 404,
        statusText: "Not Found",
        message: "The page you're looking for doesn't exist.",
      }}
    />
    <ErrorMessage
      error={{
        status: 500,
        statusText: "Internal Server Error",
        message: "Something went wrong on our end.",
        description:
          "Please try again later or contact support if the problem persists.",
      }}
    />
    <ErrorMessage
      error={{
        status: 403,
        statusText: "Forbidden",
        message: "You don't have permission to access this resource.",
      }}
    />
  </Flex>
);
