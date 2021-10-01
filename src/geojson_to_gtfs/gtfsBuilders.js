const distanceBetween = require('@turf/distance').default;

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
        const agencyName = feature.properties.operators || "default"
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
        const opening_hours = feature.properties.opening_hours || defaultCalendar(feature)
        const times = opening_hours.split(";");
        times.map((value) => {
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
        routes.push({
            route_id: feature.properties.id,
            agency_id: feature.gtfs.agency_id,
            route_short_name: feature.properties.ref || feature.properties.name,
            route_long_name: feature.properties.name,
            route_type: getRouteType(feature),
        })
        feature.gtfs.route_id = feature.properties.id
    }
    return routes
}

function tripBuilder(features, featureFrequency) {
    const trips = []
    for (let feature of features) {
        feature = feature[0]
        feature.gtfs.trips = []
        const secondsFrequency = timeToSeconds(featureFrequency(feature))
        for (const service of feature.gtfs.services) {
            const startTimeSencods = timeToSeconds(service.startTime)
            const endTimeSencods = timeToSeconds(service.endTime)
            let tempStartTime = startTimeSencods
            while (tempStartTime <= endTimeSencods) {
                const trip = {
                    trip_id: trips.length,
                    route_id: feature.gtfs.route_id,
                    service_id: service.service_id,
                    shape_id: feature.properties.id
                }
                trips.push(trip)
                feature.gtfs.trips.push({
                    trip_id: trip.trip_id,
                    offset: tempStartTime
                })
                tempStartTime += secondsFrequency
            }
        }
    }
    return trips
}
function stopsBuilder(features, inputStops, maxStopsDistance, stopNameBuilder) {
    const stops = []
    for (let feature of features) {
        feature = feature[0]
        const { nodes, coordinates } = feature.geometry
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
                let stop = stops.find(value => value.stop_id === stopId);
                if (!stop) {
                    const stopName = stopNameBuilder(inputStops[stopId])
                    stops.push({
                        stop_id: stopId,
                        stop_name: stopName,
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
        feature.gtfs.filteredStops = filteredStops
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
        for (const trip of feature.gtfs.trips) {
            let previousCoords
            let distance = 0
            let seconds = trip.offset
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
                    trip_id: trip.trip_id,
                    stop_sequence: index,
                    stop_id: nodes[index],
                    arrival_time: arrival_time,
                    departure_time: arrival_time,
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
    tripBuilder,
    stopsBuilder,
    shapesBuilder,
    stopTimesBuilder,
}
