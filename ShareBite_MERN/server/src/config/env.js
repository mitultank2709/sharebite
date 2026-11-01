import dotenv from 'dotenv';
dotenv.config();
for (const key of ['MONGODB_URI','CLIENT_ORIGIN','JWT_ACCESS_SECRET','JWT_REFRESH_SECRET']) if (!process.env[key]) throw new Error(`Missing ${key} in server/.env`);
if (process.env.JWT_ACCESS_SECRET.length < 32 || process.env.JWT_REFRESH_SECRET.length < 32) throw new Error('JWT secrets must be at least 32 characters.');
export const env={port:Number(process.env.PORT||5000),mongoUri:process.env.MONGODB_URI,clientOrigin:process.env.CLIENT_ORIGIN,accessSecret:process.env.JWT_ACCESS_SECRET,refreshSecret:process.env.JWT_REFRESH_SECRET,accessMinutes:Number(process.env.ACCESS_TOKEN_MINUTES||15),refreshDays:Number(process.env.REFRESH_TOKEN_DAYS||7),cookieSecure:process.env.COOKIE_SECURE==='true',sameSite:process.env.COOKIE_SAME_SITE||'lax',production:process.env.NODE_ENV==='production'};
