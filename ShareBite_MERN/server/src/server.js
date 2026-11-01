import dns from 'node:dns';

// Resolve MongoDB Atlas SRV records using public DNS to avoid Windows ISP querySrv ECONNREFUSED
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}

import app from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

await connectDatabase();

const server = app.listen(env.port, () => console.log(`ShareBite API listening on ${env.port}`));

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
