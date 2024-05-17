import * as React from "react";

const languages = [
  "af",
  "am",
  "ar",
  "az",
  "be",
  "bg",
  "bn",
  "bs",
  "ca",
  "cs",
  "cy",
  "da",
  "de",
  "el",
  "en",
  "es",
  "et",
  "eu",
  "fa",
  "fi",
  "fr",
  "ga",
  "gl",
  "gu",
  "he",
  "hi",
  "hr",
  "hu",
  "hy",
  "id",
  "is",
  "it",
  "ja",
  "ka",
  "kk",
  "km",
  "kn",
  "ko",
  "ky",
  "lb",
  "lt",
  "lv",
  "mk",
  "ml",
  "mn",
  "mr",
  "ms",
  "mt",
  "nb",
  "nl",
  "nn",
  "pl",
  "pt",
  "ro",
  "ru",
  "si",
  "sk",
  "sl",
  "sq",
  "sr",
  "sv",
  "sw",
  "ta",
  "te",
  "th",
  "tr",
  "uk",
  "ur",
  "uz",
  "vi",
  "zh",
] as const;

const countries = [
  "AF",
  "AL",
  "DZ",
  "AS",
  "AD",
  "AO",
  "AI",
  "AQ",
  "AG",
  "AR",
  "AM",
  "AW",
  "AU",
  "AT",
  "AZ",
  "BS",
  "BH",
  "BD",
  "BB",
  "BY",
  "BE",
  "BZ",
  "BJ",
  "BM",
  "BT",
  "BO",
  "BA",
  "BW",
  "BR",
  "BN",
  "BG",
  "BF",
  "BI",
  "CV",
  "KH",
  "CM",
  "CA",
  "KY",
  "CF",
  "TD",
  "CL",
  "CN",
  "CO",
  "KM",
  "CG",
  "CD",
  "CR",
  "HR",
  "CU",
  "CY",
  "CZ",
  "DK",
  "DJ",
  "DM",
  "DO",
  "EC",
  "EG",
  "SV",
  "GQ",
  "ER",
  "EE",
  "SZ",
  "ET",
  "FJ",
  "FI",
  "FR",
  "GA",
  "GM",
  "GE",
  "DE",
  "GH",
  "GR",
  "GD",
  "GT",
  "GN",
  "GW",
  "GY",
  "HT",
  "HN",
  "HU",
  "IS",
  "IN",
  "ID",
  "IR",
  "IQ",
  "IE",
  "IL",
  "IT",
  "JM",
  "JP",
  "JO",
  "KZ",
  "KE",
  "KI",
  "KP",
  "KR",
  "KW",
  "KG",
  "LA",
  "LV",
  "LB",
  "LS",
  "LR",
  "LY",
  "LI",
  "LT",
  "LU",
  "MG",
  "MW",
  "MY",
  "MV",
  "ML",
  "MT",
  "MH",
  "MR",
  "MU",
  "MX",
  "FM",
  "MD",
  "MC",
  "MN",
  "ME",
  "MA",
  "MZ",
  "MM",
  "NA",
  "NR",
  "NP",
  "NL",
  "NZ",
  "NI",
  "NE",
  "NG",
  "NO",
  "OM",
  "PK",
  "PW",
  "PA",
  "PG",
  "PY",
  "PE",
  "PH",
  "PL",
  "PT",
  "QA",
  "RO",
  "RU",
  "RW",
  "KN",
  "LC",
  "VC",
  "WS",
  "SM",
  "ST",
  "SA",
  "SN",
  "RS",
  "SC",
  "SL",
  "SG",
  "SK",
  "SI",
  "SB",
  "SO",
  "ZA",
  "SS",
  "ES",
  "LK",
  "SD",
  "SR",
  "SE",
  "CH",
  "SY",
  "TW",
  "TJ",
  "TZ",
  "TH",
  "TL",
  "TG",
  "TO",
  "TT",
  "TN",
  "TR",
  "TM",
  "TV",
  "UG",
  "UA",
  "AE",
  "GB",
  "US",
  "UY",
  "UZ",
  "VU",
  "VA",
  "VE",
  "VN",
  "YE",
  "ZM",
  "ZW",
] as const;

type Language = (typeof languages)[number];
type Country = (typeof countries)[number];
type DateStyle = Intl.DateTimeFormatOptions["dateStyle"] | "none";
type TimeStyle = Intl.DateTimeFormatOptions["timeStyle"] | "none";

export type TimeProps = {
  datetime?: string;
  language?: Language;
  country?: Country;
  dateStyle?: DateStyle;
  timeStyle?: TimeStyle;
};

const INITIAL_DATE_STRING = "dateTime attribute is not set";
const INVALID_DATE_STRING = "";

const DEFAULT_LANGUAGE = "en";
const DEFAULT_COUNTRY = "GB";
const DEFAULT_DATE_STYLE = "medium";
const DEFAULT_TIME_STYLE = "none";

const languageOrDefault = (language: unknown): Language => {
  return languages.includes(language as Language)
    ? (language as Language)
    : DEFAULT_LANGUAGE;
};

const countryOrDefault = (country: unknown): Country => {
  return countries.includes(country as Country)
    ? (country as Country)
    : DEFAULT_COUNTRY;
};

const dateStyleOrUndefined = (
  value: unknown
): Intl.DateTimeFormatOptions["dateStyle"] => {
  if (["full", "long", "medium", "short"].includes(value as string)) {
    return value as Intl.DateTimeFormatOptions["dateStyle"];
  }
  return undefined;
};

const timeStyleOrUndefined = (
  value: unknown
): Intl.DateTimeFormatOptions["timeStyle"] => {
  if (["full", "long", "medium", "short"].includes(value as string)) {
    return value as Intl.DateTimeFormatOptions["timeStyle"];
  }
  return undefined;
};

export const Time = React.forwardRef<React.ElementRef<"time">, TimeProps>(
  (
    {
      language = DEFAULT_LANGUAGE,
      country = DEFAULT_COUNTRY,
      dateStyle = DEFAULT_DATE_STYLE,
      timeStyle = DEFAULT_TIME_STYLE,
      datetime = INITIAL_DATE_STRING,
      ...props
    },
    ref
  ) => {
    const locale = `${languageOrDefault(language)}-${countryOrDefault(
      country
    )}`;

    const options: Intl.DateTimeFormatOptions = {
      dateStyle: dateStyleOrUndefined(dateStyle),
      timeStyle: timeStyleOrUndefined(timeStyle),
    };

    const datetimeString =
      datetime === null ? INVALID_DATE_STRING : datetime.toString();

    const date = new Date(datetimeString);
    const isValidDate = false === Number.isNaN(date.getTime());

    let formattedDate = datetimeString;

    if (isValidDate) {
      try {
        formattedDate = new Intl.DateTimeFormat(locale, options).format(date);
      } catch {
        /* Do Nothing */
      }
    }

    return (
      <time ref={ref} dateTime={datetimeString} {...props}>
        {formattedDate}
      </time>
    );
  }
);
