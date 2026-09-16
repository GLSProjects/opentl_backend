const { MongoClient } = require('mongodb');
require('dotenv').config();

const base = "mongodb+srv://openTL_db:";
const suffix = "@clustertl.o4ysjwf.mongodb.net/discord?appName=ClusterTL";

const variations = [
    { name: "Encoded Password (openTL%40dk30)", pass: "openTL%40dk30" },
    { name: "Raw Password (openTL@dk30) - NOTE: This may fail URI parsing", pass: "openTL@dk30" },
    { name: "Double Encoded? (Probably not, but testing)", pass: encodeURIComponent("openTL%40dk30") }
];

async function test() {
    for (const v of variations) {
        console.log(`--- Testing: ${v.name} ---`);
        const uri = `${base}${v.pass}${suffix}`;
        const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
        try {
            await client.connect();
            console.log("✅ SUCCESS!");
            await client.close();
            process.exit(0);
        } catch (err) {
            console.log(`❌ FAILED: ${err.message}`);
        }
    }
}

test();
