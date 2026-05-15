export const COUNTRIES = {
  ENGLAND: {
    code: "ENG",
    label: "England",
    color: "bg-red-50 text-red-600",
    dot: "bg-red-400",
  },
  SCOTLAND: {
    code: "SCT",
    label: "Scotland",
    color: "bg-blue-50 text-blue-600",
    dot: "bg-blue-400",
  },
  // WALES:            { code: 'WLS', label: 'Wales',            color: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-400' },
  NORTHERN_IRELAND: {
    code: "NIR",
    label: "Northern Ireland",
    color: "bg-amber-50 text-amber-600",
    dot: "bg-amber-400",
  },
} as const;

export type CountryKey = keyof typeof COUNTRIES;

/** Maps persisted user `country` label (DB) to API `country_code`. */
export const COUNTRY_LABEL_TO_CODE: Record<string, string> = Object.fromEntries(
  (Object.keys(COUNTRIES) as CountryKey[]).map((k) => [
    COUNTRIES[k].label,
    COUNTRIES[k].code,
  ]),
);

export const DEFAULT_COUNTRY_CODE = COUNTRIES.ENGLAND.code;
