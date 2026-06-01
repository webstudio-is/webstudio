const ensureProtocol = (domain: string) => {
  try {
    return new URL(domain);
  } catch {
    const url = new URL(`//${domain}`, "https://default.invalid");
    url.protocol = "https:";
    return url;
  }
};

export const getPublishUrl = ({
  domain,
  pathname,
  password,
  username,
}: {
  domain: string;
  pathname: string;
  username?: string;
  password?: string;
}) => {
  const url = ensureProtocol(domain);
  url.pathname = pathname || "/";

  if (username && password) {
    url.username = username;
    url.password = password;
  }

  return url;
};
