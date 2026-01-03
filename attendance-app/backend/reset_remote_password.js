const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');

const MONGO_URI = 'mongodb+srv://aryanvadhadiya1_db_user:ZkFp9VS4a1flUCRc@cluster0.y2ecgli.mongodb.net/attence_db?retryWrites=true&w=majority&appName=Cluster0';

async function fixUser() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    const email = 'smoothopr@gmail.com';
    const plainPassword = 'smoothopr@123';

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    let user = await User.findOne({ email });

    if (user) {
      console.log('User found. Updating password...');
      user.passwordHash = hashedPassword;
      await user.save();
      console.log('✅ Password updated successfully for:', email);
    } else {
      console.log('User not found. Creating new user...');
      user = new User({
        email: email,
        passwordHash: hashedPassword,
        name: 'Smooth Operator', // Default name
      });
      await user.save();
      console.log('✅ User created successfully:', email);
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

fixUser();
