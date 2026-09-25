export type BasicAuthRule = {
  method: "basic";
  login: string;
  password: string;
  credentials: string;
};

export type BasicAuthValidation = {
  auth?: BasicAuthRule;
  issues?: BasicAuthIssue[];
  errors?: {
    login?: string[];
    password?: string[];
  };
};

export type BasicAuthIssue = {
  path: ["login"] | ["password"];
  message: string;
};

const basicLoginErrors = (login: string) => {
  const issues: BasicAuthIssue[] = [];
  if (login.length === 0) {
    issues.push({ path: ["login"], message: "Login is required" });
  }
  if (login.includes(":")) {
    issues.push({ path: ["login"], message: "Login can't contain a colon" });
  }
  if (/\s/.test(login)) {
    issues.push({
      path: ["login"],
      message: "Login can't contain whitespace",
    });
  }
  return issues;
};

const basicPasswordErrors = (password: string) => {
  const issues: BasicAuthIssue[] = [];
  if (password.length === 0) {
    issues.push({ path: ["password"], message: "Password is required" });
  }
  if (/\s/.test(password)) {
    issues.push({
      path: ["password"],
      message: "Password can't contain whitespace",
    });
  }
  return issues;
};

export const validateBasicAuth = ({
  login,
  password,
}: {
  login: string;
  password: string;
}): BasicAuthValidation => {
  const issues = [...basicLoginErrors(login), ...basicPasswordErrors(password)];
  if (issues.length > 0) {
    const loginErrors = issues
      .filter((issue) => issue.path[0] === "login")
      .map((issue) => issue.message);
    const passwordErrors = issues
      .filter((issue) => issue.path[0] === "password")
      .map((issue) => issue.message);
    return {
      issues,
      errors: {
        login: loginErrors.length > 0 ? loginErrors : undefined,
        password: passwordErrors.length > 0 ? passwordErrors : undefined,
      },
    };
  }
  return {
    auth: {
      method: "basic",
      login,
      password,
      credentials: `${login}:${password}`,
    },
  };
};
