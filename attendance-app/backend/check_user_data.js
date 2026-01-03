const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://aryanvadhadiya1_db_user:ZkFp9VS4a1flUCRc@cluster0.y2ecgli.mongodb.net/attendance_db?retryWrites=true&w=majority&appName=Cluster0';

async function checkData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected\n');

    const WeeklySlot = mongoose.model('WeeklySlot', new mongoose.Schema({}, { strict: false }));
    const Subject = mongoose.model('Subject', new mongoose.Schema({}, { strict: false }));
    const Occurrence = mongoose.model('Occurrence', new mongoose.Schema({}, { strict: false }));

    const userId = '6958e0bbaf8a5e76bbb4e1d0';

    const slots = await WeeklySlot.countDocuments({ userId });
    const subjects = await Subject.countDocuments({ ownerId: userId });
    const occurrences = await Occurrence.countDocuments({ userId });

    console.log(`Weekly Slots: ${slots}`);
    console.log(`Subjects: ${subjects}`);
    console.log(`Occurrences: ${occurrences}`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkData();
