import type { ActionArgs } from "@remix-run/node";

// @todo: move to AI package
export const action = async ({ request }: ActionArgs) => {
  // @todo: validate request
  const formData = await request.formData();
  formData.append("model", "whisper-1");

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_KEY}`,
      },
      body: formData,
    }
  );

  if (response.ok === false) {
    const txt = await response.text();

    // eslint-disable-next-line no-console
    console.error("ERROR", response.status, txt);

    return {
      success: false,
      error: {
        status: response.status,
        message: txt,
      },
    };
  }

  const data = await response.json();

  return {
    success: true,
    text: data.text,
  };
};
