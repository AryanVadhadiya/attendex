const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://aryanvadhadiya1_db_user:ZkFp9VS4a1flUCRc@cluster0.y2ecgli.mongodb.net/attendance_db?retryWrites=true&w=majority&appName=Cluster0';
const DEMO2_ID = '69598a0f0f8aa8b2a17f0265';

async function checkDemo2() {
  try {
    await mongoose.connect(MONGO_URI);

    const WeeklySlot = mongoose.model('WeeklySlot', new mongoose.Schema({}, { strict: false }));
    const Occurrence = mongoose.model('Occurrence', new mongoose.Schema({}, { strict: false }));

    console.log('📅 Demo2 Weekly Timetable Slots:');
    const slots = await WeeklySlot.find({ userId: DEMO2_ID }).populate('subjectId');
    slots.forEach(s => {
      console.log(`  Day ${s.dayOfWeek} - ${s.subjectId?.name || 'Unknown'} (${s.sessionType}) at ${s.startHour}:00`);
    });

    console.log('\n🗓️ Demo2 Occurrences for Sunday Jan 4, 2026:');
    const today = new Date('2026-01-04');
    const todayEnd = new Date('2026-01-05');

    const occurrences = await Occurrence.find({
      userId: DEMO2_ID,
      date: { $gte: today, $lt: todayEnd }
    }).populate('subjectId');

    occurrences.forEach(o => {
      const dayOfWeek = new Date(o.date).getDay();
      console.log(`  ${o.subjectId?.name || 'Unknown'} (${o.sessionType}) at ${o.startHour}:00 - Day of week: ${dayOfWeek}`);
    });

    console.log(`\nTotal occurrences for today: ${occurrences.length}`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkDemo2();
