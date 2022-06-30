import isNil from "lodash/isNil";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { sentryException } from "../sentry";

export const AUTH_PROVIDERS = {
  LOGIN_DEV: "login_dev",
  LOGIN_GITHUB: "login_github",
  LOGIN_GOOGLE: "login_google",
};

export const LOGIN_ERROR_MESSAGES = {
  [AUTH_PROVIDERS.LOGIN_DEV]: "There has been an issue logging you in with dev",
  [AUTH_PROVIDERS.LOGIN_GITHUB]:
    "There has been an issue logging you in with Github",
  [AUTH_PROVIDERS.LOGIN_GOOGLE]:
    "There has been an issue logging you in with Google",
};

export const useLoginErrorMessage = (): string => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messageToReturn, setMessageToReturn] = useState("");

  useEffect(() => {
    const error = searchParams.get("error");
    const message = searchParams.get("message");

    const hasMessageToShow =
      error !== null && !isNil(message) && message !== "";

    if (hasMessageToShow) {
      sentryException({
        message: message,
      });
      setMessageToReturn(message);

      setSearchParams({});
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

      default:
        break;
    }

    setSearchParams({});
    // we only care for the URL at page load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return messageToReturn;
};
