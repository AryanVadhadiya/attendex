const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGO_URI = 'mongodb+srv://aryanvadhadiya1_db_user:ZkFp9VS4a1flUCRc@cluster0.y2ecgli.mongodb.net/attendance_db?retryWrites=true&w=majority&appName=Cluster0';

async function fixPassword() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to attendance_db');

    const User = mongoose.model('User', new mongoose.Schema({ email: String, passwordHash: String }, { strict: false }));

    const email = 'smoothopr@gmail.com';
    const plainPassword = 'smoothopr@123';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const user = await User.findOne({ email });

    if (user) {
      user.passwordHash = hashedPassword;
      await user.save();
      console.log('✅ Password reset to: smoothopr@123');
    } else {
      console.log('❌ User not found');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

fixPassword();
