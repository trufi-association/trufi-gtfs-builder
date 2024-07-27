const distanceBetween = require('@turf/distance').default;
const formatTime = require('./time/formater')

function secondsToTime(seconds) {
    let hh = Math.floor(seconds / 3600);
    let mm = Math.floor((seconds - (hh * 3600)) / 60);
    let ss = seconds - (hh * 3600) - (mm * 60);

    if (hh < 10) hh = `0${hh}`;
    if (mm < 10) mm = `0${mm}`;
    if (ss < 10) ss = `0${ss}`;

    return `${hh}:${mm}:${ss}`;
}
function timeToSeconds(time) {
    const startTime = time.split(":")
    let response
    if (startTime.length == 1) {
        response = parseInt(startTime[0]) * 60
    } else if (startTime.length == 2) {
        response = parseInt(startTime[0]) * 3600 + parseInt(startTime[1]) * 60
    } else if (startTime.length == 3) {
        response = parseInt(startTime[0]) * 3600 + parseInt(startTime[1]) * 60 + parseInt(startTime[2])
    }
    return response
}
function agencyBuilder(features, defaultAgencyInfo) {
    const agencies = []
    for (let feature of features) {
        feature = feature[0]
        const agencyName = feature.properties.operator || "default"
        let agency = agencies.find(value => value.agency_name === agencyName);
        if (!agency) {
            agency = {
                agency_id: agencies.length,
                agency_name: agencyName,
                ...defaultAgencyInfo,
            }
            agencies.push(agency)
        }
        feature.gtfs = { agency_id: agency.agency_id }
    }
    return agencies
}

function calendarBuilder(features, defaultCalendar) {
    const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
    const services = []
    for (let feature of features) {
        feature = feature[0]
        feature.gtfs.services = []
        // TODO:
        const opening_hours = feature.properties.opening_hours || defaultCalendar(feature)
        // const opening_hours =  defaultCalendar(feature)
        const times = opening_hours.split(";");
        times.map(formatTime).map((value) => {
            const dualTimeMatch = value.match("((Mo|Tu|We|Th|Fr|Sa|Su)-(Mo|Tu|We|Th|Fr|Sa|Su)) (([01][0-9]|2[0-4]):([0-5][0-9]))-(([01][0-9]|2[0-4]):([0-5][0-9]))")
            if (dualTimeMatch && dualTimeMatch.length == 10) {
                const serviceId = dualTimeMatch[1]

                let service = services.find(value => value.service_id === serviceId);
                if (!service) {
                    const init = days.indexOf(dualTimeMatch[2])
                    const end = days.indexOf(dualTimeMatch[3])
                    service = {
                        service_id: serviceId,
                        monday: init <= 0 && 0 <= end ? 1 : 0,
                        tuesday: init <= 1 && 1 <= end ? 1 : 0,
                        wednesday: init <= 2 && 2 <= end ? 1 : 0,
                        thursday: init <= 3 && 3 <= end ? 1 : 0,
                        friday: init <= 4 && 4 <= end ? 1 : 0,
                        saturday: init <= 5 && 5 <= end ? 1 : 0,
                        sunday: init <= 6 && 6 <= end ? 1 : 0,
                        start_date: "20000101",
                        end_date: "21000101",
                    }
                    services.push(service)
                }
                feature.gtfs.services.push({
                    service_id: serviceId,
                    startTime: dualTimeMatch[4],
                    endTime: dualTimeMatch[7],
                })
            } else {
                const singleTimeMatch = value.match("(Mo|Tu|We|Th|Fr|Sa|Su) (([01][0-9]|2[0-4]):([0-5][0-9]))-(([01][0-9]|2[0-4]):([0-5][0-9]))")
                if (singleTimeMatch && singleTimeMatch.length == 8) {
                    const serviceId = singleTimeMatch[1]

                    let service = services.find(value => value.service_id === serviceId);
                    if (!service) {
                        const day = singleTimeMatch[1]
                        service = {
                            service_id: serviceId,
                            monday: day == "Mo" ? 1 : 0,
                            tuesday: day == "Tu" ? 1 : 0,
                            wednesday: day == "We" ? 1 : 0,
                            thursday: day == "Th" ? 1 : 0,
                            friday: day == "Fr" ? 1 : 0,
                            saturday: day == "Sa" ? 1 : 0,
                            sunday: day == "Su" ? 1 : 0,
                            start_date: "20000101",
                            end_date: "21000101",
                        }
                        services.push(service)
                    }
                    feature.gtfs.services.push({
                        service_id: serviceId,
                        startTime: singleTimeMatch[2],
                        endTime: singleTimeMatch[5],
                    })
                } else {
                    console.log('value => ', value)
                    throw new Error(`No correct opening_hours for https://www.osm.org/relation/${feature.properties.id}`)
                }
            }
        })
    }
    return services
}
function routeBuilder(features) {
    const getRouteType = (feature) => {
        const route = feature.properties.route
        let response = ""
        if (route == "tram" || route == "light_rail") {
            response = "0"
        } else if (route == "subway") {
            response = "1"
        } else if (route == "train") {
            response = "2"
        } else if (route == "bus" || route == "share_taxi") {
            response = "3"
        } else if (route == "ferry") {
            response = "4"
        } else if (route == "bus") {
            response = "5"
        } else if (route == "aerialway") {
            response = "6"
        } else {
            throw new Error(`No correct route type for https://www.osm.org/relation/${feature.properties.id}`)

        }
        return response
    }
    const routes = []
    for (let feature of features) {
        feature = feature[0]
        let route_color = feature.properties.colour || ""
        route_color = route_color.replace("#", "")
        routes.push({
            route_id: feature.properties.id,
            agency_id: feature.gtfs.agency_id,
            route_short_name: feature.properties.ref || feature.properties.name,
            route_long_name: feature.properties.name,
            route_color: route_color,
            route_type: getRouteType(feature),
        })
        feature.gtfs.route_id = feature.properties.id
    }
    return routes
}

