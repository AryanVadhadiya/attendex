const mongoose = require('mongoose');
const dayjs = require('dayjs');

const MONGO_URI = 'mongodb+srv://aryanvadhadiya1_db_user:ZkFp9VS4a1flUCRc@cluster0.y2ecgli.mongodb.net/attendance_db?retryWrites=true&w=majority&appName=Cluster0';
const DEMO2_ID = '69598a0f0f8aa8b2a17f0265';

mongoose.connect(MONGO_URI).then(async () => {
  const Occurrence = mongoose.model('Occurrence', new mongoose.Schema({}, { strict: false }));

  const sunday = new Date('2026-01-04'); // Today (Sunday)
  const monday = new Date('2026-01-05'); // Tomorrow (Monday)

  console.log('Sunday Jan 4:');
  const sundayOccs = await Occurrence.find({
    userId: DEMO2_ID,
    date: { $gte: sunday, $lt: new Date('2026-01-05') }
  }).populate('subjectId');
  console.log(`  Found: ${sundayOccs.length} occurrences`);
  sundayOccs.forEach(o => console.log(`    - ${o.subjectId?.name} at ${o.startHour}:00 (date: ${o.date})`));

  console.log('\nMonday Jan 5:');
  const mondayOccs = await Occurrence.find({
    userId: DEMO2_ID,
    date: { $gte: monday, $lt: new Date('2026-01-06') }
  }).populate('subjectId');
  console.log(`  Found: ${mondayOccs.length} occurrences`);
  mondayOccs.forEach(o => console.log(`    - ${o.subjectId?.name} at ${o.startHour}:00`));

  process.exit(0);
});
