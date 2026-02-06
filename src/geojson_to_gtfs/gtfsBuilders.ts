import distanceBetween from '@turf/distance';
import formatTime from './time/formater';
import { loadCustomStops } from '../utils/customStopsLoader';
import { findNearestStop, stopIdToNumber, distanceBetweenCoords, isPointOnRightSide } from '../utils/spatialMatcher';
import { expandSchedule, timeToSeconds, secondsToTime } from './scheduleExpander';
import type {
  GeoJSONFeature,
  GTFSAgency,
  GTFSCalendar,
  GTFSRoute,
  GTFSTrip,
  GTFSFrequency,
  GTFSStop,
  GTFSShape,
  GTFSStopTime,
  GTFSFareAttribute,
  GTFSFareRule,
  GTFSFeedInfo,
  DefaultFaresConfig,
  FeedConfig,
  GeoJSONCoordinate,
  CustomStopsConfig,
  CustomStop,
  StopsMode,
} from '../types';

export function agencyBuilder(
  features: GeoJSONFeature[][],
  defaultAgencyInfo: Partial<GTFSAgency>
): GTFSAgency[] {
  const agencies: GTFSAgency[] = [];
  for (let feature of features) {
    const mainFeature = feature[0];
    const agencyName = mainFeature.properties.operator || 'default';
    let agency = agencies.find((value) => value.agency_name === agencyName);
    if (!agency) {
      agency = {
        agency_id: agencies.length,
        agency_name: agencyName,
        agency_timezone: defaultAgencyInfo.agency_timezone || 'America/La_Paz',
        agency_url: defaultAgencyInfo.agency_url || 'https://www.example.com/',
      };
      agencies.push(agency);
    }
    if (!mainFeature.gtfs) {
      mainFeature.gtfs = {
        agency_id: agency.agency_id,
        route_id: 0,
        services: [],
      };
    } else {
      mainFeature.gtfs.agency_id = agency.agency_id;
    }
  }
  return agencies;
}

// Parse seasonal prefix from opening_hours (e.g., "Dec-Jan:", "Jan-Mar:")
function parseSeasonalPrefix(value: string): { season: string | null; schedule: string } {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthPattern = months.join('|');
  const seasonMatch = value.match(new RegExp(`^\\s*((?:${monthPattern})(?:-(?:${monthPattern}))?):\\s*(.+)$`, 'i'));

  if (seasonMatch) {
    return { season: seasonMatch[1], schedule: seasonMatch[2] };
  }
  return { season: null, schedule: value };
}

