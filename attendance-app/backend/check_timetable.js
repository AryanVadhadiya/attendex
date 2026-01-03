const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://aryanvadhadiya1_db_user:ZkFp9VS4a1flUCRc@cluster0.y2ecgli.mongodb.net/attendance_db?retryWrites=true&w=majority&appName=Cluster0';
const USER_ID = '695983adf5ccdeba211397c5';

async function checkTimetable() {
  try {
    await mongoose.connect(MONGO_URI);

    const WeeklySlot = mongoose.model('WeeklySlot', new mongoose.Schema({}, { strict: false }));
    const Subject = mongoose.model('Subject', new mongoose.Schema({}, { strict: false }));

    const slots = await WeeklySlot.find({ userId: USER_ID }).populate('subjectId');

    // Group by day
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const byDay = {};

    slots.forEach(slot => {
      const day = slot.dayOfWeek;
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(`${slot.subjectId?.name || 'Unknown'} (${slot.sessionType}) ${slot.startHour}:00`);
    });

    console.log('Classes by Day of Week:\n');
    Object.keys(byDay).sort().forEach(day => {
      console.log(`${dayNames[day]} (day ${day}):`);
      byDay[day].forEach(c => console.log(`  - ${c}`));
      console.log('');
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkTimetable();
