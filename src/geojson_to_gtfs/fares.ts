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
 * https://gtfs.org/documentation/schedule/reference/#fare_attributestxt
 */
import type { DefaultFaresConfig, FareResolver, GeoJSONFeature, RouteFare } from '../types';

/** One `charge=*` value, e.g. `3.50 BOB/persona`. */
export interface ChargeEntry {
  /** Amount in `currency` units. */
  price: number;
  /** ISO 4217 code, upper-cased. Missing when the value was a bare number. */
  currency?: string;
  /** Text after the first `/` (person, hour, student, …), if any. */
  unit?: string;
  /** The value as written in OSM, trimmed. */
  raw: string;
}

// "<amount> <CCY>" — the documented form — plus lenient variants that show up
// in the wild: no space ("3BOB"), comma decimals ("3,50 BOB"), a bare amount
// ("3", currency taken from the config) and currency-first ("BOB 3").
// Currency signs and local abbreviations ("Bs", "$") are rejected on purpose:
// they are not ISO 4217 and the wiki says not to use them.
const AMOUNT_FIRST = /^(\d+(?:[.,]\d+)?)(?:\s*([A-Za-z]{3}))?$/;
const CURRENCY_FIRST = /^([A-Za-z]{3})\s*(\d+(?:[.,]\d+)?)$/;

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
    entries.push({
      price,
      currency: currency ? currency.toUpperCase() : undefined,
      unit,
      raw,
    });
  }
  return entries;
}

/**
 * The general fare of a `charge=*` tag: its first parseable value, with
 * `defaultCurrency` filling in when the value carries no ISO code.
 * `undefined` when nothing parseable is there.
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
 * over `fee`), `fee=no` → free, otherwise unknown.
 */
export function osmRouteFare(
  properties: { [key: string]: any },
  defaultCurrency: string,
): RouteFare | undefined {
  if (properties.charge !== undefined) {
    const charge = parseCharge(properties.charge, defaultCurrency);
    if (charge) return { ...charge, source: 'osm' };
    console.warn(
      `fare: could not parse charge="${properties.charge}" on https://www.osm.org/relation/${properties.id}; ignoring it`,
    );
  }
  if (properties.fee === 'no') {
    return { price: 0, currency: defaultCurrency, source: 'osm' };
  }
  return undefined;
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
 *      `undefined` to say "unknown, emit nothing".
 *   3. Without a resolver: `osmFare`, else `defaultFares.price` (if set),
 *      else `undefined`.
 *
 * `paymentMethod` and `transfers` fall back to `defaultFares`, then to 0
 * (paid on board, no transfers) — the pay-per-boarding model of every
 * network this builder targets.
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
  } else if (osmFare) {
    fare = osmFare;
  } else if (defaultFares.price !== undefined) {
    fare = { price: defaultFares.price, currency: defaultFares.currencyType, source: 'config' };
  }
  if (!fare) return undefined;

  if (!Number.isFinite(fare.price) || fare.price < 0 || !fare.currency) {
    console.warn(
      `fare: ignoring invalid fare ${JSON.stringify(fare)} for https://www.osm.org/relation/${properties.id}`,
    );
    return undefined;
  }

  const transfers = fare.transfers !== undefined ? fare.transfers : defaultFares.transfers;
  return {
    price: fare.price,
    currency: fare.currency.toUpperCase(),
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
