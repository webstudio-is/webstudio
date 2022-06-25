import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export const LOGIN_ERROR_CODES = {
  LOGIN_DEV: "login_dev",
  LOGIN_GITHUB: "login_github",
  LOGIN_GOOGLE: "login_google",
};

export const LOGIN_ERROR_MESSAGES = {
  [LOGIN_ERROR_CODES.LOGIN_DEV]:
    "There has been an issue logging you in with dev",
  [LOGIN_ERROR_CODES.LOGIN_GITHUB]:
    "There has been an issue logging you in with Github",
  [LOGIN_ERROR_CODES.LOGIN_GOOGLE]:
    "There has been an issue logging you in with Google",
};

export const useLoginErrors = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const error = searchParams.get("error");
  const message = searchParams.get("message");
  useEffect(() => {
    if (error !== null && !!message) {
      console.log(message);
      alert(message);

      setSearchParams({});
      return;
    }

    switch (error) {
      case LOGIN_ERROR_CODES.LOGIN_DEV:
        alert(LOGIN_ERROR_MESSAGES[LOGIN_ERROR_CODES.LOGIN_DEV]);
        break;
      case LOGIN_ERROR_CODES.LOGIN_GITHUB:
        alert(LOGIN_ERROR_MESSAGES[LOGIN_ERROR_CODES.LOGIN_GITHUB]);
        break;
      case LOGIN_ERROR_CODES.LOGIN_GOOGLE:
        alert(LOGIN_ERROR_MESSAGES[LOGIN_ERROR_CODES.LOGIN_GOOGLE]);
        break;

      default:
        break;
    }

    setSearchParams({});
  }, [error, message, searchParams, setSearchParams]);
};
