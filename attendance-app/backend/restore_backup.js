require('dotenv').config();
const mongoose = require('mongoose');
const Subject = require('./src/models/Subject');
const WeeklySlot = require('./src/models/WeeklySlot');
const HolidayRange = require('./src/models/HolidayRange');
const User = require('./src/models/User');
const fs = require('fs');
const path = require('path');

async function restoreBackup(email, backupFilePath) {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/attendance_db');
        console.log('Connected to MongoDB');

        const user = await User.findOne({ email });
        if (!user) {
            console.error(`User with email ${email} not found. Please create the user first.`);
            process.exit(1);
        }
        const newUserId = user._id;

        const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

        // 1. Restore Subjects
        console.log('Restoring subjects...');
        const subjectIdMap = {}; // Map old subject IDs to new ones
        for (const sub of backupData.subjects) {
            const oldId = sub._id;
            delete sub._id;
            delete sub.__v;
            delete sub.createdAt;
            delete sub.updatedAt;
            sub.ownerId = newUserId;

            const newSub = await Subject.create(sub);
            subjectIdMap[oldId] = newSub._id;
        }

        // 2. Restore Timetable
        console.log('Restoring timetable slots...');
        for (const slot of backupData.timetable) {
            delete slot._id;
            delete slot.__v;
            delete slot.createdAt;
            delete slot.updatedAt;
            slot.userId = newUserId;
            slot.subjectId = subjectIdMap[slot.subjectId]; // Map to new subject ID

            if (slot.subjectId) {
                await WeeklySlot.create(slot);
            }
        }

        // 3. Restore Holidays
        console.log('Restoring holidays...');
        await HolidayRange.deleteMany({ userId: newUserId }); // Clear defaults
        for (const hol of backupData.holidays) {
            delete hol._id;
            delete hol.__v;
            delete hol.createdAt;
            delete hol.updatedAt;
            hol.userId = newUserId;
            await HolidayRange.create(hol);
        }

        console.log('Restore complete! 🚀');
        process.exit(0);
    } catch (err) {
        console.error('Restore failed:', err);
        process.exit(1);
    }
}

const email = process.argv[2];
const filePath = process.argv[3] || '../user_backup_abcd.json';

if (!email) {
    console.log('Usage: node restore_backup.js <target_user_email> [backup_file_path]');
    process.exit(1);
}

restoreBackup(email, path.resolve(filePath));
