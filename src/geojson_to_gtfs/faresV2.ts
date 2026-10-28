/**
 * GTFS-Fares V2 rows, derived from the fares already resolved per route
 * for V1 (`resolveRouteFare` / `fareBuilder`). Written only with
 * `GTFSOptions.faresV2`; V1 is written as before, the reference allows
 * both in one dataset and recommends that consumers prefer V2.
 * https://gtfs.org/documentation/schedule/reference/#fare_attributestxt
 *
 * Modeling (the "Route-Based Fares" and "Rider Categories" patterns of
 * https://gtfs.org/resources/gtfs-schedule-feature-guides/fares/intro/):
 *
 *   fare_products.txt    one product per distinct (amount, currency, rider
 *                        category): `BOB_3.00` for a general fare,
 *                        `BOB_1.00_estudiante` for a category. The general
 *                        product has an empty `rider_category_id` (any
 *                        rider); a category product has one. No
 *                        `fare_media_id`: empty means "unknown media".
 *                        `fare_product_name` is the amount text, because
 *                        OpenTripPlanner 2.x requires a name.
 *   rider_categories.txt one row per category id, named as first seen,
 *                        `is_default_fare_category` 0: the general fare is
 *                        the product without a category, so no product has
 *                        several eligible categories to pick a default from.
 *   networks.txt +       one network per distinct fare (general product +
 *   route_networks.txt   categories), `fare_0`, `fare_1`… in order of first
 *                        appearance; routes with the same fare share it
 *                        whatever their agency. Allowed because routes.txt
 *                        has no `network_id` column.
 *   fare_leg_rules.txt   one row per (network, product): a leg on a route
 *                        of the network is paid with the general product
 *                        or with the product of the rider's category.
 *
 * Not written, because the data has nothing to put in them:
 * `fare_media.txt` (V1 `payment_method` has no V2 field),
 * `fare_transfer_rules.txt` (no transfer pricing is known: every leg is
 * paid, which is V1 `transfers` 0), `timeframes.txt`, `areas.txt`,
 * `stop_areas.txt` (no time- or zone-based prices).
 */
import type {
  GTFSFareLegRule,
  GTFSFareProduct,
  GTFSNetwork,
  GTFSRiderCategory,
  GTFSRouteNetwork,
} from '../types';
import { faresV2Key } from './fares';
import type { ResolvedFare } from './fares';

/**
 * ISO 4217 minor units other than 2, from list-one.xml of the ISO 4217
 * maintenance agency (SIX, published 2026-09-17); funds and precious
 * metals (N.A.) are left at 2. The reference wants `amount` with exactly
 * the currency's number of decimals ("2.00", not "2").
 */
const MINOR_UNITS_0 = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);
const MINOR_UNITS_3 = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);
const MINOR_UNITS_4 = new Set(['CLF', 'UYW']);

export function currencyMinorUnits(currency: string): number {
  if (MINOR_UNITS_0.has(currency)) return 0;
  if (MINOR_UNITS_3.has(currency)) return 3;
  if (MINOR_UNITS_4.has(currency)) return 4;
  return 2;
}

/**
 * `amount` as the reference wants it: the ISO 4217 decimals of the
 * currency ("3.00" BOB, "200" JPY, "1.500" KWD). A price with more
 * decimals than the currency has is rounded, with a warning: it is a
 * data problem the feed cannot carry.
 */
export function formatCurrencyAmount(price: number, currency: string): string {
  const decimals = currencyMinorUnits(currency);
  const text = price.toFixed(decimals);
  if (Number(text) !== price) {
    console.warn(
      `faresV2: amount ${price} ${currency} rounded to ${text} (${currency} has ${decimals} decimal places)`,
    );
  }
  return text;
}

export interface FaresV2Rows {
  fare_products: GTFSFareProduct[];
  rider_categories: GTFSRiderCategory[];
  fare_leg_rules: GTFSFareLegRule[];
  networks: GTFSNetwork[];
  route_networks: GTFSRouteNetwork[];
}

/** One route with the fare chosen for it, in `routes.txt` order. */
export interface RouteWithFare {
  routeId: string | number;
  fare: ResolvedFare;
}

/**
 * Build the five files from the per-route fares. Pure and deterministic:
 * ids depend only on the fares and on the order of the routes.
 */
export function buildFaresV2(routes: RouteWithFare[]): FaresV2Rows {
  const rows: FaresV2Rows = {
    fare_products: [],
    rider_categories: [],
    fare_leg_rules: [],
    networks: [],
    route_networks: [],
  };
  const products = new Set<string>();
  const categories = new Map<string, GTFSRiderCategory>();
  const networks = new Map<string, string>(); // faresV2Key → network_id
  let notExpressed = 0;

  const product = (price: number, currency: string, category?: GTFSRiderCategory): string => {
    const amount = formatCurrencyAmount(price, currency);
    const id = category ? `${currency}_${amount}_${category.rider_category_id}` : `${currency}_${amount}`;
    if (!products.has(id)) {
      products.add(id);
      rows.fare_products.push({
        fare_product_id: id,
        fare_product_name: category ? `${amount} ${currency} (${category.rider_category_name})` : `${amount} ${currency}`,
        rider_category_id: category ? category.rider_category_id : '',
        amount,
        currency,
      });
    }
    return id;
  };

  for (const { routeId, fare } of routes) {
    if (fare.transfers !== 0 || fare.paymentMethod !== 0) notExpressed++;
    const key = faresV2Key(fare);
    let networkId = networks.get(key);
    if (networkId === undefined) {
      networkId = `fare_${networks.size}`;
      networks.set(key, networkId);
      rows.networks.push({ network_id: networkId });
      rows.fare_leg_rules.push({ network_id: networkId, fare_product_id: product(fare.price, fare.currency) });
      for (const c of fare.riderCategories) {
        let category = categories.get(c.id);
        if (!category) {
          category = { rider_category_id: c.id, rider_category_name: c.name, is_default_fare_category: 0 };
          categories.set(c.id, category);
          rows.rider_categories.push(category);
        }
        rows.fare_leg_rules.push({ network_id: networkId, fare_product_id: product(c.price, fare.currency, category) });
      }
    }
    rows.route_networks.push({ network_id: networkId, route_id: routeId });
  }

  if (notExpressed > 0) {
    console.warn(
      `faresV2: ${notExpressed} route fare(s) have payment_method or transfers other than 0; the Fares V2 files express neither (no fare_media.txt, no fare_transfer_rules.txt): every leg is paid, media unknown`,
    );
  }
  return rows;
}
