import { validateBasicAuth } from "@webstudio-is/wsauth";

export const validateBasicAuthCredentials = ({
  login,
  password,
}: {
  login: string;
  password: string;
}) => validateBasicAuth({ login, password }).errors;
