import { mailchannelsHandler } from "@webstudio-is/form-handlers";

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);

    const to = url.searchParams.get("to");

    if (to == null) {
      return new Response(
        `Set "to" query parameter to your email. Example: https://...?to=bob@example.com`
      );
    }

    const formData = new FormData();
    formData.append("ws--form-id", "test-form");
    formData.append("name", "Bob");
    formData.append("time", new Date().toLocaleString("en-US"));

    const result = await mailchannelsHandler({
      formInfo: {
        formData,
        projectId: "test-project",
        pageUrl: "https://example.com/some-page",
        toEmail: to,
        fromEmail: "test@webstudio.is",
      },
    });

    if (result.success) {
      return new Response(`Email sent to ${to}`);
    }

    return new Response(
      `Failed to send email. Errors: ${JSON.stringify(result.errors)}`
    );
  },
};
