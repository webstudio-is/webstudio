export let csrfToken: string | undefined = undefined;

export const updateCsrfToken = (token: string) => {
  csrfToken = token;
};
