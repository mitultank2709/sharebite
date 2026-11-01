import { Router } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import multer from 'multer';
import { env } from '../config/env.js';
import User from '../models/User.js';
import RefreshSession from '../models/RefreshSession.js';
import Food from '../models/Food.js';
import FoodRequest from '../models/FoodRequest.js';
import FoodItem from '../models/FoodItem.js';
import { authenticate, authorize } from '../middleware/auth.js';

// Auto-seed default global food items if none exist
async function ensureDefaultFoodItems() {
  try {
    const count = await FoodItem.countDocuments({ restaurant: null });
    if (count === 0) {
      const superAdmin = await User.findOne({ role: 'SUPERADMIN' });
      const adminId = superAdmin ? superAdmin._id : null;
      if (!adminId) return;

      const defaultVeg = [
        'Dal Rice', 'Gujarati Thali', 'Roti / Chapati', 'Seasonal Sabji',
        'Buttermilk / Chaas', 'Papad', 'Veg Pulao', 'Jeera Rice', 'Khichdi',
        'Thepla', 'Poha', 'Idli Sambar', 'Paneer Curry', 'Veg Biryani',
        'Pav Bhaji', 'Upma', 'Sandwich', 'Fresh Fruits', 'Salad'
      ];
      const defaultNonVeg = [
        'Chicken Biryani', 'Chicken Curry', 'Chicken Pulao', 'Egg Biryani',
        'Boiled Eggs', 'Fish Curry', 'Fish Fry', 'Chicken Fried Rice',
        'Egg Curry', 'Chicken Tikka', 'Mutton Curry', 'Mutton Biryani'
      ];

      const docs = [
        ...defaultVeg.map(name => ({ name, foodType: 'VEG', restaurant: null, createdBy: adminId })),
        ...defaultNonVeg.map(name => ({ name, foodType: 'NON_VEG', restaurant: null, createdBy: adminId }))
      ];

      await FoodItem.insertMany(docs, { ordered: false }).catch(() => {});
    }
  } catch {}
}
ensureDefaultFoodItems();

const router = Router();
const cookieName = 'sharebite_refresh';
const cookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.sameSite,
  path: '/',
  maxAge: env.refreshDays * 86400000
};

const hash = t => crypto.createHash('sha256').update(t).digest('hex');
const access = u => jwt.sign({ sub: u._id.toString(), role: u.role }, env.accessSecret, { expiresIn: `${env.accessMinutes}m`, issuer: 'sharebite' });
const refresh = (u, sid) => jwt.sign({ sub: u._id.toString(), sid }, env.refreshSecret, { expiresIn: `${env.refreshDays}d`, issuer: 'sharebite' });

const safe = u => ({
  id: u._id,
  fullName: u.fullName,
  restaurantName: u.restaurantName || '',
  email: u.email,
  phone: u.phone,
  role: u.role,
  address: u.address || '',
  city: u.city || '',
  accountStatus: u.accountStatus,
  createdAt: u.createdAt
});

