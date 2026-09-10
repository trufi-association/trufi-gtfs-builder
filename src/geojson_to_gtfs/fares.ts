/**
 * Fare resolution for GTFS-Fares V1 (`fare_attributes.txt` + `fare_rules.txt`).
 *
 * Source of truth is the OSM route relation:
 *
 *   - `charge=*`  — "<amount> <ISO 4217 code>[/<unit>]", several values
 *                    separated by `;` (e.g. `3 BOB/person;1 BOB/student`).
 *                    The FIRST value is the general fare; the rest are rider
 *                    categories, kept in `parseChargeEntries` for Fares V2.
 *                    https://wiki.openstreetmap.org/wiki/Key:charge
 *   - `fee=no`    — the route is free (price 0 is a true statement).
 *                    https://wiki.openstreetmap.org/wiki/Key:fee
 *
 * When OSM says nothing, the config decides (`defaultFares.price` or the
 * per-route `fare` resolver). When nobody knows the price, NO fare row is
 * emitted: `fare_attributes.txt` is optional in GTFS while `price` is a
 * required non-negative float, so writing `0` would claim the ride is free.
 * The same goes for the currency: there is no implicit default, a fare
 * whose currency nobody set is not written either.
 * https://gtfs.org/documentation/schedule/reference/#fare_attributestxt
 */
import type { DefaultFaresConfig, FareResolver, GeoJSONFeature, RouteFare } from '../types';

/** One `charge=*` value, e.g. `3.50 BOB/persona`. */
export interface ChargeEntry {
  /** Amount in `currency` units. */
  price: number;
  /** Currency as written in the tag: three upper-case letters (the ISO 4217
      form; the code list itself is not checked). Missing for a bare number. */
  currency?: string;
  /** Text after the first `/` (person, hour, student, …), if any. */
  unit?: string;
  /** The value as written in OSM, trimmed. */
  raw: string;
}

/**
 * The shape of an ISO 4217 code: three upper-case letters. Whether the code
 * exists in the ISO list is out of scope here — gtfs-validator reports that
 * as `invalid_currency`.
 */
export const CURRENCY_CODE = /^[A-Z]{3}$/;

// "<amount> <CCY>" — the documented form — plus lenient variants that show up
// in the wild: no space ("3BOB"), comma decimals ("3,50 BOB"), a bare amount
// ("3", currency taken from the config) and currency-first ("BOB 3").
// The currency must have the ISO 4217 form (see CURRENCY_CODE). Currency
// signs, local abbreviations ("Bs", "$") and lower-case tokens ("bob") are
// rejected on purpose: the wiki asks for the ISO code, nothing else.
const AMOUNT_FIRST = /^(\d+(?:[.,]\d+)?)(?:\s*([A-Z]{3}))?$/;
const CURRENCY_FIRST = /^([A-Z]{3})\s*(\d+(?:[.,]\d+)?)$/;

function parseAmount(token: string): number {
  return Number(token.replace(',', '.'));
}

/**
 * Parse every `;`-separated value of a `charge=*` tag. Unparseable values
 * are skipped (the caller decides whether to warn). Returns [] for empty or
 * non-string input.
 */
export function parseChargeEntries(value: unknown): ChargeEntry[] {
  if (typeof value !== 'string') return [];
  const entries: ChargeEntry[] = [];
  for (const segment of value.split(';')) {
    const raw = segment.trim();
    if (!raw) continue;
    const slash = raw.indexOf('/');
    const head = (slash >= 0 ? raw.slice(0, slash) : raw).trim();
    const unit = slash >= 0 ? raw.slice(slash + 1).trim() || undefined : undefined;

    let amount: string | undefined;
    let currency: string | undefined;
    let match = AMOUNT_FIRST.exec(head);
    if (match) {
      amount = match[1];
      currency = match[2];
    } else if ((match = CURRENCY_FIRST.exec(head))) {
      currency = match[1];
      amount = match[2];
    }
    if (amount === undefined) continue;

    const price = parseAmount(amount);
    if (!Number.isFinite(price) || price < 0) continue;
    entries.push({ price, currency, unit, raw });
  }
  return entries;
}

