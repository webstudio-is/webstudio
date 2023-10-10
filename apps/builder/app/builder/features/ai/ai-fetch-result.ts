// import { restAi } from "~/shared/router-utils";

export const fetchResult = async (text: string) => {
  /*
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${restAi()}/blabla`, {
    method: "POST",
    body: formData,
  });

  if (response.ok === false) {
    // @todo: show error
    return;
  }

  // @todo add response parsing
  const { text } = await response.json();
  */

  // return text;
  await new Promise((resolve) => setTimeout(resolve, 10000));
};
