import { ErrorMessage } from "./error-message.client";

export default {
  title: "Error Message",
  component: ErrorMessage,
};

export const NotFound = () => (
  <ErrorMessage
    error={{
      status: 404,
      statusText: "Not Found",
      message: "The page you're looking for doesn't exist.",
    }}
  />
);

export const ServerError = () => (
  <ErrorMessage
    error={{
      status: 500,
      statusText: "Internal Server Error",
      message: "Something went wrong on our end.",
      description:
        "Please try again later or contact support if the problem persists.",
    }}
  />
);

export const Forbidden = () => (
  <ErrorMessage
    error={{
      status: 403,
      statusText: "Forbidden",
      message: "You don't have permission to access this resource.",
    }}
  />
);