export function calendarBuilder(
  features: GeoJSONFeature[][],
  defaultCalendar: (feature: GeoJSONFeature) => string
): GTFSCalendar[] {
  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const services: GTFSCalendar[] = [];
  for (let feature of features) {
    const mainFeature = feature[0];
    if (!mainFeature.gtfs) {
      mainFeature.gtfs = {
        agency_id: 0,
        route_id: 0,
        services: [],
      };
    }
    mainFeature.gtfs.services = [];
    const opening_hours = mainFeature.properties.opening_hours || defaultCalendar(mainFeature);
    const times = opening_hours.split(';');
    times.map(formatTime).map((value: string) => {
      // Skip OSM opening_hours parts that GTFS cannot represent (PH=public holidays, SH=school holidays)
      // See: https://wiki.openstreetmap.org/wiki/Key:opening_hours
      if (value.includes('PH') || value.includes('SH')) {
        return;
      }

      // Parse seasonal prefix if present (e.g., "Dec-Jan: Tu-Su 09:30-23:00")
      const { season, schedule } = parseSeasonalPrefix(value);

      const dualTimeMatch = schedule.match(
        '((Mo|Tu|We|Th|Fr|Sa|Su)-(Mo|Tu|We|Th|Fr|Sa|Su)) (([01][0-9]|2[0-4]):([0-5][0-9]))-(([01][0-9]|2[0-4]):([0-5][0-9]))'
      );
      if (dualTimeMatch && dualTimeMatch.length === 10) {
        // Include season in service_id to make it unique
        const baseServiceId = dualTimeMatch[1];
        const serviceId = season ? `${baseServiceId}-${season}` : baseServiceId;

        let service = services.find((value) => value.service_id === serviceId);
        if (!service) {
          const init = days.indexOf(dualTimeMatch[2]);
          const end = days.indexOf(dualTimeMatch[3]);
          service = {
            service_id: serviceId,
            monday: init <= 0 && 0 <= end ? 1 : 0,
            tuesday: init <= 1 && 1 <= end ? 1 : 0,
            wednesday: init <= 2 && 2 <= end ? 1 : 0,
            thursday: init <= 3 && 3 <= end ? 1 : 0,
            friday: init <= 4 && 4 <= end ? 1 : 0,
            saturday: init <= 5 && 5 <= end ? 1 : 0,
            sunday: init <= 6 && 6 <= end ? 1 : 0,
            start_date: '20000101',
            end_date: '21000101',
          };
          services.push(service);
        }
        mainFeature.gtfs!.services.push({
          service_id: serviceId,
          startTime: dualTimeMatch[4],
          endTime: dualTimeMatch[7],
        });
      } else {
        const singleTimeMatch = schedule.match(
          '(Mo|Tu|We|Th|Fr|Sa|Su) (([01][0-9]|2[0-4]):([0-5][0-9]))-(([01][0-9]|2[0-4]):([0-5][0-9]))'
        );
        if (singleTimeMatch && singleTimeMatch.length === 8) {
          // Include season in service_id to make it unique
          const baseServiceId = singleTimeMatch[1];
          const serviceId = season ? `${baseServiceId}-${season}` : baseServiceId;

          let service = services.find((value) => value.service_id === serviceId);
          if (!service) {
            const day = singleTimeMatch[1];
            service = {
              service_id: serviceId,
              monday: day === 'Mo' ? 1 : 0,
              tuesday: day === 'Tu' ? 1 : 0,
              wednesday: day === 'We' ? 1 : 0,
              thursday: day === 'Th' ? 1 : 0,
              friday: day === 'Fr' ? 1 : 0,
              saturday: day === 'Sa' ? 1 : 0,
              sunday: day === 'Su' ? 1 : 0,
              start_date: '20000101',
              end_date: '21000101',
            };
            services.push(service);
          }
          mainFeature.gtfs!.services.push({
            service_id: serviceId,
            startTime: singleTimeMatch[2],
            endTime: singleTimeMatch[5],
          });
        } else {
          // eslint-disable-next-line no-console
          if (typeof console !== 'undefined') console.log('value => ', value);
          throw new Error(
            `No correct opening_hours for https://www.osm.org/relation/${mainFeature.properties.id}`
          );
        }
      }
    });
  }
  return services;
}

export function routeBuilder(features: GeoJSONFeature[][]): GTFSRoute[] {
  const getRouteType = (feature: GeoJSONFeature): string => {
    const route = feature.properties.route;
    let response = '';
    if (route === 'tram' || route === 'light_rail') {
      response = '0';
    } else if (route === 'subway') {
      response = '1';
    } else if (route === 'train') {
      response = '2';
    } else if (route === 'bus' || route === 'share_taxi' || route === 'minibus') {
      response = '3';
    } else if (route === 'ferry') {
      response = '4';
    } else if (route === 'aerialway') {
      response = '6';
    } else {
      throw new Error(
        `No correct route type for https://www.osm.org/relation/${feature.properties.id}`
      );
    }
    return response;
  };
  const routes: GTFSRoute[] = [];
  const routeMap = new Map<string, number>(); // Maps routeKey to route_id
  let routeIdCounter = 0;

  for (let feature of features) {
    const mainFeature = feature[0];
    // route_short_name: prefer 'ref' (route code like "M-01 C")
    const routeShortName = mainFeature.properties.ref || mainFeature.properties.name || mainFeature.properties.id.toString();
    // route_long_name: prefer 'name' with "Origin → Destination" format
    const routeLongName = mainFeature.properties.name || routeShortName;
    const routeKey = `${mainFeature.gtfs?.agency_id || 0}_${routeShortName}`;

    // Check if this route already exists (by agency + short name)
    let routeId = routeMap.get(routeKey);

    if (routeId === undefined) {
      // Create new route with sequential ID
      routeId = routeIdCounter++;
      routeMap.set(routeKey, routeId);

      let route_color = mainFeature.properties.colour || '';
      route_color = route_color.replace('#', '');

      const route: GTFSRoute = {
        route_id: routeId,
        agency_id: mainFeature.gtfs?.agency_id || 0,
        route_short_name: routeShortName,
        route_long_name: routeLongName,
        route_color: route_color,
        route_type: getRouteType(mainFeature),
      };
      routes.push(route);
    }

    // Assign the shared route_id to this feature
    if (!mainFeature.gtfs) {
      mainFeature.gtfs = {
        agency_id: 0,
        route_id: routeId,
        services: [],
      };
    } else {
      mainFeature.gtfs.route_id = routeId;
    }
  }
  return routes;
}

