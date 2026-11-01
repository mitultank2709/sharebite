# ShareBite – React + Node + Express + MongoDB

Converted full-stack ShareBite food waste management application.

## Roles
- **ADMIN**: restaurant owner / food donor. Creates food listings, approves listings, and manages requests for their own food.
- **CUSTOMER**: food receiver. Browses approved food, requests pickup, and tracks/cancels eligible requests.

Public registration always creates CUSTOMER accounts. Create the first ADMIN with the seed script. Admin-created listings start as `PENDING_APPROVAL`; after approval they become visible to customers.

## Stack
React + Vite, Node.js + Express, MongoDB Atlas + Mongoose, JWT access tokens, rotating refresh tokens in HTTP-only cookies, bcrypt password hashing, Zod validation, Helmet, CORS and rate limiting.

## Requirements
Node.js 20+ and MongoDB Atlas or local MongoDB.

## Run locally
1. Extract the ZIP and open the project folder.
2. Run `npm install`.
3. Copy `server/.env.example` to `server/.env` and set your MongoDB URI and long random JWT secrets.
4. Create an admin: `npm run seed:admin -w server`.
5. Run `npm run dev`.
6. Open `http://localhost:5173`. API: `http://localhost:5000/api/v1/health`.

## Core workflow
Admin creates listing → listing enters PENDING_APPROVAL → Admin approves → Customer browses approved food → Customer requests food → Admin accepts/rejects → Admin marks ready/completed.

## Included food catalogue
Veg: Dal Rice, Gujarati Thali, Roti/Chapati, Seasonal Sabji, Buttermilk/Chaas, Papad, Veg Pulao, Jeera Rice, Khichdi, Thepla, Poha, Idli Sambar, Paneer Curry, Veg Biryani, Pav Bhaji, Upma, Sandwich, Fresh Fruits, Salad, Other Veg Food.

Non-Veg: Chicken Biryani, Chicken Curry, Chicken Pulao, Egg Biryani, Boiled Eggs, Fish Curry, Fish Fry, Chicken Fried Rice, Egg Curry, Chicken Tikka, Mutton Curry, Mutton Biryani, Other Non-Veg Food.

## Production checklist
This is a runnable starter foundation, not a claim of production certification. Before launch configure HTTPS, strong secrets, secure cookie settings, CSRF protection appropriate to your hosting topology, email verification, password reset, Cloudinary image storage, monitoring, backups, automated tests and a security review. Review local food-safety and privacy requirements. Never commit `.env` files.