/**
 * The general fare of a `charge=*` tag: its first parseable value, with
 * `defaultCurrency` filling in when the value carries no ISO code.
 * `undefined` when nothing parseable is there, or when the value has no
 * code and `defaultCurrency` is empty.
 */
export function parseCharge(
  value: unknown,
  defaultCurrency: string,
): { price: number; currency: string } | undefined {
  const [first] = parseChargeEntries(value);
  if (!first) return undefined;
  const currency = first.currency ?? defaultCurrency;
  if (!currency) return undefined;
  return { price: first.price, currency };
}

/**
 * What OSM alone says about a route's fare: `charge=*` when present (wins
 * over `fee`), `fee=no` → free, otherwise unknown. `defaultCurrency` is
 * `defaultFares.currencyType` ('' when not configured): a bare amount or a
 * `fee=no` without it cannot become a row — `currency_type` is required
 * even for a free ride — so they are ignored with a warning that says so.
 */
export function osmRouteFare(
  properties: { [key: string]: any },
  defaultCurrency: string,
): RouteFare | undefined {
  const url = `https://www.osm.org/relation/${properties.id}`;
  if (properties.charge !== undefined) {
    const [first] = parseChargeEntries(properties.charge);
    if (!first) {
      console.warn(`fare: could not parse charge="${properties.charge}" on ${url}; ignoring it`);
    } else if (first.currency || defaultCurrency) {
      return { price: first.price, currency: first.currency ?? defaultCurrency, source: 'osm' };
    } else {
      console.warn(
        `fare: charge="${properties.charge}" on ${url} has no currency code and defaultFares.currencyType is not set; ignoring it`,
      );
    }
  }
  if (properties.fee === 'no') {
    if (!defaultCurrency) {
      console.warn(
        `fare: fee=no on ${url} but defaultFares.currencyType is not set; GTFS needs a currency_type even for a free ride, ignoring it`,
      );
      return undefined;
    }
    return { price: 0, currency: defaultCurrency, source: 'osm' };
  }
  return undefined;
}

// Allowed values of fare_attributes.txt per the GTFS reference
// (https://gtfs.org/documentation/schedule/reference/#fare_attributestxt):
//   price          non-negative float, required
//   currency_type  ISO 4217 code, required
//   payment_method 0 = paid on board, 1 = paid before boarding; required
//   transfers      0, 1, 2, or empty = unlimited transfers; required
// In `RouteFare` / `DefaultFaresConfig`, `null` stands for the empty value
// and `undefined` for "not set, use the next default".
const PAYMENT_METHODS: unknown[] = [0, 1];
const TRANSFERS: unknown[] = [0, 1, 2, null, undefined];

function isNonNegativeNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * A fare produced by config (a `fare` resolver) that GTFS could not take
 * is a config bug, so it throws — as an invalid `defaultCalendar` string
 * does — instead of being dropped or rewritten quietly. The TypeScript
 * types already forbid these values; this catches JS configs and computed
 * values.
 */
function assertValidFare(fare: RouteFare, origin: string, url: string): void {
  const reject = (what: string): never => {
    throw new Error(`fare: ${origin} returned ${what} for ${url}: ${JSON.stringify(fare)}`);
  };
  if (!isNonNegativeNumber(fare.price)) reject('a price that is not a non-negative number');
  if (typeof fare.currency !== 'string' || !CURRENCY_CODE.test(fare.currency.trim())) {
    reject('a currency that is not an ISO 4217 code (three upper-case letters)');
  }
  if (fare.paymentMethod !== undefined && !PAYMENT_METHODS.includes(fare.paymentMethod)) {
    reject('a paymentMethod outside 0 | 1');
  }
  if (!TRANSFERS.includes(fare.transfers)) reject('transfers outside 0 | 1 | 2 | null (unlimited)');
}

/**
 * Validate `defaultFares` once per run and return it normalized:
 * `currencyType` trimmed, '' when not set ("no currency known"). Invalid
 * values throw — it is config.
 */