export function fareBuilder(
  features: GeoJSONFeature[][],
  defaultFares: DefaultFaresConfig
): { attributes: GTFSFareAttribute[]; rules: GTFSFareRule[] } {
  const fare: { attributes: GTFSFareAttribute[]; rules: GTFSFareRule[] } = {
    attributes: [],
    rules: [],
  };
  for (let feature of features) {
    const mainFeature = feature[0];

    let fareId = fare.attributes.length;
    let price = mainFeature.properties.fee === "yes" ? parseFloat(mainFeature.properties.charge) : 0

    fare.attributes.push({
      agency_id: mainFeature.gtfs?.agency_id || 0,
      fare_id: fareId,
      price: price || 0,
      currency_type: defaultFares.currencyType,
      payment_method: mainFeature.properties.paymentMethod || 0,
    });

    fare.rules.push({ fare_id: fareId, route_id: mainFeature.gtfs?.route_id });
  }
  return fare;
}

export function feedBuilder(feed: FeedConfig): GTFSFeedInfo[] {
  const feeds: GTFSFeedInfo[] = [];

  feeds.push({
    feed_publisher_url: feed.publisherUrl,
    feed_publisher_name: feed.publisherName,
    feed_lang: feed.lang,
    feed_version: feed.version,
    feed_contact_email: feed.contactEmail,
    feed_contact_url: feed.contactUrl,
    feed_start_date: feed.startDate,
    feed_end_date: feed.endDate,
    feed_id: feed.id,
  });

  return feeds;
}

