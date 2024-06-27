const { MongoClient } = require('mongodb');

const url = process.env.MONGODB_URI;
const client = new MongoClient(url);
const databaseName = 'zinterview';
async function dbconnect() {
    try {
        await client.connect();
        const db = client.db(databaseName);
        const openings = db.collection('openings');
        const organizations = db.collection('organizations');
        const userinterviewreports = db.collection('userinterviewreports');
        return { openings, organizations, userinterviewreports };
    } catch (error) {
        console.error('Failed to connect to the database', error);
        throw error;
    }
}

module.exports = dbconnect;
