
const fs = require('fs');
const writer = async (data) => {
    for (const line of data) {
        fs.writeFileSync("movies.txt",
            `${line}\n`,
            {
                encoding: "utf8",
                flag: "a+",
                mode: 0o666
            });
    }
}
writer(["a", "b"])