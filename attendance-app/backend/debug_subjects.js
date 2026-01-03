const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://aryanvadhadiya1_db_user:ZkFp9VS4a1flUCRc@cluster0.y2ecgli.mongodb.net/attendance_db?retryWrites=true&w=majority&appName=Cluster0';
const USER_ID = '695983adf5ccdeba211397c5';

async function checkSubjects() {
  try {
    await mongoose.connect(MONGO_URI);

    const Subject = mongoose.model('Subject', new mongoose.Schema({}, { strict: false }));

    console.log('All subjects in DB:');
    const allSubjects = await Subject.find({}).limit(20);
    allSubjects.forEach(s => {
      console.log(`  ${s.name} - Owner: ${s.ownerId}`);
    });

    console.log('\n✅ Subjects for demo1:');
    const demo1Subjects = await Subject.find({ ownerId: USER_ID });
    demo1Subjects.forEach(s => {
      console.log(`  ${s.name} (${s.code}) - ${s._id}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkSubjects();
