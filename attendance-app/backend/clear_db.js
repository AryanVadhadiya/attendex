const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://aryanvadhadiya1_db_user:ZkFp9VS4a1flUCRc@cluster0.y2ecgli.mongodb.net/attence_db?retryWrites=true&w=majority&appName=Cluster0';

async function clearDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    console.log('⚠️ Clearing database...');
    // Get all collections
    const collections = await mongoose.connection.db.collections();

    for (let collection of collections) {
      console.log(`Dropping collection: ${collection.collectionName}`);
      await collection.drop();
    }

    console.log('✅ Database cleared successfully via dropping collections.');

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

clearDatabase();