export function normalizeDefaultFares(defaultFares: DefaultFaresConfig): DefaultFaresConfig {
  const currencyType = String(defaultFares.currencyType ?? '').trim();
  const fail = (what: string): never => {
    throw new Error(`fare: defaultFares ${what}: ${JSON.stringify(defaultFares)}`);
  };
  if (currencyType && !CURRENCY_CODE.test(currencyType)) {
    fail('currencyType must be an ISO 4217 code (three upper-case letters)');
  }
  if (defaultFares.price !== undefined) {
    if (!isNonNegativeNumber(defaultFares.price)) fail('price must be a non-negative number');
    if (!currencyType) fail('price needs a currencyType');
  }
  if (defaultFares.paymentMethod !== undefined && !PAYMENT_METHODS.includes(defaultFares.paymentMethod)) {
    fail('paymentMethod must be 0 | 1');
  }
  if (!TRANSFERS.includes(defaultFares.transfers)) fail('transfers must be 0 | 1 | 2 | null (unlimited)');
  return { ...defaultFares, currencyType };
}

/** A fare with every optional field filled in, ready to become a row. */
export interface ResolvedFare {
  price: number;
  currency: string;
  paymentMethod: 0 | 1;
  /** 0 | 1 | 2, or '' for "unlimited" (GTFS: empty value). */
  transfers: 0 | 1 | 2 | '';
  source: string;
}

/**
 * Resolve the fare of one route relation.
 *
 *   1. OSM (`charge=*` / `fee=no`) is parsed into `osmFare`.
 *   2. With a `fare` resolver, its return value is final — it receives
 *      `osmFare` so it can pass it through, override it, or return
 *      `undefined` to say "unknown, emit nothing". An invalid fare throws.
 *   3. Without a resolver: `osmFare`, else `defaultFares.price` (if set),
 *      else `undefined`.
 *
 * `paymentMethod` and `transfers` fall back to `defaultFares`, then to 0
 * (paid on board, no transfers) — the pay-per-boarding model of every
 * network this builder targets. `defaultFares` is expected normalized
 * (`normalizeDefaultFares`).
 */
export function resolveRouteFare(
  feature: GeoJSONFeature,
  defaultFares: DefaultFaresConfig,
  fareResolver?: FareResolver,
): ResolvedFare | undefined {
  const properties = feature.properties || {};
  const osmFare = osmRouteFare(properties, defaultFares.currencyType);

  let fare: RouteFare | undefined;
  if (fareResolver) {
    fare = fareResolver(feature, osmFare);
    if (fare) assertValidFare(fare, 'the fare resolver', `https://www.osm.org/relation/${properties.id}`);
  } else if (osmFare) {
    fare = osmFare;
  } else if (defaultFares.price !== undefined) {
    fare = { price: defaultFares.price, currency: defaultFares.currencyType, source: 'config' };
  }
  if (!fare) return undefined;

  const transfers = fare.transfers !== undefined ? fare.transfers : defaultFares.transfers;
  return {
    price: fare.price,
    currency: fare.currency.trim(),
    paymentMethod: fare.paymentMethod ?? defaultFares.paymentMethod ?? 0,
    // null = "unlimited transfers" → GTFS empty value; unset → 0.
    transfers: transfers === null ? '' : transfers ?? 0,
    source: fare.source ?? (fareResolver ? 'resolver' : 'config'),
  };
}

/** Identity of a fare row: two routes with equal keys share one fare_id. */
export function fareKey(agencyId: number, fare: ResolvedFare): string {
  return `${agencyId}|${fare.price}|${fare.currency}|${fare.paymentMethod}|${fare.transfers}`;
}

/**
 * Pick ONE fare for a route whose OSM relations (variants, directions)
 * resolved to different fares. Deterministic: fares that come from OSM
 * (`source === 'osm'`) beat config-derived ones; then the lowest price;
 * then a stable string order. The caller logs the disagreement.
 */
export function pickRouteFare(
  candidates: Array<{ fare: ResolvedFare; relationId: number | string }>,
): { fare: ResolvedFare; relationId: number | string } {
  return [...candidates].sort((a, b) => {
    const aOsm = a.fare.source === 'osm' ? 0 : 1;
    const bOsm = b.fare.source === 'osm' ? 0 : 1;
    if (aOsm !== bOsm) return aOsm - bOsm;
    if (a.fare.price !== b.fare.price) return a.fare.price - b.fare.price;
    const ka = fareKey(0, a.fare);
    const kb = fareKey(0, b.fare);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  })[0];
}

export function describeFare(fare: ResolvedFare): string {
  return `${fare.price} ${fare.currency}`;
}
