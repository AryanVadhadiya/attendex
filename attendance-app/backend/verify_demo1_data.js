const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://aryanvadhadiya1_db_user:ZkFp9VS4a1flUCRc@cluster0.y2ecgli.mongodb.net/attendance_db?retryWrites=true&w=majority&appName=Cluster0';
const USER_ID = '695983adf5ccdeba211397c5'; // demo1@gmail.com

async function checkData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected\n');

    const Subject = mongoose.model('Subject', new mongoose.Schema({}, { strict: false }));
    const WeeklySlot = mongoose.model('WeeklySlot', new mongoose.Schema({}, { strict: false }));
    const HolidayRange = mongoose.model('HolidayRange', new mongoose.Schema({}, { strict: false }));

    const subjects = await Subject.countDocuments({ ownerId: USER_ID });
    const slots = await WeeklySlot.countDocuments({ userId: USER_ID });
    const holidays = await HolidayRange.countDocuments({ userId: USER_ID });

    console.log(`Subjects: ${subjects}`);
    console.log(`Timetable Slots: ${slots}`);
    console.log(`Holidays: ${holidays}`);

    if (subjects > 0) {
      console.log('\n📚 Subjects:');
      const subList = await Subject.find({ ownerId: USER_ID }).limit(3);
      subList.forEach(s => console.log(`  - ${s.name} (${s.code})`));
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkData();