export function tripBuilder(
  features: GeoJSONFeature[][],
  gtfsConfig?: { useFrequencies?: boolean; frequencyHeadway?: (feature: GeoJSONFeature) => number }
): GTFSTrip[] {
  const trips: GTFSTrip[] = [];
  const useFrequencies = gtfsConfig?.useFrequencies ?? true;

  // Track route directions: same ref can have outbound (0) and return (1)
  const routeDirections = new Map<string, number>();

  for (let feature of features) {
    const mainFeature = feature[0];
    if (!mainFeature.gtfs) continue;

    // Extract destination from route name for trip_headsign
    const routeName = mainFeature.properties.name || '';
    const routeRef = mainFeature.properties.ref || '';
    const toMatch = routeName.match(/(?:→|->)\s*(.+?)$/i);
    const tripHeadsign = toMatch ? toMatch[1].trim() : '';

    // Determine direction_id: alternate 0 and 1 for routes with the same ref
    let directionId: number = 0;
    if (routeRef) {
      const currentDirection = routeDirections.get(routeRef) ?? 0;
      directionId = currentDirection;
      // Increment for next route with same ref (outbound=0, return=1)
      routeDirections.set(routeRef, currentDirection === 0 ? 1 : 0);
    }

    if (useFrequencies) {
      // FREQUENCY-BASED: One trip per service (for use with frequencies.txt)
      const services = mainFeature.gtfs.services;
      for (let i = 0; i < services.length; i++) {
        const service = services[i];
        // Make trip_id unique when multiple services exist
        const tripId = services.length > 1
          ? mainFeature.properties.id * 100 + i
          : mainFeature.properties.id;
        const trip: GTFSTrip = {
          trip_id: tripId,
          route_id: mainFeature.gtfs.route_id,
          service_id: service.service_id,
          shape_id: mainFeature.properties.id,
          trip_headsign: tripHeadsign,
          direction_id: directionId,
        };
        trips.push(trip);
        service.trip_id = tripId;
      }
    } else {
      // SCHEDULE-BASED: Expand into individual scheduled trips
      const baseRouteId = mainFeature.properties.id;
      const headwaySecs = gtfsConfig?.frequencyHeadway?.(mainFeature) ?? 300;

      for (const service of mainFeature.gtfs.services) {
        const departureTimes = expandSchedule(service.startTime, service.endTime, headwaySecs);
        const expandedTrips: Array<{ trip_id: number; departureTime: string }> = [];

        departureTimes.forEach((departureTime, index) => {
          const trip_id = baseRouteId * 1000000 + index;
          const trip: GTFSTrip = {
            trip_id: trip_id,
            route_id: mainFeature.gtfs!.route_id,
            service_id: service.service_id,
            shape_id: baseRouteId,
            trip_headsign: tripHeadsign,
            direction_id: directionId,
          };
          trips.push(trip);
          expandedTrips.push({ trip_id, departureTime });
        });

        service.expandedTrips = expandedTrips;
      }
    }
  }
  return trips;
}

export function frequenciesBuilder(
  features: GeoJSONFeature[][],
  frequencyHeadwaySecs: (feature: GeoJSONFeature) => number,
  gtfsConfig?: { useFrequencies?: boolean }
): GTFSFrequency[] {
  const useFrequencies = gtfsConfig?.useFrequencies ?? true;

  // If not using frequencies, return empty array (frequencies.txt won't be generated)
  if (!useFrequencies) {
    return [];
  }

  // FREQUENCY-BASED: Generate frequencies.txt
  const frequencies: GTFSFrequency[] = [];
  for (let feature of features) {
    const mainFeature = feature[0];
    if (!mainFeature.gtfs) continue;
    for (const service of mainFeature.gtfs.services) {
      const frequency: GTFSFrequency = {
        trip_id: service.trip_id!,
        start_time: service.startTime + ':00',
        end_time: service.endTime + ':00',
        headway_secs: frequencyHeadwaySecs(mainFeature),
        exact_times: 1,
      };
      frequencies.push(frequency);
    }
  }
  return frequencies;
}

