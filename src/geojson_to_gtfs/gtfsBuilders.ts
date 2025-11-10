import distanceBetween from '@turf/distance';
import formatTime from './time/formater';
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
} from '../types';

function secondsToTime(seconds: number): string {
  let hh: string | number = Math.floor(seconds / 3600);
  let mm: string | number = Math.floor((seconds - hh * 3600) / 60);
  let ss: string | number = seconds - hh * 3600 - mm * 60;

  if (hh < 10) hh = `0${hh}`;
  if (mm < 10) mm = `0${mm}`;
  if (ss < 10) ss = `0${ss}`;

  return `${hh}:${mm}:${ss}`;
}

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
      const dualTimeMatch = value.match(
        '((Mo|Tu|We|Th|Fr|Sa|Su)-(Mo|Tu|We|Th|Fr|Sa|Su)) (([01][0-9]|2[0-4]):([0-5][0-9]))-(([01][0-9]|2[0-4]):([0-5][0-9]))'
      );
      if (dualTimeMatch && dualTimeMatch.length === 10) {
        const serviceId = dualTimeMatch[1];

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
        const singleTimeMatch = value.match(
          '(Mo|Tu|We|Th|Fr|Sa|Su) (([01][0-9]|2[0-4]):([0-5][0-9]))-(([01][0-9]|2[0-4]):([0-5][0-9]))'
        );
        if (singleTimeMatch && singleTimeMatch.length === 8) {
          const serviceId = singleTimeMatch[1];

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
    } else if (route === 'bus' || route === 'share_taxi') {
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
  for (let feature of features) {
    const mainFeature = feature[0];
    let route_color = mainFeature.properties.colour || '';
    route_color = route_color.replace('#', '');
    routes.push({
      route_id: mainFeature.properties.id,
      agency_id: mainFeature.gtfs?.agency_id || 0,
      route_short_name: mainFeature.properties.ref || mainFeature.properties.name,
      route_long_name: mainFeature.properties.name,
      route_color: route_color,
      route_type: getRouteType(mainFeature),
    });
    if (!mainFeature.gtfs) {
      mainFeature.gtfs = {
        agency_id: 0,
        route_id: mainFeature.properties.id,
        services: [],
      };
    } else {
      mainFeature.gtfs.route_id = mainFeature.properties.id;
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

    fare.rules.push({ fare_id: fareId, route_id: mainFeature.properties.id });
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

export function tripBuilder(features: GeoJSONFeature[][]): GTFSTrip[] {
  const trips: GTFSTrip[] = [];
  for (let feature of features) {
    const mainFeature = feature[0];
    if (!mainFeature.gtfs) continue;
    for (const service of mainFeature.gtfs.services) {
      const trip: GTFSTrip = {
        trip_id: trips.length,
        route_id: mainFeature.gtfs.route_id,
        service_id: service.service_id,
        shape_id: mainFeature.properties.id,
      };
      trips.push(trip);
      service.trip_id = trip.trip_id;
    }
  }
  return trips;
}

export function frequenciesBuilder(
  features: GeoJSONFeature[][],
  frequencyHeadwaySecs: (feature: GeoJSONFeature) => number
): GTFSFrequency[] {
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
  fakeStops: (feature: GeoJSONFeature) => boolean
): GTFSStop[] {
  const stops: GTFSStop[] = [];
  const checkList: { [id: number]: boolean } = {};
  for (let feature of features) {
    const routeFeature = feature[0];
    if (!routeFeature.gtfs) {
      routeFeature.gtfs = {
        agency_id: 0,
        route_id: 0,
        services: [],
        filteredStops: { nodes: [], coordinates: [] },
      };
    }

    if (fakeStops(routeFeature)) {
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
    } else {
      const { nodes, coordinates } = routeFeature.geometry;
      const filteredStops: { nodes: number[]; coordinates: GeoJSONCoordinate[] } = { nodes: [], coordinates: [] };
      let previousCoords: number[] | undefined;
      let distance = 0;
      for (let index = 0; index < nodes!.length; index++) {
        const stopId = nodes![index];
        const coords = coordinates[index];
        if (previousCoords) {
          distance = distance + distanceBetween(previousCoords, coords, { units: 'meters' });
        }
        if (distance > maxStopsDistance || index === nodes!.length - 1 || index === 0) {
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
          distance = 0;
        }
        previousCoords = coords;
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
  vehicleSpeed: (feature: GeoJSONFeature) => number
): GTFSStopTime[] {
  const stopTimes: GTFSStopTime[] = [];
  for (let feature of features) {
    const mainFeature = feature[0];
    if (!mainFeature.gtfs || !mainFeature.gtfs.filteredStops) continue;
    const speed = (vehicleSpeed(mainFeature) / 60 / 60) * 1000;
    for (const service of mainFeature.gtfs.services) {
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
    }
  }
  return stopTimes;
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
};
