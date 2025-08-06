const { osmToGtfs, OSMOverpassDownloader } = require('../../')

osmToGtfs({
    outputFiles: { outputDir: __dirname + '/out', trufiTPData: true, gtfs: true,routes:true },
    geojsonOptions: {
        osmDataGetter: new OSMOverpassDownloader({
            south:-17.505838,
            west: -66.330903,
            north:-17.31828,
            east:  -65.941028,
        }), skipRoute: (route) => {
            // return [9144378, 9085564, 9118342].includes(route.id)
            return [ 9085564, 9118342].includes(route.id)
        }
    }, gtfsOptions: {
        fakeStops: (routeFeature) => [9083839, 14576927, 9074378, 14576926].includes(routeFeature.properties.id),
        stopNameBuilder: (stops) => {
            if (!stops || stops.length == 0) {
                stops = ["Innominada"]
            }
            return stops.join(" y ")
        }, 
        defaultFares: { currencyType: "BOB" },
        feed: {
            publisherUrl: "https://arequipabus.app",
            publisherName: "Arequipa Bus",
            lang: "es",
            version: new Date().toUTCString(),
            contactEmail: "email@arequipabus.app",
            contactUrl: "http://support.arequipabus.app",
            startDate: "20000101",
            endDate: "21000101",
            id: "arequipa-pe"
        }
    }
}).catch(error => console.error(error))
