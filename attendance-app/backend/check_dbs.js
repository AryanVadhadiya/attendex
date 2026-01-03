const mongoose = require('mongoose');

const baseUri = 'mongodb+srv://aryanvadhadiya1_db_user:ZkFp9VS4a1flUCRc@cluster0.y2ecgli.mongodb.net';

async function check(dbName) {
    console.log(`\n--- Checking Database: ${dbName} ---`);
    const uri = `${baseUri}/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;
    let conn;
    try {
        // Try to connect
        conn = mongoose.createConnection(uri);
        await conn.asPromise();

        // Define a loose schema to read users
        const User = conn.model('User', new mongoose.Schema({ email: String, createdAt: Date }, { strict: false }));

        const count = await User.countDocuments();
        console.log(`Total Users: ${count}`);

        if (count > 0) {
            const u = await User.findOne({ email: 'smoothopr@gmail.com' });
            if (u) {
                console.log(`⚠️  Found 'smoothopr@gmail.com'`);
                console.log(`    _id: ${u._id}`);
                console.log(`    createdAt: ${u.createdAt}`);
            } else {
                console.log(`    'smoothopr@gmail.com' NOT found in this DB.`);
            }
        } else {
            console.log(`    Database is empty (0 users).`);
        }
    } catch(err) {
        console.log(`    Check failed: ${err.message}`);
    } finally {
        if (conn) await conn.close();
    }
}

async function run() {
    await check('attence_db');     // The one we just cleared
    await check('attendance_db');  // The old one (suspected to have the user)
    await check('test');           // Default
}

run();
