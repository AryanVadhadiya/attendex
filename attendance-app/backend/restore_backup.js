const mongoose = require('mongoose');
const fs = require('fs');

const MONGO_URI = 'mongodb+srv://aryanvadhadiya1_db_user:ZkFp9VS4a1flUCRc@cluster0.y2ecgli.mongodb.net/attendance_db?retryWrites=true&w=majority&appName=Cluster0';
const NEW_USER_ID = '695983adf5ccdeba211397c5'; // demo1@gmail.com

async function restoreBackup() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Load backup
    const backup = JSON.parse(fs.readFileSync('../user_backup_abcd.json', 'utf8'));

    const Subject = mongoose.model('Subject', new mongoose.Schema({}, { strict: false }));
    const WeeklySlot = mongoose.model('WeeklySlot', new mongoose.Schema({}, { strict: false }));
    const HolidayRange = mongoose.model('HolidayRange', new mongoose.Schema({}, { strict: false }));

    // Create subject mapping (old ID -> new ID)
    const subjectMap = {};

    console.log('📚 Importing Subjects...');
    for (const subject of backup.subjects) {
      const oldId = subject._id;
      delete subject._id;
      subject.ownerId = new mongoose.Types.ObjectId(NEW_USER_ID); // Convert to ObjectId

      const newSubject = await Subject.create(subject);
      subjectMap[oldId] = newSubject._id.toString();
      console.log(`  ✓ ${subject.name} (${subject.code})`);
    }

    console.log('\n📅 Importing Timetable Slots...');
    for (const slot of backup.timetable) {
      delete slot._id;
      slot.userId = new mongoose.Types.ObjectId(NEW_USER_ID); // Convert to ObjectId
      slot.subjectId = subjectMap[slot.subjectId]; // Map to new subject ID

      await WeeklySlot.create(slot);
    }
    console.log(`  ✓ Imported ${backup.timetable.length} slots`);

    console.log('\n🎉 Importing Holidays...');
    for (const holiday of backup.holidays) {
      delete holiday._id;
      holiday.userId = new mongoose.Types.ObjectId(NEW_USER_ID); // Convert to ObjectId

      await HolidayRange.create(holiday);
      console.log(`  ✓ ${holiday.reason}`);
    }

    console.log('\n✅ Backup restored successfully!');
    console.log(`   - ${backup.subjects.length} subjects`);
    console.log(`   - ${backup.timetable.length} timetable slots`);
    console.log(`   - ${backup.holidays.length} holidays`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

restoreBackup();
