const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://aryanvadhadiya1_db_user:ZkFp9VS4a1flUCRc@cluster0.y2ecgli.mongodb.net/attendance_db?retryWrites=true&w=majority&appName=Cluster0';
const USER_ID = '695983adf5ccdeba211397c5'; // demo1@gmail.com

async function cleanUserData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected\n');

    const Subject = mongoose.model('Subject', new mongoose.Schema({}, { strict: false }));
    const WeeklySlot = mongoose.model('WeeklySlot', new mongoose.Schema({}, { strict: false }));
    const HolidayRange = mongoose.model('HolidayRange', new mongoose.Schema({}, { strict: false }));
    const Occurrence = mongoose.model('Occurrence', new mongoose.Schema({}, { strict: false }));
    const AttendanceRecord = mongoose.model('AttendanceRecord', new mongoose.Schema({}, { strict: false }));

    console.log('🗑️  Deleting all data for demo1@gmail.com...\n');

    const subjects = await Subject.deleteMany({ ownerId: USER_ID });
    console.log(`  ✓ Deleted ${subjects.deletedCount} subjects`);

    const slots = await WeeklySlot.deleteMany({ userId: USER_ID });
    console.log(`  ✓ Deleted ${slots.deletedCount} timetable slots`);

    const holidays = await HolidayRange.deleteMany({ userId: USER_ID });
    console.log(`  ✓ Deleted ${holidays.deletedCount} holidays`);

    const occurrences = await Occurrence.deleteMany({ userId: USER_ID });
    console.log(`  ✓ Deleted ${occurrences.deletedCount} occurrences`);

    const attendance = await AttendanceRecord.deleteMany({ userId: USER_ID });
    console.log(`  ✓ Deleted ${attendance.deletedCount} attendance records`);

    console.log('\n✅ User data cleaned successfully!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

cleanUserData();