export function stopsBuilder(
  features: GeoJSONFeature[][],
  inputStops: { [id: number]: string[] },
  maxStopsDistance: number,
  stopNameBuilder: (stops?: string[]) => string,
  stopsConfig?: CustomStopsConfig
): GTFSStop[] {
  const stops: GTFSStop[] = [];
  const checkList: { [id: string | number]: boolean } = {};

  // Determine stops mode (default: fakeStops for backwards compatibility)
  const mode: StopsMode = stopsConfig?.mode ?? 'fakeStops';

  // Load custom stops if mode is customStops
  let customStops: CustomStop[] | null = null;
  if (mode === 'customStops') {
    if (stopsConfig?.stops && stopsConfig.stops.length > 0) {
      customStops = stopsConfig.stops;
      console.log(`Using ${customStops.length} custom stops (provided directly)`);
    } else if (stopsConfig?.filePath) {
      customStops = loadCustomStops(stopsConfig.filePath);
      console.log(`Loaded ${customStops.length} custom stops from file`);
    } else {
      throw new Error('customStops mode requires either stops array or filePath');
    }
  }

  const maxMatchDistance = stopsConfig?.maxMatchDistance ?? 200;
  const minDistanceBetweenStops = stopsConfig?.minDistanceBetweenStops ?? 0;
  const fallbackBehavior = stopsConfig?.fallbackBehavior ?? 'warning';
  const rightSideOnly = stopsConfig?.rightSideOnly ?? false;

  for (const feature of features) {
    const routeFeature = feature[0];
    if (!routeFeature.gtfs) {
      routeFeature.gtfs = {
        agency_id: 0,
        route_id: 0,
        services: [],
        filteredStops: { nodes: [], coordinates: [] },
      };
    }

    if (mode === 'osmStops') {
      // OSM stops mode: use stop_position nodes from the OSM relation
      const filteredStops: { nodes: number[]; coordinates: GeoJSONCoordinate[] } = { nodes: [], coordinates: [] };
      for (let i = 1; i < feature.length; i++) {
        const { geometry, properties } = feature[i];
        if (!checkList[properties.id]) {
          checkList[properties.id] = true;
          const coords = Array.isArray(geometry.coordinates[0])
            ? (geometry.coordinates as number[][])[0]
            : (geometry.coordinates as number[]);
          stops.push({
            stop_id: properties.id,
            stop_name: properties.name || 'unnamed',
            stop_lat: coords[1],
            stop_lon: coords[0],
          });
        }
        filteredStops.nodes.push(properties.id);
        const coords = Array.isArray(geometry.coordinates[0])
          ? (geometry.coordinates as number[][])[0]
          : (geometry.coordinates as number[]);
        filteredStops.coordinates.push(coords as GeoJSONCoordinate);
      }
      routeFeature.gtfs.filteredStops = filteredStops;
    } else if (mode === 'customStops' && customStops) {
      // Custom stops mode: use ONLY the provided custom stops
      const { nodes, coordinates } = routeFeature.geometry;
      const filteredStops: { nodes: number[]; coordinates: GeoJSONCoordinate[] } = { nodes: [], coordinates: [] };

      // Track last added stop for this route (to avoid consecutive duplicates and distance filtering)
      let lastStopId: string | null = null;
      let lastStopLat: number | null = null;
      let lastStopLon: number | null = null;

      // Helper function to add OSM-based stop for first/last points
      const addOsmStop = (nodeId: number, coords: number[]) => {
        const [lon, lat] = coords;
        if (!checkList[nodeId]) {
          checkList[nodeId] = true;
          const stopName = stopNameBuilder(inputStops[nodeId]);
          stops.push({
            stop_id: nodeId,
            stop_name: stopName || 'unnamed',
            stop_lat: lat,
            stop_lon: lon,
          });
        }
        filteredStops.nodes.push(nodeId);
        filteredStops.coordinates.push(coords as GeoJSONCoordinate);
        lastStopId = String(nodeId);
        lastStopLat = lat;
        lastStopLon = lon;
      };

      // Check if first point needs OSM stop
      const firstCoords = coordinates[0] as number[];
      const firstMatch = findNearestStop(customStops, firstCoords[1], firstCoords[0], maxMatchDistance);
      if (!firstMatch) {
        // No custom stop for first point - create from OSM
        addOsmStop(nodes![0], firstCoords);
      }

      for (let index = 0; index < nodes!.length; index++) {
        const coords = coordinates[index];
        const [lon, lat] = coords;
        const isLastPoint = index === nodes!.length - 1;
        const isFirstPoint = index === 0;

        const match = findNearestStop(customStops, lat, lon, maxMatchDistance);

        if (match) {
          const customStop = match.stop;
          const numericStopId = stopIdToNumber(customStop.stop_id);

          // Debug log for PM89
          if (customStop.stop_id === 'PM89') {
            console.log(`[DEBUG PM89] Found match for route ${routeFeature.properties.ref || routeFeature.properties.id}, distance: ${match.distanceMeters.toFixed(2)}m`);
          }

          // Skip if this is the same stop as the last one (avoid consecutive duplicates)
          if (lastStopId === customStop.stop_id) {
            if (customStop.stop_id === 'PM89') {
              console.log(`[DEBUG PM89] Skipped: same as last stop`);
            }
            continue;
          }

          // Check if stop is on the right side of the route (if rightSideOnly is enabled)
          if (rightSideOnly && !isFirstPoint && !isLastPoint) {
            // Get the line segment: previous point -> current point -> next point
            // Use the segment from previous to next to determine direction
            const prevCoords = coordinates[index - 1];
            const nextCoords = coordinates[index + 1];
            const lineStart: [number, number] = [prevCoords[0], prevCoords[1]];
            const lineEnd: [number, number] = [nextCoords[0], nextCoords[1]];
            const stopPoint: [number, number] = [customStop.stop_lon, customStop.stop_lat];

            if (!isPointOnRightSide(lineStart, lineEnd, stopPoint)) {
              // Stop is on the left side, skip it
              if (customStop.stop_id === 'PM89') {
                console.log(`[DEBUG PM89] Skipped: on left side of route ${routeFeature.properties.ref || routeFeature.properties.id}`);
              }
              continue;
            }
          }

          // Check minimum distance between consecutive stops
          if (minDistanceBetweenStops > 0 && lastStopLat !== null && lastStopLon !== null) {
            const distToLast = distanceBetweenCoords(lastStopLat, lastStopLon, customStop.stop_lat, customStop.stop_lon);
            if (distToLast < minDistanceBetweenStops) {
              // Skip this stop - too close to the previous one
              // But if it's the last point, we need to add it anyway
              if (!isLastPoint) {
                continue;
              }
            }
          }

          // Add stop to global stops list if not already added
          if (!checkList[customStop.stop_id]) {
            checkList[customStop.stop_id] = true;
            stops.push({
              stop_id: numericStopId,
              stop_name: customStop.stop_name,
              stop_lat: customStop.stop_lat,
              stop_lon: customStop.stop_lon,
            });
            if (customStop.stop_id === 'PM89') {
              console.log(`[DEBUG PM89] Added to global stops list`);
            }
          }

          // Use custom stop for this route point
          filteredStops.nodes.push(numericStopId);
          filteredStops.coordinates.push([customStop.stop_lon, customStop.stop_lat] as GeoJSONCoordinate);
          if (customStop.stop_id === 'PM89') {
            console.log(`[DEBUG PM89] Included in route ${routeFeature.properties.ref || routeFeature.properties.id}`);
          }

          // Update last stop tracking
          lastStopId = customStop.stop_id;
          lastStopLat = customStop.stop_lat;
          lastStopLon = customStop.stop_lon;
        } else if (isLastPoint) {
          // No custom stop for last point - create from OSM
          const nodeId = nodes![index];
          if (lastStopId !== String(nodeId)) {
            addOsmStop(nodeId, coords);
          }
        } else {
          // No custom stop found within range (not first or last)
          if (fallbackBehavior === 'error') {
            throw new Error(
              `Route ${routeFeature.properties.id}: No custom stop found within ${maxMatchDistance}m of point [${lat}, ${lon}]`
            );
          }
          // fallbackBehavior === 'warning': just skip this point silently
        }
      }
      routeFeature.gtfs.filteredStops = filteredStops;
    } else {
      // fakeStops mode (default): generate stops from route geometry nodes
      const { nodes, coordinates } = routeFeature.geometry;
      const filteredStops: { nodes: number[]; coordinates: GeoJSONCoordinate[] } = { nodes: [], coordinates: [] };
      for (let index = 0; index < nodes!.length; index++) {
        const stopId = nodes![index];
        const coords = coordinates[index];
        // Generate a stop at every node (no distance filtering)
        if (!checkList[stopId]) {
          checkList[stopId] = true;
          const stopName = stopNameBuilder(inputStops[stopId]);
          stops.push({
            stop_id: stopId,
            stop_name: stopName || 'unnamed',
            stop_lat: coords[1],
            stop_lon: coords[0],
          });
        }
        filteredStops.nodes.push(stopId);
        filteredStops.coordinates.push(coords as GeoJSONCoordinate);
      }
      routeFeature.gtfs.filteredStops = filteredStops;
    }
  }
  return stops;
}

