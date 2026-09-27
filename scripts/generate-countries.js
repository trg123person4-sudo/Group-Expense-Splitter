const wc = require("world-countries");
const fs = require("fs");
const path = require("path");

const fallbackMap = {
  FM: { code: "USD", name: "United States dollar", symbol: "$" },
  BV: { code: "NOK", name: "Norwegian krone", symbol: "kr" },
  HM: { code: "AUD", name: "Australian dollar", symbol: "$" },
  AQ: { code: "USD", name: "United States dollar", symbol: "$" },
};

const currencyMap = new Map();

const countries = wc
  .map((c) => {
    const code = c.cca2;
    const name = c.name?.common || code;
    const flag = c.flag || "🌐";

    const currKeys = c.currencies ? Object.keys(c.currencies) : [];
    let primaryCurrency = null;
    const allCurrencies = [];

    if (currKeys.length > 0) {
      currKeys.forEach((k) => {
        const curr = c.currencies[k];
        const entry = {
          code: k,
          name: curr.name || k,
          symbol: curr.symbol || k,
        };
        allCurrencies.push(entry);
        if (!currencyMap.has(k)) {
          currencyMap.set(k, entry);
        }
      });
      primaryCurrency = allCurrencies[0];
    } else if (fallbackMap[code]) {
      primaryCurrency = fallbackMap[code];
      allCurrencies.push(primaryCurrency);
      if (!currencyMap.has(primaryCurrency.code)) {
        currencyMap.set(primaryCurrency.code, primaryCurrency);
      }
    } else {
      primaryCurrency = { code: "USD", name: "US Dollar", symbol: "$" };
      allCurrencies.push(primaryCurrency);
      if (!currencyMap.has("USD")) {
        currencyMap.set("USD", primaryCurrency);
      }
    }

    return {
      code,
      name,
      flag,
      currencyCode: primaryCurrency.code,
      currencyName: primaryCurrency.name,
      currencySymbol: primaryCurrency.symbol,
      allCurrencies,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const allCurrenciesList = Array.from(currencyMap.values()).sort((a, b) =>
  a.code.localeCompare(b.code)
);

const fileHeader = `// Static lookup table generated from world-countries
export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

export interface CountryItem {
  code: string; // ISO 3166-1 alpha-2 (e.g. 'US', 'IN')
  name: string; // Common English name
  flag: string; // Flag emoji
  currencyCode: string; // Primary ISO 4217 currency code
  currencyName: string;
  currencySymbol: string;
  allCurrencies: CurrencyInfo[];
}
`;

const fileContent = `${fileHeader}
export const COUNTRIES: CountryItem[] = ${JSON.stringify(countries, null, 2)};

export const ALL_CURRENCIES: CurrencyInfo[] = ${JSON.stringify(allCurrenciesList, null, 2)};

const countryMap = new Map<string, CountryItem>();
COUNTRIES.forEach((c) => {
  countryMap.set(c.code.toUpperCase(), c);
});

const currencySet = new Set<string>();
ALL_CURRENCIES.forEach((c) => {
  currencySet.add(c.code.toUpperCase());
});

export function getCountryByCode(code: string): CountryItem | undefined {
  if (!code) return undefined;
  return countryMap.get(code.toUpperCase());
}

export function isValidCountryCode(code: string): boolean {
  if (!code) return false;
  return countryMap.has(code.toUpperCase());
}

export function isValidCurrencyCode(code: string): boolean {
  if (!code) return false;
  return currencySet.has(code.toUpperCase());
}
`;

const targetPath = path.resolve(__dirname, "../src/lib/countries.ts");
fs.writeFileSync(targetPath, fileContent, "utf-8");
console.log(
  `Generated src/lib/countries.ts with ${countries.length} countries and ${allCurrenciesList.length} currencies.`
);
