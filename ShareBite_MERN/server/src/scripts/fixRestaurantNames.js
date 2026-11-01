import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sharebite';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const foods = await db.collection('foods').find().toArray();

  for (const f of foods) {
    const donor = await db.collection('users').findOne({ _id: f.donor });
    let correctRestaurant = donor && donor.restaurantName ? donor.restaurantName.trim() : '';

    if (!correctRestaurant || (donor && correctRestaurant === donor.fullName)) {
      if (donor && donor.role === 'SUPERADMIN') {
        correctRestaurant = 'ShareBite Community Kitchen';
      } else {
        correctRestaurant = 'Verified Restaurant Partner';
      }
    }

    await db.collection('foods').updateOne(
      { _id: f._id },
      { $set: { restaurantName: correctRestaurant } }
    );
    console.log(`Food: "${f.foodName}" -> restaurantName: "${correctRestaurant}"`);
  }

  // Also update SuperAdmin's restaurantName if empty so any listings they create have a clear restaurant name
  await db.collection('users').updateOne(
    { email: 'admin@example.com', $or: [{ restaurantName: '' }, { restaurantName: null }, { restaurantName: { $exists: false } }] },
    { $set: { restaurantName: 'ShareBite Community Kitchen' } }
  );

  console.log('Done!');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