export function shapesBuilder(features: GeoJSONFeature[][]): GTFSShape[] {
  const shapes: GTFSShape[] = [];
  for (let feature of features) {
    const mainFeature = feature[0];
    const shapeId = mainFeature.properties.id;
    const geometry = mainFeature.geometry;
    for (const index in geometry.coordinates) {
      const coordinates = geometry.coordinates[index];
      shapes.push({
        shape_id: shapeId,
        shape_pt_lat: coordinates[1],
        shape_pt_lon: coordinates[0],
        shape_pt_sequence: index,
      });
    }
  }
  return shapes;
}

export function stopTimesBuilder(
  features: GeoJSONFeature[][],
  vehicleSpeed: (feature: GeoJSONFeature) => number,
  gtfsConfig?: { useFrequencies?: boolean }
): GTFSStopTime[] {
  const stopTimes: GTFSStopTime[] = [];
  const useFrequencies = gtfsConfig?.useFrequencies ?? true;

  for (let feature of features) {
    const mainFeature = feature[0];
    if (!mainFeature.gtfs || !mainFeature.gtfs.filteredStops) continue;
    const speed = (vehicleSpeed(mainFeature) / 60 / 60) * 1000;

    for (const service of mainFeature.gtfs.services) {
      if (useFrequencies) {
        // FREQUENCY-BASED: Relative times from 00:00:00
        let previousCoords: number[] | undefined;
        let distance = 0;
        let seconds = 0;
        const { nodes, coordinates } = mainFeature.gtfs.filteredStops;
        for (const index in nodes) {
          const coords = coordinates[index];
          if (previousCoords) {
            distance = distanceBetween(previousCoords, coords, { units: 'kilometers' });
            seconds += Math.ceil((distance * 1000) / speed);
          }
          previousCoords = coords;
          const arrival_time = secondsToTime(seconds);
          stopTimes.push({
            trip_id: service.trip_id!,
            stop_sequence: index,
            stop_id: nodes[index],
            arrival_time: arrival_time,
            departure_time: arrival_time,
            timepoint: 0,
          });
        }
      } else {
        // SCHEDULE-BASED: Specific times for each expanded trip
        const expandedTrips = service.expandedTrips;
        if (!expandedTrips || expandedTrips.length === 0) {
          console.warn(`No expanded trips found for service ${service.service_id}`);
          continue;
        }

        // Calculate travel times between stops (same for all trips)
        const travelTimesSeconds: number[] = [];
        let previousCoords: number[] | undefined;
        const { nodes, coordinates } = mainFeature.gtfs.filteredStops;

        for (const index in nodes) {
          if (previousCoords) {
            const coords = coordinates[index];
            const distance = distanceBetween(previousCoords, coords, { units: 'kilometers' });
            const travelSeconds = Math.ceil((distance * 1000) / speed);
            travelTimesSeconds.push(travelSeconds);
          } else {
            travelTimesSeconds.push(0); // First stop has 0 travel time
          }
          previousCoords = coordinates[index];
        }

        // Generate stop times for each expanded trip
        for (const expandedTrip of expandedTrips) {
          const departureSecs = timeToSeconds(expandedTrip.departureTime.substring(0, 5));
          let cumulativeSeconds = 0;

          for (const index in nodes) {
            cumulativeSeconds += travelTimesSeconds[index];
            const stopArrivalSecs = departureSecs + cumulativeSeconds;
            const arrival_time = secondsToTime(stopArrivalSecs);

            stopTimes.push({
              trip_id: expandedTrip.trip_id,
              stop_sequence: index,
              stop_id: nodes[index],
              arrival_time: arrival_time,
              departure_time: arrival_time,
              timepoint: 0,
            });
          }
        }
      }
    }
  }
  return stopTimes;
}