/* -------------------------------------------------------------
   FILE UPLOAD (Stored locally in server/uploads)
------------------------------------------------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (/image\/(jpeg|jpg|png|webp|gif)/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed.'));
    }
  }
});

router.post('/upload', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file uploaded.' });
  }
  const host = req.get('host');
  const protocol = req.protocol;
  const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

/* -------------------------------------------------------------
   AUTHENTICATION & REGISTRATION
------------------------------------------------------------- */
router.post('/auth/register', async (req, res, next) => {
  try {
    const d = z.object({
      fullName: z.string().min(2).max(100),
      restaurantName: z.string().max(120).optional().default(''),
      email: z.string().email(),
      phone: z.string().min(7).max(20),
      password: z.string().min(6).max(72),
      role: z.enum(['ADMIN', 'CUSTOMER']).default('CUSTOMER'),
      address: z.string().max(300).optional().default(''),
      city: z.string().max(100).optional().default('')
    }).parse(req.body);

    if (await User.exists({ email: d.email.toLowerCase() })) {
      return res.status(409).json({ success: false, message: 'Email is already registered.' });
    }

    // Role ADMIN = Restaurant Owner / Food Donor; CUSTOMER = Food Receiver
    // Both require Superadmin approval before they can log in
    const user = await User.create({
      ...d,
      email: d.email.toLowerCase(),
      passwordHash: await bcrypt.hash(d.password, 12),
      role: d.role,
      accountStatus: 'PENDING_APPROVAL'
    });

    const isDonor = d.role === 'ADMIN';
    const message = isDonor
      ? 'Registration submitted! Your restaurant owner / food donor account is pending approval by the Super Admin. You will be able to log in and publish surplus food once approved.'
      : 'Registration submitted! Your customer account is pending approval by the Super Admin. You will be able to log in and request food once approved.';

    res.status(201).json({
      success: true,
      message,
      data: { user: safe(user) }
    });
  } catch (e) {
    next(e);
  }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const d = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    }).parse(req.body);

    const u = await User.findOne({ email: d.email.toLowerCase() }).select('+passwordHash');
    if (!u || !(await bcrypt.compare(d.password, u.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (u.accountStatus === 'PENDING_APPROVAL') {
      return res.status(403).json({
        success: false,
        message: 'Your registration is currently pending approval by the Super Admin. Please wait for approval before logging in.'
      });
    }

    if (u.accountStatus === 'REJECTED') {
      return res.status(403).json({
        success: false,
        message: 'Your account registration was not approved by the Super Admin.'
      });
    }

    if (u.accountStatus !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by the Super Admin.'
      });
    }

    const sid = crypto.randomUUID();
    const rt = refresh(u, sid);
    await RefreshSession.create({
      user: u._id,
      sessionId: sid,
      tokenHash: hash(rt),
      expiresAt: new Date(Date.now() + env.refreshDays * 86400000)
    });

    res.cookie(cookieName, rt, cookieOptions).json({
      success: true,
      data: { user: safe(u), accessToken: access(u), refreshToken: rt }
    });
  } catch (e) {
    next(e);
  }
});

router.post('/auth/refresh', async (req, res, next) => {
  try {
    const token = req.cookies[cookieName] || req.body?.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'Session expired.' });
    const p = jwt.verify(token, env.refreshSecret, { issuer: 'sharebite' });
    const s = await RefreshSession.findOne({ sessionId: p.sid, user: p.sub });
    if (!s || s.revokedAt || s.tokenHash !== hash(token) || s.expiresAt < new Date()) {
      return res.status(401).json({ success: false, message: 'Session expired. Log in again.' });
    }
    const u = await User.findById(p.sub);
    if (!u || u.accountStatus !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'Account unavailable.' });
    }
    const next = refresh(u, s.sessionId);
    s.tokenHash = hash(next);
    s.expiresAt = new Date(Date.now() + env.refreshDays * 86400000);
    await s.save();
    res.cookie(cookieName, next, cookieOptions).json({
      success: true,
      data: { user: safe(u), accessToken: access(u), refreshToken: next }
    });
  } catch (e) {
    next(e);
  }
});

router.post('/auth/logout', async (req, res) => {
  const token = req.cookies[cookieName] || req.body?.refreshToken;
  if (token) {
    try {
      const p = jwt.verify(token, env.refreshSecret, { issuer: 'sharebite' });
      await RefreshSession.updateOne({ sessionId: p.sid }, { revokedAt: new Date() });
    } catch {}
  }
  res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });
  res.json({ success: true, message: 'Logged out.' });
});

router.get('/auth/me', authenticate, (req, res) => res.json({ success: true, data: { user: safe(req.user) } }));

/* -------------------------------------------------------------
   SUPERADMIN MANAGEMENT ENDPOINTS
------------------------------------------------------------- */
router.get('/superadmin/stats', authenticate, authorize('SUPERADMIN'), async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalDonors,
      totalCustomers,
      pendingUsers,
      totalFoods,
      totalRequests
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'SUPERADMIN' } }),
      User.countDocuments({ role: 'ADMIN' }),
      User.countDocuments({ role: 'CUSTOMER' }),
      User.countDocuments({ accountStatus: 'PENDING_APPROVAL' }),
      Food.countDocuments(),
      FoodRequest.countDocuments()
    ]);
    res.json({
      success: true,
      data: {
        totalUsers,
        totalDonors,
        totalCustomers,
        pendingUsers,
        totalFoods,
        totalRequests
      }
    });
  } catch (e) {
    next(e);
  }
});

