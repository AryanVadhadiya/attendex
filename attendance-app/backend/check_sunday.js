const mongoose = require('mongoose');
const uri = 'mongodb+srv://aryanvadhadiya1_db_user:ZkFp9VS4a1flUCRc@cluster0.y2ecgli.mongodb.net/attendance_db?retryWrites=true&w=majority&appName=Cluster0';
const userId = '695983adf5ccdeba211397c5';

mongoose.connect(uri).then(async () => {
  const Occurrence = mongoose.model('Occurrence', new mongoose.Schema({}, { strict: false }));
  const today = new Date('2026-01-04');
  const todayEnd = new Date('2026-01-05');

  const occurrences = await Occurrence.find({
    userId,
    date: { $gte: today, $lt: todayEnd }
  }).populate('subjectId');

  console.log(`Occurrences for Sunday, Jan 4, 2026 (${occurrences.length} found):`);
  occurrences.forEach(o => {
    console.log(`  - ${o.subjectId?.name || 'Unknown'} (${o.sessionType}) at ${o.startHour}:00`);
  });

  console.log(`\nDay of week for 2026-01-04: ${today.getDay()}`); // Should be 0 (Sunday)

  process.exit(0);
});
