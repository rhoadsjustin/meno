/**
 * A translation catalog has exactly the English catalog's keys, with any
 * string as the value. Every non-English locale file is checked against it
 * with `satisfies Catalog<typeof en>`, so a missing or stray key is a type
 * error rather than a blank label at runtime.
 */
export type Catalog<T> = {
  [K in keyof T]: T[K] extends string ? string : Catalog<T[K]>;
};