router.get('/superadmin/users', authenticate, authorize('SUPERADMIN'), async (req, res, next) => {
  try {
    const q = { role: { $ne: 'SUPERADMIN' } };
    if (req.query.role) q.role = req.query.role;
    if (req.query.status) q.accountStatus = req.query.status;
    if (req.query.search) {
      const s = String(req.query.search);
      q.$or = [
        { fullName: { $regex: s, $options: 'i' } },
        { restaurantName: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { city: { $regex: s, $options: 'i' } }
      ];
    }
    const users = await User.find(q).sort({ createdAt: -1 });
    res.json({ success: true, data: { users: users.map(safe) } });
  } catch (e) {
    next(e);
  }
});

router.patch('/superadmin/users/:id/:action', authenticate, authorize('SUPERADMIN'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'SUPERADMIN') {
      return res.status(404).json({ success: false, message: 'User not found or cannot modify Super Admin.' });
    }

    const actionMap = {
      approve: 'ACTIVE',
      reject: 'REJECTED',
      suspend: 'SUSPENDED',
      activate: 'ACTIVE'
    };

    const targetStatus = actionMap[req.params.action];
    if (!targetStatus) return res.status(400).json({ success: false, message: 'Invalid action.' });

    user.accountStatus = targetStatus;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.fullName} status updated to ${targetStatus}.`,
      data: { user: safe(user) }
    });
  } catch (e) {
    next(e);
  }
});

router.delete('/superadmin/users/:id', authenticate, authorize('SUPERADMIN'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'SUPERADMIN') {
      return res.status(404).json({ success: false, message: 'User not found or cannot delete Super Admin.' });
    }

    await Promise.all([
      User.deleteOne({ _id: user._id }),
      Food.deleteMany({ donor: user._id }),
      FoodRequest.deleteMany({ $or: [{ donor: user._id }, { customer: user._id }] }),
      RefreshSession.deleteMany({ user: user._id })
    ]);

    res.json({ success: true, message: `User "${user.fullName}" deleted successfully.` });
  } catch (e) {
    next(e);
  }
});

router.get('/superadmin/foods', authenticate, authorize('SUPERADMIN'), async (req, res, next) => {
  try {
    const foods = await Food.find()
      .populate('donor', 'fullName restaurantName email phone city')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { items: foods } });
  } catch (e) {
    next(e);
  }
});

router.get('/superadmin/requests', authenticate, authorize('SUPERADMIN'), async (req, res, next) => {
  try {
    const requests = await FoodRequest.find()
      .populate('food', 'foodName foodType quantity unit city pickupAddress restaurantName')
      .populate('donor', 'fullName restaurantName phone email city')
      .populate('customer', 'fullName email phone address city')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { items: requests } });
  } catch (e) {
    next(e);
  }
});

/* -------------------------------------------------------------
   FOOD ITEMS CRUD (Superadmin & Restaurant Owner)
------------------------------------------------------------- */
router.get('/food-items', authenticate, async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === 'SUPERADMIN') {
      if (req.query.restaurant) {
        filter = req.query.restaurant === 'null' ? { restaurant: null } : { restaurant: req.query.restaurant };
      }
    } else if (req.user.role === 'ADMIN') {
      // Restaurant owner ONLY sees: Global standard items (null) + THEIR OWN restaurant's custom items
      filter = { $or: [{ restaurant: null }, { restaurant: req.user._id }] };
    } else {
      filter = { restaurant: null };
    }

    if (['VEG', 'NON_VEG'].includes(req.query.type)) {
      filter.foodType = req.query.type;
    }

    const items = await FoodItem.find(filter)
      .populate('restaurant', 'fullName restaurantName')
      .sort({ restaurant: 1, name: 1 });

    res.json({ success: true, data: { items } });
  } catch (e) {
    next(e);
  }
});

router.post('/food-items', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const d = z.object({
      name: z.string().min(2).max(120),
      foodType: z.enum(['VEG', 'NON_VEG']),
      restaurantId: z.string().optional()
    }).parse(req.body);

    let restaurant = null;
    if (req.user.role === 'ADMIN') {
      restaurant = req.user._id;
    } else if (req.user.role === 'SUPERADMIN') {
      restaurant = d.restaurantId || null;
    }

    const existing = await FoodItem.findOne({ name: d.name, restaurant });
    if (existing) {
      return res.status(409).json({ success: false, message: `Food item "${d.name}" already exists.` });
    }

    const item = await FoodItem.create({
      name: d.name,
      foodType: d.foodType,
      restaurant,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Food item created successfully.', data: { item } });
  } catch (e) {
    next(e);
  }
});

router.put('/food-items/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const filter = req.user.role === 'SUPERADMIN'
      ? { _id: req.params.id }
      : { _id: req.params.id, restaurant: req.user._id };

    const item = await FoodItem.findOne(filter);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Food item not found or unauthorized to edit.' });
    }

    const d = z.object({
      name: z.string().min(2).max(120).optional(),
      foodType: z.enum(['VEG', 'NON_VEG']).optional()
    }).parse(req.body);

    Object.assign(item, d);
    await item.save();

    res.json({ success: true, message: 'Food item updated successfully.', data: { item } });
  } catch (e) {
    next(e);
  }
});

router.delete('/food-items/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const filter = req.user.role === 'SUPERADMIN'
      ? { _id: req.params.id }
      : { _id: req.params.id, restaurant: req.user._id };

    const item = await FoodItem.findOne(filter);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Food item not found or unauthorized to delete.' });
    }

    await FoodItem.deleteOne({ _id: item._id });
    res.json({ success: true, message: `Food item "${item.name}" deleted successfully.` });
  } catch (e) {
    next(e);
  }
});

/* -------------------------------------------------------------
   FOOD LISTINGS (Public & Donors)
------------------------------------------------------------- */
router.get('/food', async (req, res, next) => {
  try {
    const q = {
      approvalStatus: 'APPROVED',
      availabilityStatus: 'AVAILABLE',
      bestBefore: { $gt: new Date() },
      quantity: { $gt: 0 }
    };
    if (['VEG', 'NON_VEG'].includes(req.query.type)) q.foodType = req.query.type;
    if (req.query.city) q.city = { $regex: String(req.query.city), $options: 'i' };
    if (req.query.search) q.$text = { $search: String(req.query.search) };

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(30, Math.max(1, Number(req.query.limit || 12)));

    const [items, total] = await Promise.all([
      Food.find(q)
        .populate('donor', 'fullName restaurantName city phone address')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Food.countDocuments(q)
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (e) {
    next(e);
  }
});

router.get('/food/mine', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const filter = req.user.role === 'SUPERADMIN' ? {} : { donor: req.user._id };
  const items = await Food.find(filter)
    .populate('donor', 'fullName restaurantName city phone')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { items } });
});

router.post('/food', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const d = z.object({
      foodName: z.string().min(2).max(120),
      foodType: z.enum(['VEG', 'NON_VEG']),
      description: z.string().max(1200).optional().default(''),
      imageUrl: z.string().url().or(z.literal('')).optional().default(''),
      quantity: z.coerce.number().positive(),
      unit: z.enum(['servings', 'kg', 'plates', 'packets', 'litres', 'pieces']),
      preparedAt: z.coerce.date(),
      bestBefore: z.coerce.date(),
      pickupAddress: z.string().min(5).max(300),
      city: z.string().min(2).max(100),
      restaurantName: z.string().max(120).optional().default(''),
      instructions: z.string().max(500).optional().default('')
    }).parse(req.body);

    if (d.bestBefore <= d.preparedAt) {
      return res.status(400).json({ success: false, message: 'Best-before time must be after preparation time.' });
    }

    let donorId = req.user._id;
    let restaurant = (req.user.restaurantName || '').trim();
    if (!restaurant) {
      restaurant = req.user.role === 'SUPERADMIN' ? (d.restaurantName || 'ShareBite Community Kitchen') : 'Verified Restaurant Partner';
    }

    if (req.user.role === 'SUPERADMIN' && req.body.donorId) {
      const target = await User.findById(req.body.donorId);
      if (target) {
        donorId = target._id;
        restaurant = (target.restaurantName || '').trim() || d.restaurantName || 'Verified Restaurant Partner';
      }
    }

    const food = await Food.create({
      ...d,
      restaurantName: restaurant,
      donor: donorId,
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
      availabilityStatus: 'AVAILABLE'
    });

    res.status(201).json({
      success: true,
      message: 'Food listing published successfully.',
      data: { food }
    });
  } catch (e) {
    next(e);
  }
});

router.get('/food/:id', async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id)
      .populate('donor', 'fullName restaurantName city phone address');
    if (!food) return res.status(404).json({ success: false, message: 'Food listing not found.' });
    res.json({ success: true, data: { food } });
  } catch (e) {
    next(e);
  }
});

router.put('/food/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const filter = req.user.role === 'SUPERADMIN' ? { _id: req.params.id } : { _id: req.params.id, donor: req.user._id };
    const f = await Food.findOne(filter);
    if (!f) return res.status(404).json({ success: false, message: 'Food listing not found.' });

    const d = z.object({
      foodName: z.string().min(2).max(120).optional(),
      foodType: z.enum(['VEG', 'NON_VEG']).optional(),
      description: z.string().max(1200).optional(),
      imageUrl: z.string().url().or(z.literal('')).optional(),
      quantity: z.coerce.number().min(0).optional(),
      unit: z.enum(['servings', 'kg', 'plates', 'packets', 'litres', 'pieces']).optional(),
      preparedAt: z.coerce.date().optional(),
      bestBefore: z.coerce.date().optional(),
      pickupAddress: z.string().min(5).max(300).optional(),
      city: z.string().min(2).max(100).optional(),
      restaurantName: z.string().max(120).optional(),
      instructions: z.string().max(500).optional(),
      availabilityStatus: z.enum(['AVAILABLE', 'RESERVED', 'COMPLETED', 'EXPIRED', 'REMOVED']).optional()
    }).parse(req.body);

    const prep = d.preparedAt || f.preparedAt;
    const best = d.bestBefore || f.bestBefore;
    if (best <= prep) return res.status(400).json({ success: false, message: 'Best-before time must be after preparation time.' });

    if (req.user.role !== 'SUPERADMIN') {
      delete d.restaurantName;
    }

    Object.assign(f, d);
    if (d.quantity !== undefined && d.quantity > 0 && f.availabilityStatus === 'RESERVED') {
      f.availabilityStatus = 'AVAILABLE';
    }
    await f.save();

    res.json({ success: true, message: 'Food listing updated successfully.', data: { food: f } });
  } catch (e) {
    next(e);
  }
});

router.delete('/food/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const filter = req.user.role === 'SUPERADMIN' ? { _id: req.params.id } : { _id: req.params.id, donor: req.user._id };
    const f = await Food.findOne(filter);
    if (!f) return res.status(404).json({ success: false, message: 'Food listing not found.' });

    const activeReqs = await FoodRequest.countDocuments({
      food: f._id,
      status: { $in: ['PENDING', 'ACCEPTED', 'READY_FOR_PICKUP'] }
    });
    if (activeReqs > 0) {
      return res.status(409).json({ success: false, message: `Cannot delete listing: ${activeReqs} active pickup request(s) exist.` });
    }

    await Food.deleteOne({ _id: f._id });
    res.json({ success: true, message: 'Food listing deleted successfully.' });
  } catch (e) {
    next(e);
  }
});

/* -------------------------------------------------------------
   ADMIN / DONOR DASHBOARD & REQUEST MANAGEMENT
------------------------------------------------------------- */
router.get('/admin/dashboard', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const donor = req.user._id;
  const filter = req.user.role === 'SUPERADMIN' ? {} : { donor };

  const [totalFood, availableFood, reservedFood, totalRequests, pendingRequests, completedRequests] = await Promise.all([
    Food.countDocuments(filter),
    Food.countDocuments({ ...filter, availabilityStatus: 'AVAILABLE', bestBefore: { $gt: new Date() } }),
    Food.countDocuments({ ...filter, availabilityStatus: 'RESERVED' }),
    FoodRequest.countDocuments(filter),
    FoodRequest.countDocuments({ ...filter, status: 'PENDING' }),
    FoodRequest.countDocuments({ ...filter, status: 'COMPLETED' })
  ]);

  res.json({
    success: true,
    data: { totalFood, availableFood, reservedFood, totalRequests, pendingRequests, completedRequests }
  });
});

router.get('/admin/requests', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const filter = req.user.role === 'SUPERADMIN' ? {} : { donor: req.user._id };
  const items = await FoodRequest.find(filter)
    .populate('food', 'foodName foodType quantity unit city pickupAddress bestBefore restaurantName')
    .populate('customer', 'fullName email phone address city')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { items } });
});

router.patch('/admin/requests/:id/:action', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const map = {
      accept: ['PENDING', 'ACCEPTED'],
      reject: ['PENDING', 'REJECTED'],
      ready: ['ACCEPTED', 'READY_FOR_PICKUP'],
      complete: ['READY_FOR_PICKUP', 'COMPLETED']
    };
    const filter = req.user.role === 'SUPERADMIN' ? { _id: req.params.id } : { _id: req.params.id, donor: req.user._id };
    const r = await FoodRequest.findOne(filter);
    if (!r) return res.status(404).json({ success: false, message: 'Request not found.' });

    const transition = map[req.params.action];
    if (!transition || r.status !== transition[0]) {
      return res.status(409).json({ success: false, message: 'Invalid request status transition.' });
    }

    r.status = transition[1];
    await r.save();

    // Return stock if rejected
    if (r.status === 'REJECTED') {
      const f = await Food.findById(r.food);
      if (f && f.bestBefore > new Date()) {
        f.quantity += r.requestedQuantity;
        if (f.availabilityStatus === 'RESERVED') f.availabilityStatus = 'AVAILABLE';
        await f.save();
      }
    }

    res.json({ success: true, data: { request: r } });
  } catch (e) {
    next(e);
  }
});

/* -------------------------------------------------------------
   CUSTOMER FOOD REQUESTS
------------------------------------------------------------- */
router.post('/requests', authenticate, authorize('CUSTOMER'), async (req, res, next) => {
  try {
    if (req.user.accountStatus !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your account must be approved by the Super Admin before placing food requests.'
      });
    }

    const d = z.object({
      foodId: z.string(),
      receiverName: z.string().min(2),
      receiverPhone: z.string().min(7),
      requestedQuantity: z.coerce.number().positive(),
      pickupAddress: z.string().min(5),
      city: z.string().min(2),
      instructions: z.string().max(500).optional().default('')
    }).parse(req.body);

    const f = await Food.findOneAndUpdate({
      _id: d.foodId,
      approvalStatus: 'APPROVED',
      availabilityStatus: 'AVAILABLE',
      bestBefore: { $gt: new Date() },
      quantity: { $gte: d.requestedQuantity }
    }, {
      $inc: { quantity: -d.requestedQuantity }
    }, { new: true });

    if (!f) {
      return res.status(409).json({
        success: false,
        message: 'Food is unavailable or requested quantity exceeds remaining stock.'
      });
    }

    try {
      const r = await FoodRequest.create({
        food: f._id,
        donor: f.donor,
        customer: req.user._id,
        receiverName: d.receiverName,
        receiverPhone: d.receiverPhone,
        requestedQuantity: d.requestedQuantity,
        unit: f.unit,
        pickupAddress: d.pickupAddress,
        city: d.city,
        instructions: d.instructions
      });

      if (f.quantity === 0) {
        f.availabilityStatus = 'RESERVED';
        await f.save();
      }

      res.status(201).json({ success: true, data: { request: r } });
    } catch (e) {
      await Food.findByIdAndUpdate(f._id, { $inc: { quantity: d.requestedQuantity } });
      throw e;
    }
  } catch (e) {
    next(e);
  }
});

router.get('/requests/my', authenticate, authorize('CUSTOMER'), async (req, res) => {
  const items = await FoodRequest.find({ customer: req.user._id })
    .populate('food', 'foodName foodType city bestBefore restaurantName imageUrl')
    .populate('donor', 'fullName restaurantName phone address city')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { items } });
});

router.patch('/requests/:id/cancel', authenticate, authorize('CUSTOMER'), async (req, res, next) => {
  try {
    const r = await FoodRequest.findOne({ _id: req.params.id, customer: req.user._id });
    if (!r) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (!['PENDING', 'ACCEPTED'].includes(r.status)) {
      return res.status(409).json({ success: false, message: 'This request cannot be cancelled.' });
    }

    r.status = 'CANCELLED';
    await r.save();

    const f = await Food.findById(r.food);
    if (f && f.bestBefore > new Date() && f.approvalStatus === 'APPROVED') {
      f.quantity += r.requestedQuantity;
      f.availabilityStatus = 'AVAILABLE';
      await f.save();
    }

    res.json({ success: true, data: { request: r } });
  } catch (e) {
    next(e);
  }
});

export default router;