function fareBuilder(features, defaultFares) {
    const fare = {
        attributes: [],
        rules: []
    }
    for (let feature of features) {
        feature = feature[0]

        let fareId = fare.attributes.length
        let price = parseFloat(feature.properties.fee)

        fare.attributes.push({
            agency_id: feature.gtfs.agency_id,
            fare_id: fareId,
            price: price || 0,
            currency_type: defaultFares.currencyType,
            payment_method: feature.properties.paymentMethod || 0
        });

        fare.rules.push({ fare_id: fareId, route_id: feature.properties.id });
    }
    return fare
}

function feedBuilder(feed) {
    const feeds = [];

    feeds.push({
        feed_publisher_url: feed.publisherUrl,
        feed_publisher_name: feed.publisherName,
        feed_lang: feed.lang,
        feed_version: feed.version,
        feed_contact_email: feed.contactEmail,
        feed_contact_url: feed.contactUrl,
        feed_start_date: feed.startDate,
        feed_end_date: feed.endDate,
        feed_id: feed.id
    });

    return feeds
}

function tripBuilder(features) {
    const trips = []
    for (let feature of features) {
        feature = feature[0]
        for (const service of feature.gtfs.services) {
            const trip = {
                trip_id: trips.length,
                route_id: feature.gtfs.route_id,
                service_id: service.service_id,
                shape_id: feature.properties.id
            }
            trips.push(trip)
            service.trip_id = trip.trip_id
        }
    }
    return trips
}

function frequenciesBuilder(features, frequencyHeadwaySecs) {
    const frequencies = []
    for (let feature of features) {
        feature = feature[0]
        for (const service of feature.gtfs.services) {
            const frequency = {
                trip_id: service.trip_id,
                start_time: service.startTime + ":00",
                end_time: service.endTime + ":00",
                headway_secs: frequencyHeadwaySecs(feature),
                exact_times: 1
            }
            frequencies.push(frequency)
        }
    }
    return frequencies
}

function stopsBuilder(features, inputStops, maxStopsDistance, stopNameBuilder, fakeStops) {
    const stops = []
    const checkList = {}
    for (let feature of features) {
        const routeFeature = feature[0]
        if (fakeStops(routeFeature)) {
            const filteredStops = { nodes: [], coordinates: [] }
            for (let i = 1; i < feature.length; i++) {
                const { geometry, properties } = feature[i]
                if (!(checkList[properties.id])) {
                    checkList[properties.id] = true
                    stops.push({
                        stop_id: properties.id,
                        stop_name: properties.name || "unnamed",
                        stop_lat: geometry.coordinates[1],
                        stop_lon: geometry.coordinates[0],
                    })
                }
                filteredStops.nodes.push(properties.id)
                filteredStops.coordinates.push(geometry.coordinates)
            }
            routeFeature.gtfs.filteredStops = filteredStops
        } else {
            const { nodes, coordinates } = routeFeature.geometry
            const filteredStops = { nodes: [], coordinates: [] }
            let previousCoords
            let distance = 0
            for (let index = 0; index < nodes.length; index++) {
                const stopId = nodes[index]
                const coords = coordinates[index]
                if (previousCoords) {
                    distance = distance + distanceBetween(previousCoords, coords, { units: 'meters' });
                }
                if (distance > maxStopsDistance || index == nodes.length - 1 || index == 0) {
                    if (!(checkList[stopId])) {
                        checkList[stopId] = true
                        const stopName = stopNameBuilder(inputStops[stopId])
                        stops.push({
                            stop_id: stopId,
                            stop_name: stopName || "unnamed",
                            stop_lat: coords[1],
                            stop_lon: coords[0],
                        })
                    }
                    filteredStops.nodes.push(stopId)
                    filteredStops.coordinates.push(coords)
                    distance = 0
                }
                previousCoords = coords
            }
            routeFeature.gtfs.filteredStops = filteredStops
        }
    }
    return stops
}
function shapesBuilder(features) {
    const shapes = []
    for (let feature of features) {
        feature = feature[0]
        const shapeId = feature.properties.id
        const geometry = feature.geometry
        for (const index in geometry.coordinates) {
            const coordinates = geometry.coordinates[index]
            shapes.push({
                shape_id: shapeId,
                shape_pt_lat: coordinates[1],
                shape_pt_lon: coordinates[0],
                shape_pt_sequence: index,
            })
        }
    }
    return shapes
}
function stopTimesBuilder(features, vehicleSpeed) {
    const stopTimes = []
    for (let feature of features) {
        feature = feature[0]
        const speed = vehicleSpeed(feature) / 60 / 60 * 1000;
        for (const service of feature.gtfs.services) {
            let previousCoords
            let distance = 0
            let seconds = 0
            const { nodes, coordinates } = feature.gtfs.filteredStops
            for (const index in nodes) {
                const coords = coordinates[index]
                if (previousCoords) {
                    distance = distanceBetween(previousCoords, coords, { units: 'kilometers' });
                    seconds += Math.ceil((distance * 1000) / speed);
                }
                previousCoords = coords
                const arrival_time = secondsToTime(seconds)
                stopTimes.push({
                    trip_id: service.trip_id,
                    stop_sequence: index,
                    stop_id: nodes[index],
                    arrival_time: arrival_time,
                    departure_time: arrival_time,
                    timepoint: 0
                })
            }
        }
    }
    return stopTimes
}
module.exports = {
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
}
