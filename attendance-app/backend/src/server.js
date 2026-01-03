const app = require('./app');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5090;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/attendance_db';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });
