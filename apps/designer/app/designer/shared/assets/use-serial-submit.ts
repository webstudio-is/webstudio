import { useActionData, useSubmit, type SubmitOptions } from "@remix-run/react";
import { useCallback, useEffect, useRef, useState } from "react";

const initialSubmission: {
  data: Array<[string, FormDataEntryValue]>;
  options: SubmitOptions;
} = {
  data: [],
  options: {},
};

/**
 * Wrapps useSubmit hook to submit form data serially.
 * This is useful when you want to submit multiple files, but send them one after another.
 * Specifically Vercel has a single upload limit of 4.5MB, so we need to send them one by one so that this limit is per file, not per total upload
 */
export const useSerialSubmit = () => {
  const submit = useSubmit();
  const actionData = useActionData();
  const [submission, setSubmission] =
    useState<typeof initialSubmission>(initialSubmission);
  const submittedRef = useRef(new Map());

  useEffect(() => {
    const submitted = submittedRef.current;
    for (const entry of submission.data) {
      if (submitted.has(entry) === false) {
        const data = new FormData();
        data.append(entry[0], entry[1]);
        submit(data, submission.options);
        submitted.set(entry, true);
        break;
      }
    }
  }, [actionData, submission, submit]);

  return useCallback((formData: FormData, options: SubmitOptions) => {
    const data = Array.from(formData.entries());
    setSubmission({ data, options });
  }, []);
};
