import { forwardRef, type ComponentProps, type ElementRef } from "react";

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
  return;
};

const timeStyleOrUndefined = (
  value: unknown
): Intl.DateTimeFormatOptions["timeStyle"] => {
  if (["full", "long", "medium", "short"].includes(value as string)) {
    return value as Intl.DateTimeFormatOptions["timeStyle"];
  }
  return;
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

/**
 * Format a date using a template string.
 * Supports tokens: YYYY, YY, MMMM, MMM, MM, M, DDDD, DDD, DD, D, HH, H, mm, m, ss, s
 * Example: formatDate(new Date(), "YYYY-MM-DD HH:mm:ss", "en-US") => "2025-11-03 18:47:25"
 * Example: formatDate(new Date(), "DDDD, MMMM D, YYYY", "en-US") => "Monday, November 3, 2025"
 */
const formatDate = (date: Date, template: string, locale = "en-US"): string => {
  const pad = (n: number, length = 2) => String(n).padStart(length, "0");

  // Get localized day and month names
  const longDayName = new Intl.DateTimeFormat(locale, {
    weekday: "long",
  }).format(date);
  const shortDayName = new Intl.DateTimeFormat(locale, {
    weekday: "short",
  }).format(date);
  const longMonthName = new Intl.DateTimeFormat(locale, {
    month: "long",
  }).format(date);
  const shortMonthName = new Intl.DateTimeFormat(locale, {
    month: "short",
  }).format(date);

  const tokens: Record<string, string | number> = {
    YYYY: date.getFullYear(),
    YY: String(date.getFullYear()).slice(-2),
    MMMM: longMonthName,
    MMM: shortMonthName,
    MM: pad(date.getMonth() + 1),
    M: date.getMonth() + 1,
    DDDD: longDayName,
    DDD: shortDayName,
    DD: pad(date.getDate()),
    D: date.getDate(),
    HH: pad(date.getHours()),
    H: date.getHours(),
    mm: pad(date.getMinutes()),
    m: date.getMinutes(),
    ss: pad(date.getSeconds()),
    s: date.getSeconds(),
  };

  // Sort tokens by length (longest first) to avoid partial replacements
  // e.g., replace MMMM before MMM, DDDD before DDD
  const sortedTokens = Object.keys(tokens).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${sortedTokens.join("|")})\\b`, "g");

  return template.replace(pattern, (match) => String(tokens[match]));
};

type TimeProps = Pick<ComponentProps<"time">, "dateTime"> & {
  language?: Language;
  country?: Country;
  dateStyle?: DateStyle;
  timeStyle?: TimeStyle;
  /**
   * Custom format template. Overrides Date Style and Time Style.
   *
   * Tokens: YYYY/YY (year), MMMM/MMM/MM/M (month), DDDD/DDD/DD/D (day), HH/H (hours), mm/m (minutes), ss/s (seconds)
   *
   * Examples:
   * - "YYYY-MM-DD" → 2025-11-03
   * - "DDDD, MMMM D" → Monday, November 3
   * - "DDD, D. MMM YYYY" → Mon, 3. Nov 2025
   *
   * Day and month names use the selected language.
   */
  format?: string;
};

export const Time = forwardRef<ElementRef<"time">, TimeProps>(
  (
    {
      language = DEFAULT_LANGUAGE,
      country = DEFAULT_COUNTRY,
      dateStyle = DEFAULT_DATE_STYLE,
      timeStyle = DEFAULT_TIME_STYLE,
      format,
      // native html attribute in react style
      dateTime = INITIAL_DATE_STRING,
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
      dateTime === null ? INVALID_DATE_STRING : dateTime.toString();

    const date = parseDate(datetimeString);
    let formattedDate = datetimeString;

    if (date) {
      // Use custom format template if provided
      if (format) {
        try {
          formattedDate = formatDate(date, format, locale);
        } catch {
          /* Do Nothing */
        }
      } else {
        // Otherwise use Intl.DateTimeFormat
        try {
          formattedDate = new Intl.DateTimeFormat(locale, options).format(date);
        } catch {
          /* Do Nothing */
        }
      }
    }

    return (
      <time ref={ref} dateTime={datetimeString} {...props}>
        {formattedDate}
      </time>
    );
  }
);

export const __testing__ = {
  parseDate,
  formatDate,
};