/**
 * Post-processing: Merge stops that are within a given distance of each other
 * AND share at least one common route/trip.
 * This reduces duplicate stops without merging unrelated stops.
 */
export function mergeNearbyStops(
  stops: GTFSStop[],
  stopTimes: GTFSStopTime[],
  maxDistanceMeters: number
): { stops: GTFSStop[]; stopTimes: GTFSStopTime[]; mergedCount: number } {
  if (maxDistanceMeters <= 0) {
    return { stops, stopTimes, mergedCount: 0 };
  }

  // Build a map of stop_id -> set of trip_ids that use this stop
  const stopToTrips: Map<number | string, Set<number>> = new Map();
  for (const st of stopTimes) {
    if (!stopToTrips.has(st.stop_id)) {
      stopToTrips.set(st.stop_id, new Set());
    }
    stopToTrips.get(st.stop_id)!.add(st.trip_id);
  }

  // Helper: check if two stops share at least one trip
  const shareTrips = (stopIdA: number | string, stopIdB: number | string): boolean => {
    const tripsA = stopToTrips.get(stopIdA);
    const tripsB = stopToTrips.get(stopIdB);
    if (!tripsA || !tripsB) return false;
    for (const tripId of tripsA) {
      if (tripsB.has(tripId)) return true;
    }
    return false;
  };

  // Build clusters of nearby stops that share routes
  const processed = new Set<number>();
  const stopIdMapping: Map<number | string, number | string> = new Map();
  const mergedStops: GTFSStop[] = [];

  for (let i = 0; i < stops.length; i++) {
    if (processed.has(i)) continue;

    const canonical = stops[i];
    const cluster: GTFSStop[] = [canonical];
    processed.add(i);

    // Find all stops within maxDistanceMeters that share trips with any stop in cluster
    for (let j = i + 1; j < stops.length; j++) {
      if (processed.has(j)) continue;

      const candidate = stops[j];
      const distance = distanceBetweenCoords(
        canonical.stop_lat,
        canonical.stop_lon,
        candidate.stop_lat,
        candidate.stop_lon
      );

      // Only merge if within distance AND shares at least one trip with any stop in cluster
      if (distance <= maxDistanceMeters) {
        const sharesWithCluster = cluster.some(clusterStop =>
          shareTrips(clusterStop.stop_id, candidate.stop_id)
        );
        if (sharesWithCluster) {
          cluster.push(candidate);
          processed.add(j);
        }
      }
    }

    // Pick the canonical stop (prefer named stops over 'unnamed')
    let bestStop = canonical;
    for (const stop of cluster) {
      if (stop.stop_name !== 'unnamed' && bestStop.stop_name === 'unnamed') {
        bestStop = stop;
      } else if (stop.stop_name.length > bestStop.stop_name.length && bestStop.stop_name === 'unnamed') {
        bestStop = stop;
      }
    }

    // Map all cluster stop IDs to the canonical stop ID
    for (const stop of cluster) {
      stopIdMapping.set(stop.stop_id, bestStop.stop_id);
    }

    mergedStops.push(bestStop);
  }

  // Update stop_times with merged stop IDs
  const updatedStopTimes = stopTimes.map((st) => {
    const mappedId = stopIdMapping.get(st.stop_id) ?? st.stop_id;
    return {
      ...st,
      stop_id: typeof mappedId === 'string' ? parseInt(mappedId, 10) : mappedId,
    };
  });

  const mergedCount = stops.length - mergedStops.length;
  if (mergedCount > 0) {
    console.log(`Merged ${mergedCount} nearby stops (within ${maxDistanceMeters}m, sharing routes): ${stops.length} → ${mergedStops.length}`);
  }

  return { stops: mergedStops, stopTimes: updatedStopTimes, mergedCount };
}

export default {
  agencyBuilder,
  calendarBuilder,
  routeBuilder,
  fareBuilder,
  feedBuilder,
  tripBuilder,
  frequenciesBuilder,
  stopsBuilder,
  shapesBuilder,
  stopTimesBuilder,
  mergeNearbyStops,
};
