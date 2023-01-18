import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { sentryMessage } from "../sentry";

export const AUTH_PROVIDERS = {
  LOGIN_DEV: "login_dev",
  LOGIN_GITHUB: "login_github",
  LOGIN_GOOGLE: "login_google",
  LOGIN_LINK: "login_link",
} as const;

export const LOGIN_ERROR_MESSAGES = {
  [AUTH_PROVIDERS.LOGIN_DEV]: "There has been an issue logging you in with dev",
  [AUTH_PROVIDERS.LOGIN_GITHUB]:
    "There has been an issue logging you in with Github",
  [AUTH_PROVIDERS.LOGIN_GOOGLE]:
    "There has been an issue logging you in with Google",
  [AUTH_PROVIDERS.LOGIN_LINK]:
    "There has been an issue logging you in with link",
};

export const useLoginErrorMessage = (): string => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messageToReturn, setMessageToReturn] = useState("");

  useEffect(() => {
    const error = searchParams.get("error");
    const message = searchParams.get("message");

    const hasMessageToShow =
      error !== null && message != null && message !== "";

    if (hasMessageToShow) {
      sentryMessage({ message });
      setMessageToReturn(message);

      setSearchParams((prevSearchParams) => {
        const nextSearchParams = new URLSearchParams(prevSearchParams);
        nextSearchParams.delete("error");
        nextSearchParams.delete("message");
        return nextSearchParams;
      });
      return;
    }

    switch (error) {
      case AUTH_PROVIDERS.LOGIN_DEV:
        setMessageToReturn(LOGIN_ERROR_MESSAGES[AUTH_PROVIDERS.LOGIN_DEV]);
        break;
      case AUTH_PROVIDERS.LOGIN_GITHUB:
        setMessageToReturn(LOGIN_ERROR_MESSAGES[AUTH_PROVIDERS.LOGIN_GITHUB]);
        break;
      case AUTH_PROVIDERS.LOGIN_GOOGLE:
        setMessageToReturn(LOGIN_ERROR_MESSAGES[AUTH_PROVIDERS.LOGIN_GOOGLE]);
        break;
      case AUTH_PROVIDERS.LOGIN_LINK:
        setMessageToReturn(LOGIN_ERROR_MESSAGES[AUTH_PROVIDERS.LOGIN_LINK]);
        break;

      default:
        break;
    }
  }, [searchParams, setSearchParams]);

  return messageToReturn;
};
