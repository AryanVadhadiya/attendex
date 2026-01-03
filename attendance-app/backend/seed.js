const mongoose = require('mongoose');
const User = require('./src/models/User');
const Subject = require('./src/models/Subject');
const WeeklySlot = require('./src/models/WeeklySlot');
const HolidayRange = require('./src/models/HolidayRange');
const { publishTimetable } = require('./src/controllers/timetable.controller');
// Note: reusing controller logic might be hard if it depends on req/res.
// We will just create raw data or mock the call.
// Actually, let's just create the raw data for 'Template' and let user hit 'Publish' in UI?
// Or we can simulate publish.

require('dotenv').config();

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/attendance_db');
        console.log('Connected to DB');

        // Cleanup
        const demoEmail = 'demo@example.com';
        await User.deleteOne({ email: demoEmail });
        // We should also clean up related data if we were strict, but let's assume loose dev.

        // Create User
        const bcrypt = require('bcrypt');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('password123', salt);

        const user = await User.create({
            name: 'Demo Student',
            email: demoEmail,
            passwordHash,
            role: 'student'
        });
        console.log(`Created User: ${user.email} / password123`);

        // Create Subjects
        const sub1 = await Subject.create({ name: 'Data Structures', code: 'CS101', color: '#3b82f6', ownerId: user._id });
        const sub2 = await Subject.create({ name: 'Digital Logic', code: 'EE200', color: '#10b981', ownerId: user._id });
        const sub3 = await Subject.create({ name: 'Calculus', code: 'MA102', color: '#f59e0b', ownerId: user._id });
        console.log('Created Subjects');

        // Create Weekly Slots
        // Mon 9:00 Lecture Sub1
        // Mon 11:00 Lab Sub2 (2 hours)
        // Tue 10:00 Lecture Sub3
        const slots = [
            { userId: user._id, subjectId: sub1._id, dayOfWeek: 1, startHour: 9, durationHours: 1, sessionType: 'lecture' },
            { userId: user._id, subjectId: sub2._id, dayOfWeek: 1, startHour: 11, durationHours: 2, sessionType: 'lab' },
            { userId: user._id, subjectId: sub3._id, dayOfWeek: 2, startHour: 10, durationHours: 1, sessionType: 'lecture' }
        ];

        await WeeklySlot.insertMany(slots);
        console.log('Created Weekly Slots');

        // Create Holidays
        await HolidayRange.create({
            userId: user._id,
            startDate: new Date('2026-01-26'),
            endDate: new Date('2026-01-26'),
            reason: 'Republic Day'
        });
        console.log('Created Holidays');

        console.log('Seed Complete. Log in and hit Publish Timetable!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seed();
