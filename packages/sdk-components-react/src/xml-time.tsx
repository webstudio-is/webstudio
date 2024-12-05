import { forwardRef, useContext, type ElementRef } from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";

const DEFAULT_DATE_STYLE = "short";
const INITIAL_DATE_STRING = "dateTime attribute is not set";
const INVALID_DATE_STRING = "";

type XmlTimeProps = {
  dateStyle?: "long" | "short";
  datetime: string;
};

const parseDate = (datetimeString: string) => {
  if (datetimeString === "") {
    return;
  }
  let date = new Date(datetimeString);

  // Check if the date already in valid format, e.g. "2024"
  if (Number.isNaN(date.getTime()) === false) {
    return date;
  }

  // If its a number, we assume it's a timestamp and we may need to normalize it
  if (/^\d+$/.test(datetimeString)) {
    let timestamp = Number(datetimeString);
    // Normalize a 10-digit timestamp to 13-digit
    if (datetimeString.length === 10) {
      timestamp *= 1000;
    }
    date = new Date(timestamp);
  }

  if (Number.isNaN(date.getTime()) === false) {
    return date;
  }
};

export const XmlTime = forwardRef<ElementRef<"time">, XmlTimeProps>(
  ({ dateStyle = DEFAULT_DATE_STYLE, datetime = INITIAL_DATE_STRING }, ref) => {
    const { renderer } = useContext(ReactSdkContext);

    const datetimeString =
      datetime === null ? INVALID_DATE_STRING : datetime.toString();

    const date = parseDate(datetimeString);

    let formattedDate = datetimeString;
    if (date) {
      formattedDate = date.toISOString();
      if (dateStyle === "short") {
        formattedDate = formattedDate.split("T")[0];
      }
    }

    if (renderer === undefined) {
      return formattedDate;
    }

    return <time ref={ref}>{formattedDate}</time>;
  }
);
