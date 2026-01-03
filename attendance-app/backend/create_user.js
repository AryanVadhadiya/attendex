const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');
require('dotenv').config();

async function createUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const email = 'smoothopr@gmail.com';
    const password = 'smoothopr@123';

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: 'Smooth Operator',
      email,
      passwordHash,
      role: 'student'
    });

    console.log('User created successfully:', newUser.email);
    process.exit(0);
  } catch (err) {
    console.error('Error creating user:', err);
    process.exit(1);
  }
}

createUser();
