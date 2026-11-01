import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';

// Resolve MongoDB Atlas SRV records using public DNS to avoid Windows ISP querySrv ECONNREFUSED
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}

export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  console.log('MongoDB connected successfully');
}
