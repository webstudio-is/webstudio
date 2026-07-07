import { Flex, StorySection } from "@webstudio-is/design-system";
import { ErrorMessage as ErrorMessageComponent } from "./error-message.client";

export default {
  title: "Error Message",
  component: ErrorMessageComponent,
};

export const ErrorMessage = () => (
  <StorySection title="Error Message">
    <Flex direction="column" gap="9">
      <ErrorMessageComponent
        error={{
          status: 404,
          statusText: "Not Found",
          message: "The page you're looking for doesn't exist.",
        }}
      />
      <ErrorMessageComponent
        error={{
          status: 500,
          statusText: "Internal Server Error",
          message: "Something went wrong on our end.",
          description:
            "Please try again later or contact support if the problem persists.",
        }}
      />
      <ErrorMessageComponent
        error={{
          status: 403,
          statusText: "Forbidden",
          message: "You don't have permission to access this resource.",
        }}
      />
    </Flex>
  </StorySection>
);
