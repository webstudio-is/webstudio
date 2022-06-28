import { useEffect } from "react";
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

export const useLoginErrors = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const error = searchParams.get("error");
  const message = searchParams.get("message");
  useEffect(() => {
    if (error !== null && Boolean(message)) {
      sentryException({
        message,
      });
      alert(message);

      setSearchParams({});
      return;
    }

    switch (error) {
      case AUTH_PROVIDERS.LOGIN_DEV:
        alert(LOGIN_ERROR_MESSAGES[AUTH_PROVIDERS.LOGIN_DEV]);
        break;
      case AUTH_PROVIDERS.LOGIN_GITHUB:
        alert(LOGIN_ERROR_MESSAGES[AUTH_PROVIDERS.LOGIN_GITHUB]);
        break;
      case AUTH_PROVIDERS.LOGIN_GOOGLE:
        alert(LOGIN_ERROR_MESSAGES[AUTH_PROVIDERS.LOGIN_GOOGLE]);
        break;

      default:
        break;
    }

    setSearchParams({});
  }, [error, message, searchParams, setSearchParams]);
};
