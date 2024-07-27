const formatTime = require('./formater')

const DualTimePattern = "^((Mo|Tu|We|Th|Fr|Sa|Su)-(Mo|Tu|We|Th|Fr|Sa|Su)) (([01][0-9]|2[0-4]):([0-5][0-9]))-(([01][0-9]|2[0-4]):([0-5][0-9]))$"
const SingleTimePattern = "^(Mo|Tu|We|Th|Fr|Sa|Su) (([01][0-9]|2[0-4]):([0-5][0-9]))-(([01][0-9]|2[0-4]):([0-5][0-9]))$"

const isDual = (service) => service.match(DualTimePattern);

const isSingle = (service) => service.match(SingleTimePattern);

const addError = (line, errors, results) => {
    const singleTimeMatch = isSingle(line);
    if (singleTimeMatch && singleTimeMatch.length == 8) {
        results.push('OK');
        return
    }

    const dualTimeMatch = isDual(line);
    if (dualTimeMatch && dualTimeMatch.length == 10) {
        results.push('OK');
        return
    }

    results.push('ERROR');
    errors.push(line);
};

const times = [
    "Mo-Su     05:00 - 21:00",
    "Mo-Su 05:00 - 21:00   ",
    "Mo-Su 05:00 - 21:00",
    "Mo-Su 05:00-21:00",
    "   Mo -Su 05:00-21:00   ",
    "Mo-Sa 05: 50-20  :00   ",
    "Mo-Sa      05:50-20:00",
    "Mo-Su 0 5:30-20:3 0",
    "Mo-Su 05:3  0-20:3 0",
    "Mo-Fr 04:30 - 19:30",
    " Sa-Su 05:00 - 19:00",
    "Mo    -   Fr 04:30 - 19:30",
    "Sa-Su 05:00 - 19:00",
    "Mo   -Sa 05:00-20:00",
    " Su 05:25-18:00",
    "Mo-   Sa 05:00-20:00",
    " Su 05:25-18:00",
    "  Mo-Su 5:30-21:00  "
];

const formattedTimes = times.map(formatTime);

const errors = [];
const results = [];

formattedTimes.forEach(line => {
    if (line.length != 0)
        addError(line, errors, results);
});

for (let index = 0; index < formattedTimes.length; index++) {
    console.log(`<${times[index]}>`, "  =>  ", `<${formattedTimes[index]}>`, "  =>  ", results[index]);
};

console.log('-------------------------------------------------------------------------');

if (errors.length != 0) {
    console.log(errors, " => ", errors.length);
} else {
    console.log("no errors");
}
