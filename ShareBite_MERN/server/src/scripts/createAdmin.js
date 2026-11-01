import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import User from '../models/User.js';

await mongoose.connect(env.mongoUri);

const { ADMIN_NAME: name, ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
if (!name || !email || !password || password.length < 6) {
  throw new Error('Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD (at least 6 chars) in server/.env');
}

const normalized = email.toLowerCase();
let user = await User.findOne({ email: normalized });

if (user) {
  user.role = 'SUPERADMIN';
  user.accountStatus = 'ACTIVE';
  user.fullName = name;
  user.passwordHash = await bcrypt.hash(password, 12);
  await user.save();
  console.log(`Updated SUPERADMIN credentials and password: ${normalized}`);
} else {
  await User.create({
    fullName: name,
    email: normalized,
    phone: '0000000000',
    passwordHash: await bcrypt.hash(password, 12),
    role: 'SUPERADMIN',
    accountStatus: 'ACTIVE',
    restaurantName: 'ShareBite Community Kitchen',
    city: 'HQ',
    address: 'ShareBite Platform HQ'
  });
  console.log(`Created Super Admin: ${normalized}`);
}

await mongoose.disconnect();
