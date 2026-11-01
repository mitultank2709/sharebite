import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, NavLink, Route, Routes, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Leaf, ArrowRight, MapPin, Clock3, LogOut, Plus, Check, X, Menu,
  Edit2, Trash2, RefreshCw, ShoppingBag, Utensils, User as UserIcon,
  Phone, Mail, FileText, CheckCircle2, AlertTriangle, Layers, Calendar,
  Store, Shield, ShieldCheck, Upload, Image, UserCheck, UserX, AlertCircle, BookOpen,
  Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../context';
import api from '../lib/api';

function Guard({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader">Loading ShareBite…</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (role) {
    if (role === 'SUPERADMIN' && user.role !== 'SUPERADMIN') {
      return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/customer'} replace />;
    }
    if (role === 'ADMIN' && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      return <Navigate to="/customer" replace />;
    }
    if (role === 'CUSTOMER' && user.role !== 'CUSTOMER' && user.role !== 'SUPERADMIN') {
      return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/superadmin'} replace />;
    }
  }
  return children;
}

function ConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmText = 'Yes, Confirm',
  cancelText = 'Cancel',
  isDanger = true,
  busy = false,
  onConfirm,
  onClose
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="confirm-box" onClick={e => e.stopPropagation()}>
        <div className="confirm-icon">
          <Trash2 size={26} />
        </div>
        <h3 className="confirm-title">{title}</h3>
        <div className="confirm-desc">{message}</div>
        <div className="confirm-actions">
          <button
            type="button"
            className="btn secondary"
            onClick={onClose}
            disabled={busy}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${isDanger ? 'danger' : ''}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Please wait…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   FOOD ITEM MANAGER MODAL (CRUD for Dishes / Menu Items)
   ========================================================================= */
function FoodItemManagerModal({ isOpen, onClose, onItemsUpdated, user }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [foodType, setFoodType] = useState('VEG');
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('VEG');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadItems() {
    try {
      const res = await api.get('/food-items');
      setItems(res.data.data.items || []);
    } catch (e) {
      setError('Failed to load food catalogue items');
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadItems();
      setName('');
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setBusy(true);
    try {
      await api.post('/food-items', { name: name.trim(), foodType });
      setSuccess(`Added "${name.trim()}" to menu items!`);
      setName('');
      await loadItems();
      if (onItemsUpdated) onItemsUpdated();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to add food item');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!editingItem || !editName.trim()) return;
    setError('');
    setBusy(true);
    try {
      await api.put(`/food-items/${editingItem._id}`, { name: editName.trim(), foodType: editType });
      setSuccess(`Updated "${editName.trim()}" successfully!`);
      setEditingItem(null);
      await loadItems();
      if (onItemsUpdated) onItemsUpdated();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update food item');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}" from menu items?`)) return;
    setError('');
    try {
      await api.delete(`/food-items/${item._id}`);
      setSuccess(`Deleted "${item.name}".`);
      await loadItems();
      if (onItemsUpdated) onItemsUpdated();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete food item');
    }
  }

  if (!isOpen) return null;

  const isSuperAdmin = user?.role === 'SUPERADMIN';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <div>
            <h2>Manage Food Menu Items</h2>
            <small style={{ color: 'var(--muted)' }}>
              {isSuperAdmin
                ? 'Global standard dishes and custom restaurant menu items.'
                : `Custom dishes for ${user?.restaurantName || 'your restaurant'}. These items only show in your dropdown.`}
            </small>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        {/* ADD FOOD ITEM FORM */}
        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr auto', gap: 10, marginBottom: 20, background: '#f5f8f3', padding: 14, borderRadius: 12, border: '1px solid #d5e4cf', alignItems: 'center' }}>
          <input
            className="dish-input"
            required
            placeholder="New dish name (e.g. Paneer Tikka Masala)"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{
              border: '1.5px solid #c8d8c6',
              background: '#ffffff',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              color: '#203126',
              outline: 'none',
              height: 42,
              boxSizing: 'border-box',
              width: '100%',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          />
          <select
            className="dish-select"
            value={foodType}
            onChange={e => setFoodType(e.target.value)}
            style={{
              border: '1.5px solid #c8d8c6',
              background: '#ffffff',
              borderRadius: 10,
              padding: '10px 36px 10px 14px',
              fontSize: 13,
              color: '#203126',
              outline: 'none',
              height: 42,
              cursor: 'pointer',
              boxSizing: 'border-box',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23245c3b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <option value="VEG">Veg (Vegetarian)</option>
            <option value="NON_VEG">Non-Veg</option>
          </select>
          <button className="btn small" disabled={busy} style={{ height: 42, padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <Plus size={15} /> Add Dish
          </button>
        </form>

        {/* EDIT ITEM INLINE FORM */}
        {editingItem && (
          <form onSubmit={handleUpdate} style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr auto auto', gap: 8, marginBottom: 16, background: '#eff6ff', padding: 12, borderRadius: 10, border: '1px solid #bfdbfe', alignItems: 'center' }}>
            <input
              className="dish-input"
              required
              value={editName}
              onChange={e => setEditName(e.target.value)}
              style={{
                border: '1.5px solid #93c5fd',
                background: '#ffffff',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 13,
                color: '#1e3a8a',
                outline: 'none',
                height: 38,
                boxSizing: 'border-box'
              }}
            />
            <select
              className="dish-select"
              value={editType}
              onChange={e => setEditType(e.target.value)}
              style={{
                border: '1.5px solid #93c5fd',
                background: '#ffffff',
                borderRadius: 8,
                padding: '8px 30px 8px 12px',
                fontSize: 13,
                color: '#1e3a8a',
                outline: 'none',
                height: 38,
                cursor: 'pointer',
                boxSizing: 'border-box',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%232563eb' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center'
              }}
            >
              <option value="VEG">Veg</option>
              <option value="NON_VEG">Non-Veg</option>
            </select>
            <button className="btn small" disabled={busy} style={{ height: 38 }}>Save</button>
            <button type="button" className="btn small secondary" onClick={() => setEditingItem(null)} style={{ height: 38 }}>Cancel</button>
          </form>
        )}

        {/* ITEMS LIST */}
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {items.map(item => {
            const isCustom = item.restaurant !== null;
            const canManage = isSuperAdmin || (user && item.restaurant && (item.restaurant._id === user.id || item.restaurant === user.id));

            return (
              <div key={item._id} className="food-item-chip">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={item.foodType === 'VEG' ? 'veg' : 'nonveg'}>
                    {item.foodType === 'VEG' ? '● VEG' : '● NON-VEG'}
                  </span>
                  <b>{item.name}</b>
                  <span className={`badge ${isCustom ? 'custom' : 'global'}`}>
                    {isCustom ? (item.restaurant?.restaurantName ? `Custom (${item.restaurant.restaurantName})` : 'Your Custom Dish') : 'Global Standard'}
                  </span>
                </div>

                {canManage && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn small outline inline-btn"
                      onClick={() => {
                        setEditingItem(item);
                        setEditName(item.name);
                        setEditType(item.foodType);
                      }}
                      title="Edit dish name"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      className="btn small btn-delete inline-btn"
                      onClick={() => handleDelete(item)}
                      title="Delete dish"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {!items.length && (
            <p style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>No items in catalogue yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Shell({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [pendingUsers, setPendingUsers] = useState(0);

  useEffect(() => {
    if (!user) return;
    function poll() {
      if (user.role === 'ADMIN') {
        api.get('/admin/dashboard')
          .then(r => setPendingOrders(r.data.data.pendingRequests || 0))
          .catch(() => {});
      } else if (user.role === 'SUPERADMIN') {
        api.get('/superadmin/stats')
          .then(r => setPendingUsers(r.data.data.pendingUsers || 0))
          .catch(() => {});
      }
    }
    poll();
    const t = setInterval(poll, 6000);
    return () => clearInterval(t);
  }, [user]);

  async function out() {
    await logout();
    nav('/');
  }

  const homeLink = user
    ? user.role === 'SUPERADMIN'
      ? '/superadmin'
      : user.role === 'ADMIN'
      ? '/admin'
      : '/food'
    : '/';

  return (
    <>
      <header className="nav">
        <Link to={homeLink} className="logo">
          <span><Leaf /></span>sharebite<i>.</i>
        </Link>
        <button className="menu" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          <Menu />
        </button>

        <nav className={open ? 'links show' : 'links'}>
          {user?.role === 'SUPERADMIN' ? (
            /* SUPERADMIN NAVIGATION */
            <>
              <NavLink
                to="/superadmin"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={() => setOpen(false)}
              >
                <Shield size={15} /> Superadmin Panel
                {pendingUsers > 0 && <span className="count-badge">{pendingUsers}</span>}
              </NavLink>

              <span className="user-pill">
                <span className="badge superadmin">SUPERADMIN</span>
                {user.fullName || 'Super Admin'}
              </span>

              <button className="linkbtn" onClick={out}>
                <LogOut size={15} /> Logout
              </button>
            </>
          ) : user?.role === 'ADMIN' ? (
            /* RESTAURANT OWNER / DONOR NAVIGATION - No Explore Food */
            <>
              <NavLink
                to="/admin"
                end
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={() => setOpen(false)}
              >
                Overview
              </NavLink>

              <NavLink
                to="/admin/food"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={() => setOpen(false)}
              >
                Food Listed
              </NavLink>

              <NavLink
                to="/admin/orders"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={() => setOpen(false)}
              >
                Customer Orders
                {pendingOrders > 0 && <span className="count-badge">{pendingOrders}</span>}
              </NavLink>

              <span className="user-pill">
                <span className="badge admin">DONOR</span>
                <Store size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                {user.restaurantName || 'Restaurant'}
              </span>

              <button className="linkbtn" onClick={out}>
                <LogOut size={15} /> Logout
              </button>
            </>
          ) : user?.role === 'CUSTOMER' ? (
            /* CUSTOMER NAVIGATION */
            <>
              <NavLink
                to="/food"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={() => setOpen(false)}
              >
                Explore Food
              </NavLink>

              <NavLink
                to="/customer"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={() => setOpen(false)}
              >
                My Pickup Orders
              </NavLink>

              <span className="user-pill">
                <span className="badge customer">CUSTOMER</span>
                {user.fullName}
              </span>

              <button className="linkbtn" onClick={out}>
                <LogOut size={15} /> Logout
              </button>
            </>
          ) : (
            /* GUEST NAVIGATION */
            <>
              <Link to="/how" onClick={() => setOpen(false)}>How it works</Link>
              <Link to="/food" onClick={() => setOpen(false)}>Explore food</Link>
              <Link to="/login" onClick={() => setOpen(false)}>Log in</Link>
              <Link className="btn small" to="/register" onClick={() => setOpen(false)}>
                Join ShareBite
              </Link>
            </>
          )}
        </nav>
      </header>

      {children}

      <footer>
        <Link to={homeLink} className="logo">
          <span><Leaf /></span>sharebite<i>.</i>
        </Link>
        <p>Good food deserves another table.</p>
        <small>© {new Date().getFullYear()} ShareBite · Food Waste Management Platform</small>
      </footer>
    </>
  );
}

function Home() {
  const { user } = useAuth();

  if (user?.role === 'SUPERADMIN') return <Navigate to="/superadmin" replace />;
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user?.role === 'CUSTOMER') return <Navigate to="/food" replace />;

  return (
    <>
      <section className="hero wrap">
        <div>
          <span className="eyebrow">A LITTLE LESS WASTE. A LOT MORE GOOD.</span>
          <h1>Good food deserves <em>another table.</em></h1>
          <p>
            Connecting restaurants, caterers, and food donors with people who need fresh meals.
            Approved partners share food instantly in a safe, verified community.
          </p>
          <div className="actions">
            <Link className="btn" to="/register">
              Join as Donor or Receiver <ArrowRight />
            </Link>
            <Link className="quiet" to="/food">Explore available food</Link>
          </div>
          <div className="proof">✦ Verified restaurants. Super Admin approved. Instant listings.</div>
        </div>
        <div className="heroimg">
          <div className="float">🌿 <b>Share more. Waste less.</b></div>
        </div>
      </section>

      <section className="steps wrap">
        <article>
          <b>01</b>
          <h3>Register & Get Verified</h3>
          <p>Restaurant owners and customers register and are verified by the Super Admin.</p>
        </article>
        <article>
          <b>02</b>
          <h3>Publish Surplus Food</h3>
          <p>Donors upload photos and publish surplus meals live with zero delays.</p>
        </article>
        <article>
          <b>03</b>
          <h3>Instant Pickup</h3>
          <p>Approved receivers request food and pick it up directly from the restaurant.</p>
        </article>
      </section>

      <section className="center wrap">
        <span className="eyebrow">WHY SHAREBITE</span>
        <h2>Small actions. <em>Lasting impact.</em></h2>
        <p>Give perfectly good surplus food a second chance to nourish someone.</p>
        <Link className="btn" to="/register">
          Become part of it <ArrowRight />
        </Link>
      </section>
    </>
  );
}

function Auth({ register = false }) {
  const { user, login, register: signup } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    role: 'CUSTOMER',
    restaurantName: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    address: '',
    city: ''
  });
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState(location.state?.message || '');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'SUPERADMIN') nav('/superadmin', { replace: true });
      else if (user.role === 'ADMIN') nav('/admin', { replace: true });
      else nav('/food', { replace: true });
    }
  }, [user, nav]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSuccessNotice('');
    setBusy(true);

    try {
      if (register) {
        const res = await signup(form);
        nav('/login', {
          state: {
            message: res.data?.message || 'Registration submitted! Please wait for Super Admin approval before logging in.'
          }
        });
      } else {
        const u = await login(form.email, form.password);
        if (u.role === 'SUPERADMIN') nav('/superadmin');
        else if (u.role === 'ADMIN') nav('/admin');
        else nav('/customer');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth wrap">
      <div className="authart">
        <span className="eyebrow">VERIFIED COMMUNITY</span>
        <h2>Better food<br /><em>futures start here.</em></h2>
        <p>
          Connecting restaurant owners with community receivers under trusted Super Admin moderation.
        </p>
      </div>

      <form className="form" onSubmit={submit}>
        <Link className="logo" to="/"><span><Leaf /></span>sharebite<i>.</i></Link>
        <h1>{register ? 'Create your account' : 'Welcome back.'}</h1>
        <p>
          {register
            ? 'Join ShareBite as a food donor or receiver.'
            : 'Sign in to access your ShareBite portal.'}
        </p>

        {successNotice && <div className="success-msg">{successNotice}</div>}
        {error && <div className="error">{error}</div>}

        {register && (
          <>
            <label style={{ background: '#f2f7ef', padding: 12, borderRadius: 10, border: '1px solid #d4e3cf' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#1f442b' }}>Register As</span>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                style={{ fontWeight: 700, fontSize: 13, background: 'white' }}
              >
                <option value="CUSTOMER">Food Receiver (Customer / Community Member)</option>
                <option value="ADMIN">Food Donor (Restaurant Owner / Caterer / Business)</option>
              </select>
            </label>

            {form.role === 'ADMIN' && (
              <label>
                Restaurant / Business Name
                <input
                  required
                  placeholder="e.g. Royal Kitchen, Sunshine Bakery"
                  value={form.restaurantName}
                  onChange={e => setForm({ ...form, restaurantName: e.target.value })}
                />
              </label>
            )}

            <label>
              {form.role === 'ADMIN' ? 'Owner / Manager Full Name' : 'Full Name'}
              <input
                required
                placeholder="John Doe"
                value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })}
              />
            </label>

            <label>Phone Number
              <input
                required
                type="tel"
                placeholder="+1234567890"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </label>
          </>
        )}

        <label>Email Address
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
        </label>

        <label>
          Password
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              minLength="6"
              required
              placeholder="At least 6 characters"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Hide password' : 'Show password'}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
        </label>

        {register && (
          <>
            <label>City
              <input
                required
                placeholder="e.g. Mumbai, New York"
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
              />
            </label>
            <label>{form.role === 'ADMIN' ? 'Restaurant / Pickup Address' : 'Address'}
              <input
                required
                placeholder="123 Food Street"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
              />
            </label>
          </>
        )}

        <button className="btn full" disabled={busy}>
          {busy
            ? 'Please wait…'
            : register
            ? form.role === 'ADMIN'
              ? 'Submit Restaurant Registration'
              : 'Submit Customer Registration'
            : 'Log in'} <ArrowRight />
        </button>

        {register && (
          <small style={{ color: '#566a56', textAlign: 'center', lineHeight: 1.5 }}>
            🛡️ <b>Note:</b> New registrations are reviewed by the Super Admin before login is granted.
          </small>
        )}

        <small>
          {register ? 'Already have an approved account? ' : 'New to ShareBite? '}
          <Link to={register ? '/login' : '/register'}>
            {register ? 'Log in' : 'Create an account'}
          </Link>
        </small>
      </form>
    </main>
  );
}

/* =========================================================================
   SUPERADMIN PANEL (/superadmin) — Full User, Food & Food Item CRUD
   ========================================================================= */
function SuperAdminPanel() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDonors: 0,
    totalCustomers: 0,
    pendingUsers: 0,
    totalFoods: 0,
    totalRequests: 0
  });

  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING, USERS, FOODS, REQUESTS, ITEMS
  const [users, setUsers] = useState([]);
  const [foods, setFoods] = useState([]);
  const [requests, setRequests] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);
  const [deleteTargetFood, setDeleteTargetFood] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Food Item Manager Modal
  const [showItemModal, setShowItemModal] = useState(false);

  // Super Admin Add/Edit Food Listing Modal
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [foodFormBusy, setFoodFormBusy] = useState(false);

  const now = new Date();
  const defaultPrep = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const defaultBest = new Date(now.getTime() + 8 * 3600000 - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [superFoodForm, setSuperFoodForm] = useState({
    foodName: 'Dal Rice',
    foodType: 'VEG',
    donorId: '',
    description: '',
    quantity: 10,
    unit: 'servings',
    preparedAt: defaultPrep,
    bestBefore: defaultBest,
    pickupAddress: 'Main Kitchen',
    city: 'Mumbai',
    imageUrl: ''
  });

  async function loadData() {
    try {
      const [s, u, f, r, it] = await Promise.all([
        api.get('/superadmin/stats'),
        api.get('/superadmin/users'),
        api.get('/superadmin/foods'),
        api.get('/superadmin/requests'),
        api.get('/food-items')
      ]);
      setStats(s.data.data);
      setUsers(u.data.data.users || []);
      setFoods(f.data.data.items || []);
      setRequests(r.data.data.items || []);
      setFoodItems(it.data.data.items || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Error loading Superadmin data');
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // Actions on users
  async function handleUserAction(id, action, name) {
    setError('');
    try {
      await api.patch(`/superadmin/users/${id}/${action}`);
      setSuccess(`User "${name}" status updated.`);
      await loadData();
    } catch (e) {
      setError(e.response?.data?.message || 'Action failed.');
    }
  }

  async function confirmDeleteUser() {
    if (!deleteTargetUser) return;
    setDeleteBusy(true);
    setError('');
    try {
      await api.delete(`/superadmin/users/${deleteTargetUser.id}`);
      setSuccess(`User "${deleteTargetUser.fullName}" deleted permanently.`);
      setDeleteTargetUser(null);
      await loadData();
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to delete user.');
    } finally {
      setDeleteBusy(false);
    }
  }

  // Super Admin Create Food Listing
  async function handleSuperCreateFood(e) {
    e.preventDefault();
    setFoodFormBusy(true);
    setError('');
    try {
      await api.post('/food', {
        ...superFoodForm,
        quantity: Number(superFoodForm.quantity),
        preparedAt: new Date(superFoodForm.preparedAt).toISOString(),
        bestBefore: new Date(superFoodForm.bestBefore).toISOString()
      });
      setShowAddFoodModal(false);
      setSuccess('Surplus food listing published successfully!');
      await loadData();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to publish food listing');
    } finally {
      setFoodFormBusy(false);
    }
  }

  // Super Admin Update Food Listing
  async function handleSuperUpdateFood(e) {
    e.preventDefault();
    if (!editingFood) return;
    setFoodFormBusy(true);
    setError('');
    try {
      await api.put(`/food/${editingFood._id}`, {
        ...editingFood,
        quantity: Number(editingFood.quantity),
        preparedAt: new Date(editingFood.preparedAt).toISOString(),
        bestBefore: new Date(editingFood.bestBefore).toISOString()
      });
      setEditingFood(null);
      setSuccess('Food listing updated successfully!');
      await loadData();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update food listing');
    } finally {
      setFoodFormBusy(false);
    }
  }

  // Super Admin Delete Food Listing
  async function confirmDeleteFood() {
    if (!deleteTargetFood) return;
    setDeleteBusy(true);
    setError('');
    try {
      await api.delete(`/food/${deleteTargetFood._id}`);
      setSuccess(`Food listing "${deleteTargetFood.foodName}" deleted.`);
      setDeleteTargetFood(null);
      await loadData();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete food');
    } finally {
      setDeleteBusy(false);
    }
  }

  const pendingUsersList = useMemo(() => users.filter(u => u.accountStatus === 'PENDING_APPROVAL'), [users]);
  const approvedDonors = useMemo(() => users.filter(u => u.role === 'ADMIN' && u.accountStatus === 'ACTIVE'), [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        u.fullName?.toLowerCase().includes(q) ||
        u.restaurantName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.city?.toLowerCase().includes(q);

      const matchRole = !roleFilter || u.role === roleFilter;
      const matchStatus = !statusFilter || u.accountStatus === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  return (
    <main className="wrap page">
      <div className="dashhead">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="eyebrow">SUPER ADMIN CONTROL PANEL</span>
            <span className="realtime-tag">
              <span className="pulse-dot"></span> Live Sync
            </span>
          </div>
          <h1>System Overview & Management</h1>
          <p>Moderate new registrations, manage global surplus foods, and oversee system food catalogue items.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={() => setShowItemModal(true)}>
            <BookOpen size={16} /> Food Item Menu 
          </button>
          <button className="btn small outline" onClick={loadData}>
            <RefreshCw size={13} /> Refresh Data
          </button>
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: 15 }}>{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      {/* KPI Stats */}
      <div className="stats">
        {[
          ['Pending Approvals', stats.pendingUsers, '#c53929', () => setActiveTab('PENDING')],
          ['Restaurant Donors', stats.totalDonors, 'inherit', () => { setActiveTab('USERS'); setRoleFilter('ADMIN'); }],
          ['Food Receivers', stats.totalCustomers, 'inherit', () => { setActiveTab('USERS'); setRoleFilter('CUSTOMER'); }],
          ['Total Users', stats.totalUsers, 'inherit', () => { setActiveTab('USERS'); setRoleFilter(''); }],
          ['Global Food Listed', stats.totalFoods, 'inherit', () => setActiveTab('FOODS')],
          ['Food Menu Items', foodItems.length, 'inherit', () => setShowItemModal(true)]
        ].map(([l, v, color, onClick]) => (
          <div className="stat" key={l} onClick={onClick} style={{ cursor: 'pointer' }}>
            <small>{l}</small>
            <b style={{ color }}>{v ?? 0}</b>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'PENDING' ? 'active' : ''}`}
          onClick={() => setActiveTab('PENDING')}
        >
          <UserCheck size={16} /> Pending Approvals ({pendingUsersList.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'USERS' ? 'active' : ''}`}
          onClick={() => setActiveTab('USERS')}
        >
          <Layers size={16} /> All Registered Users ({users.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'FOODS' ? 'active' : ''}`}
          onClick={() => setActiveTab('FOODS')}
        >
          <Utensils size={16} /> Food Listings ({foods.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'REQUESTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('REQUESTS')}
        >
          <ShoppingBag size={16} /> Global Pickup Orders ({requests.length})
        </button>
      </div>

      {/* TAB 1: PENDING APPROVALS */}
      {activeTab === 'PENDING' && (
        <section className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <h2>New Registration Approval Queue ({pendingUsersList.length})</h2>
            <small style={{ color: 'var(--muted)' }}>
              Approve verified restaurant owners & customers to grant them system access.
            </small>
          </div>

          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Name / Contact</th>
                  <th>Restaurant / Business</th>
                  <th>Email & Phone</th>
                  <th>Location</th>
                  <th>Registered</th>
                  <th>Approval Decision</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsersList.map(u => (
                  <tr key={u.id}>
                    <td>
                      <span className={`badge ${u.role === 'ADMIN' ? 'admin' : 'customer'}`}>
                        {u.role === 'ADMIN' ? 'RESTAURANT OWNER' : 'CUSTOMER'}
                      </span>
                    </td>
                    <td><b>{u.fullName}</b></td>
                    <td>
                      {u.restaurantName ? (
                        <span style={{ fontWeight: 700, color: '#164e29' }}>
                          <Store size={12} style={{ display: 'inline', marginRight: 4 }} />
                          {u.restaurantName}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>— (Receiver)</span>
                      )}
                    </td>
                    <td>
                      <div>{u.email}</div>
                      <small>📞 {u.phone}</small>
                    </td>
                    <td>
                      <div>{u.city}</div>
                      <small>{u.address}</small>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="btn-group">
                        <button
                          className="btn small"
                          onClick={() => handleUserAction(u.id, 'approve', u.fullName)}
                          title="Approve registration"
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          className="btn small danger"
                          onClick={() => handleUserAction(u.id, 'reject', u.fullName)}
                          title="Reject registration"
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!pendingUsersList.length && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: 35, color: 'var(--muted)' }}>
                      🎉 All caught up! There are no pending registration requests at this time.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: ALL USERS DIRECTORY */}
      {activeTab === 'USERS' && (
        <section className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 15 }}>
            <h2>User Management Directory ({filteredUsers.length})</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                placeholder="Search users…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '7px 10px', fontSize: 12, borderRadius: 8, border: '1px solid var(--line)' }}
              />
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                style={{ padding: '7px 10px', fontSize: 12, borderRadius: 8, border: '1px solid var(--line)' }}
              >
                <option value="">All Roles</option>
                <option value="ADMIN">Restaurant Donors</option>
                <option value="CUSTOMER">Customers</option>
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '7px 10px', fontSize: 12, borderRadius: 8, border: '1px solid var(--line)' }}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
                <option value="REJECTED">REJECTED</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>

          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>User / Restaurant</th>
                  <th>Role</th>
                  <th>Email & Phone</th>
                  <th>Location</th>
                  <th>Account Status</th>
                  <th>Manage User</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <b>{u.fullName}</b>
                      {u.restaurantName && (
                        <small style={{ color: '#166534', fontWeight: 600 }}>
                          🏢 {u.restaurantName}
                        </small>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${u.role === 'ADMIN' ? 'admin' : 'customer'}`}>
                        {u.role === 'ADMIN' ? 'DONOR' : 'CUSTOMER'}
                      </span>
                    </td>
                    <td>
                      <div>{u.email}</div>
                      <small>{u.phone}</small>
                    </td>
                    <td>{u.city}</td>
                    <td>
                      <span className={`badge ${u.accountStatus.toLowerCase()}`}>
                        {u.accountStatus}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group">
                        {u.accountStatus === 'PENDING_APPROVAL' && (
                          <button
                            className="btn small"
                            onClick={() => handleUserAction(u.id, 'approve', u.fullName)}
                          >
                            Approve
                          </button>
                        )}
                        {u.accountStatus === 'ACTIVE' && (
                          <button
                            className="btn small secondary"
                            onClick={() => handleUserAction(u.id, 'suspend', u.fullName)}
                          >
                            Suspend
                          </button>
                        )}
                        {['SUSPENDED', 'REJECTED'].includes(u.accountStatus) && (
                          <button
                            className="btn small"
                            onClick={() => handleUserAction(u.id, 'activate', u.fullName)}
                          >
                            Activate
                          </button>
                        )}
                        <button
                          className="btn small btn-delete"
                          onClick={() => setDeleteTargetUser(u)}
                          title="Delete user"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: GLOBAL FOOD LISTINGS CRUD */}
      {activeTab === 'FOODS' && (
        <section className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2>Global Surplus Food Inventory CRUD ({foods.length})</h2>
              <small style={{ color: 'var(--muted)' }}>Super Admin can add, edit, or delete any surplus food listing.</small>
            </div>
            <button className="btn small" onClick={() => setShowAddFoodModal(true)}>
              <Plus size={16} /> Add Food Listing
            </button>
          </div>

          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Food Item</th>
                  <th>Restaurant / Donor</th>
                  <th>Type</th>
                  <th>Remaining Qty</th>
                  <th>Status</th>
                  <th>City</th>
                  <th>Best Before</th>
                  <th>Super Admin CRUD</th>
                </tr>
              </thead>
              <tbody>
                {foods.map(f => (
                  <tr key={f._id}>
                    <td><b>{f.foodName}</b></td>
                    <td>
                      <b>{f.restaurantName || f.donor?.restaurantName || f.donor?.fullName}</b>
                      <small>Owner: {f.donor?.fullName}</small>
                    </td>
                    <td><span className={f.foodType === 'VEG' ? 'veg' : 'nonveg'}>{f.foodType}</span></td>
                    <td><b>{f.quantity}</b> {f.unit}</td>
                    <td><span className={`badge ${f.availabilityStatus.toLowerCase()}`}>{f.availabilityStatus}</span></td>
                    <td>{f.city}</td>
                    <td>{new Date(f.bestBefore).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td>
                      <div className="btn-group">
                        <button
                          className="btn small outline"
                          onClick={() => {
                            setEditingFood({
                              _id: f._id,
                              foodName: f.foodName,
                              foodType: f.foodType,
                              description: f.description || '',
                              quantity: f.quantity,
                              unit: f.unit || 'servings',
                              preparedAt: f.preparedAt ? new Date(new Date(f.preparedAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : defaultPrep,
                              bestBefore: f.bestBefore ? new Date(new Date(f.bestBefore).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : defaultBest,
                              pickupAddress: f.pickupAddress || '',
                              city: f.city || '',
                              restaurantName: f.restaurantName || '',
                              imageUrl: f.imageUrl || '',
                              availabilityStatus: f.availabilityStatus || 'AVAILABLE'
                            });
                          }}
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          className="btn small btn-delete"
                          onClick={() => setDeleteTargetFood(f)}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!foods.length && (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: 25 }}>No food listed across the platform.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: GLOBAL CUSTOMER ORDERS */}
      {activeTab === 'REQUESTS' && (
        <section className="panel">
          <h2>Global Customer Orders ({requests.length})</h2>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Food Item</th>
                  <th>Restaurant</th>
                  <th>Customer (Receiver)</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r._id}>
                    <td><b>{r.food?.foodName || 'Food Item'}</b></td>
                    <td>
                      <b>{r.food?.restaurantName || r.donor?.restaurantName || r.donor?.fullName}</b>
                    </td>
                    <td>
                      <b>{r.receiverName}</b>
                      <small>📞 {r.receiverPhone}</small>
                    </td>
                    <td><b>{r.requestedQuantity}</b> {r.unit}</td>
                    <td><span className={`badge ${r.status.toLowerCase()}`}>{r.status.replace(/_/g, ' ')}</span></td>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {!requests.length && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: 25 }}>No orders placed yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SUPER ADMIN ADD FOOD MODAL */}
      {showAddFoodModal && (
        <div className="modal-overlay" onClick={() => setShowAddFoodModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Food Listing (Super Admin)</h2>
              <button className="modal-close" onClick={() => setShowAddFoodModal(false)}>✕</button>
            </div>
            <form className="form" onSubmit={handleSuperCreateFood}>
              <label>Select Restaurant Donor
                <select
                  value={superFoodForm.donorId}
                  onChange={e => setSuperFoodForm({ ...superFoodForm, donorId: e.target.value })}
                >
                  <option value="">Post under Super Admin</option>
                  {approvedDonors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.restaurantName ? `${d.restaurantName} (${d.fullName})` : d.fullName}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>Food Type
                  <select
                    value={superFoodForm.foodType}
                    onChange={e => setSuperFoodForm({ ...superFoodForm, foodType: e.target.value })}
                  >
                    <option value="VEG">Veg</option>
                    <option value="NON_VEG">Non-Veg</option>
                  </select>
                </label>
                <label>Food Name
                  <input
                    required
                    value={superFoodForm.foodName}
                    onChange={e => setSuperFoodForm({ ...superFoodForm, foodName: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <label>Quantity
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={superFoodForm.quantity}
                    onChange={e => setSuperFoodForm({ ...superFoodForm, quantity: e.target.value })}
                  />
                </label>
                <label>Unit
                  <select
                    value={superFoodForm.unit}
                    onChange={e => setSuperFoodForm({ ...superFoodForm, unit: e.target.value })}
                  >
                    {['servings', 'plates', 'kg', 'packets', 'litres', 'pieces'].map(x => (
                      <option key={x} value={x}>{x}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>Prepared At
                  <input
                    type="datetime-local"
                    required
                    value={superFoodForm.preparedAt}
                    onChange={e => setSuperFoodForm({ ...superFoodForm, preparedAt: e.target.value })}
                  />
                </label>
                <label>Best Before
                  <input
                    type="datetime-local"
                    required
                    value={superFoodForm.bestBefore}
                    onChange={e => setSuperFoodForm({ ...superFoodForm, bestBefore: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <label>Pickup Address
                  <input
                    required
                    value={superFoodForm.pickupAddress}
                    onChange={e => setSuperFoodForm({ ...superFoodForm, pickupAddress: e.target.value })}
                  />
                </label>
                <label>City
                  <input
                    required
                    value={superFoodForm.city}
                    onChange={e => setSuperFoodForm({ ...superFoodForm, city: e.target.value })}
                  />
                </label>
              </div>

              <label>Image URL (optional)
                <input
                  type="url"
                  value={superFoodForm.imageUrl}
                  onChange={e => setSuperFoodForm({ ...superFoodForm, imageUrl: e.target.value })}
                />
              </label>

              <button className="btn full" disabled={foodFormBusy}>
                {foodFormBusy ? 'Publishing…' : 'Publish Food Listing'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUPER ADMIN EDIT FOOD MODAL */}
      {editingFood && (
        <div className="modal-overlay" onClick={() => setEditingFood(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Food Listing (Super Admin)</h2>
              <button className="modal-close" onClick={() => setEditingFood(null)}>✕</button>
            </div>
            <form className="form" onSubmit={handleSuperUpdateFood}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>Food Name
                  <input
                    required
                    value={editingFood.foodName}
                    onChange={e => setEditingFood({ ...editingFood, foodName: e.target.value })}
                  />
                </label>
                <label>Food Type
                  <select
                    value={editingFood.foodType}
                    onChange={e => setEditingFood({ ...editingFood, foodType: e.target.value })}
                  >
                    <option value="VEG">Veg</option>
                    <option value="NON_VEG">Non-Veg</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <label>Quantity
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editingFood.quantity}
                    onChange={e => setEditingFood({ ...editingFood, quantity: e.target.value })}
                  />
                </label>
                <label>Unit
                  <select
                    value={editingFood.unit}
                    onChange={e => setEditingFood({ ...editingFood, unit: e.target.value })}
                  >
                    {['servings', 'plates', 'kg', 'packets', 'litres', 'pieces'].map(x => (
                      <option key={x} value={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>Status
                  <select
                    value={editingFood.availabilityStatus}
                    onChange={e => setEditingFood({ ...editingFood, availabilityStatus: e.target.value })}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="RESERVED">RESERVED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="REMOVED">REMOVED</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <label>Pickup Address
                  <input
                    required
                    value={editingFood.pickupAddress}
                    onChange={e => setEditingFood({ ...editingFood, pickupAddress: e.target.value })}
                  />
                </label>
                <label>City
                  <input
                    required
                    value={editingFood.city}
                    onChange={e => setEditingFood({ ...editingFood, city: e.target.value })}
                  />
                </label>
              </div>

              <div className="btn-group" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" className="btn secondary" onClick={() => setEditingFood(null)}>
                  Cancel
                </button>
                <button className="btn" disabled={foodFormBusy}>
                  {foodFormBusy ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOD ITEM CATALOGUE MODAL */}
      <FoodItemManagerModal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        onItemsUpdated={loadData}
        user={user}
      />

      {/* CONFIRM DELETE USER MODAL */}
      <ConfirmModal
        isOpen={!!deleteTargetUser}
        title="Delete User Account?"
        message={
          <>
            Are you sure you want to permanently delete user <b>"{deleteTargetUser?.fullName}"</b> ({deleteTargetUser?.email})?
            <br />
            This will also delete any food listings and active requests tied to this account.
          </>
        }
        confirmText="Yes, Delete User"
        busy={deleteBusy}
        onConfirm={confirmDeleteUser}
        onClose={() => setDeleteTargetUser(null)}
      />

      {/* CONFIRM DELETE FOOD MODAL */}
      <ConfirmModal
        isOpen={!!deleteTargetFood}
        title="Delete Food Listing?"
        message={
          <>
            Are you sure you want to delete <b>"{deleteTargetFood?.foodName}"</b>?
          </>
        }
        confirmText="Yes, Delete Food"
        busy={deleteBusy}
        onConfirm={confirmDeleteFood}
        onClose={() => setDeleteTargetFood(null)}
      />
    </main>
  );
}

/* =========================================================================
   ADMIN OVERVIEW DASHBOARD (/admin)
   ========================================================================= */
function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalFood: 0,
    availableFood: 0,
    reservedFood: 0,
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0
  });
  const [recentFoods, setRecentFoods] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [error, setError] = useState('');

  async function loadData() {
    try {
      const [s, f, r] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/food/mine'),
        api.get('/admin/requests')
      ]);
      setStats(s.data.data);
      setRecentFoods((f.data.data.items || []).slice(0, 4));
      setRecentRequests((r.data.data.items || []).slice(0, 4));
    } catch (e) {
      setError(e.response?.data?.message || 'Error loading dashboard');
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="wrap page">
      <div className="dashhead">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="eyebrow">RESTAURANT OWNER / DONOR OVERVIEW</span>
            <span className="realtime-tag">
              <span className="pulse-dot"></span> Live Sync
            </span>
          </div>
          <h1>
            Welcome, <em>{user?.restaurantName || 'Restaurant'}</em>.
          </h1>
          <p>
            Surplus food listings and customer pickup orders for <b>{user?.restaurantName || 'your restaurant'}</b> in real time.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn" to="/admin/food">
            <Plus size={18} /> Manage Food Listed
          </Link>
          <Link className="btn secondary" to="/admin/orders">
            <ShoppingBag size={18} /> View Orders ({stats.totalRequests})
          </Link>
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: 15 }}>{error}</div>}

      <div className="stats">
        {[
          ['Total Food Listed', stats.totalFood, '/admin/food'],
          ['Available Live', stats.availableFood, '/admin/food'],
          ['Reserved / Picked', stats.reservedFood, '/admin/food'],
          ['Total Customer Orders', stats.totalRequests, '/admin/orders'],
          ['Pending (Action Needed)', stats.pendingRequests, '/admin/orders'],
          ['Completed Pickups', stats.completedRequests, '/admin/orders']
        ].map(([l, v, link]) => (
          <Link to={link} key={l} style={{ textDecoration: 'none' }}>
            <div className="stat" style={{ cursor: 'pointer' }}>
              <small>{l}</small>
              <b style={{ color: l.includes('Pending') && v > 0 ? '#c53929' : 'inherit' }}>
                {v ?? 0}
              </b>
            </div>
          </Link>
        ))}
      </div>

      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <h2>Recently Listed Food (Only Your Restaurant)</h2>
          <Link to="/admin/food" className="quiet" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            View all ({stats.totalFood}) <ArrowRight size={14} />
          </Link>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Food Item</th>
                <th>Type</th>
                <th>Remaining Quantity</th>
                <th>Status</th>
                <th>Best Before</th>
              </tr>
            </thead>
            <tbody>
              {recentFoods.map(f => (
                <tr key={f._id}>
                  <td>
                    <b>{f.foodName}</b>
                    <small>{f.pickupAddress}, {f.city}</small>
                  </td>
                  <td><span className={f.foodType === 'VEG' ? 'veg' : 'nonveg'}>{f.foodType}</span></td>
                  <td><b>{f.quantity}</b> {f.unit}</td>
                  <td><span className={`badge ${f.availabilityStatus.toLowerCase()}`}>{f.availabilityStatus}</span></td>
                  <td>{new Date(f.bestBefore).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                </tr>
              ))}
              {!recentFoods.length && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: 25, color: 'var(--muted)' }}>
                    No food listed yet. <Link to="/admin/food" style={{ color: 'var(--green)', fontWeight: 700 }}>Add your first surplus food listing</Link>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <h2>Recent Customer Orders</h2>
          <Link to="/admin/orders" className="quiet" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            View all orders ({stats.totalRequests}) <ArrowRight size={14} />
          </Link>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Food Item</th>
                <th>Customer / Receiver</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.map(r => (
                <tr key={r._id}>
                  <td><b>{r.food?.foodName || 'Food Item'}</b></td>
                  <td>
                    <b>{r.receiverName}</b>
                    <small>📞 {r.receiverPhone}</small>
                  </td>
                  <td><b>{r.requestedQuantity}</b> {r.unit}</td>
                  <td><span className={`badge ${r.status.toLowerCase()}`}>{r.status.replace(/_/g, ' ')}</span></td>
                  <td>{new Date(r.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                </tr>
              ))}
              {!recentRequests.length && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: 25, color: 'var(--muted)' }}>
                    No customer orders received yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

/* =========================================================================
   ADMIN FOOD LISTED PAGE (/admin/food) — Full CRUD + Custom Food Items
   ========================================================================= */
function AdminFoodPage() {
  const { user } = useAuth();
  const [foods, setFoods] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const now = new Date();
  const defaultPrep = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const defaultBest = new Date(now.getTime() + 8 * 3600000 - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [form, setForm] = useState({
    foodName: '',
    foodType: 'VEG',
    description: '',
    quantity: 10,
    unit: 'servings',
    preparedAt: defaultPrep,
    bestBefore: defaultBest,
    pickupAddress: user?.address || 'Main Kitchen, Restaurant St.',
    city: user?.city || 'Downtown',
    imageUrl: '',
    imageMode: 'upload'
  });

  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  async function loadFoods() {
    try {
      const [res, it] = await Promise.all([
        api.get('/food/mine'),
        api.get('/food-items')
      ]);
      setFoods(res.data.data.items || []);
      const loadedItems = it.data.data.items || [];
      setFoodItems(loadedItems);

      // Only set initial default foodName if empty; NEVER overwrite user selection during background polling
      setForm(prev => {
        if (prev.foodName) return prev;
        const firstVeg = loadedItems.find(i => i.foodType === 'VEG')?.name || '';
        return firstVeg ? { ...prev, foodName: firstVeg } : prev;
      });
    } catch (e) {
      setError(e.response?.data?.message || 'Error loading food listings');
    }
  }

  useEffect(() => {
    loadFoods();
    const interval = setInterval(loadFoods, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // Handle local file upload
  async function handleFileUpload(file, isEditing = false) {
    if (!file) return;
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const uploadedUrl = res.data.url;
      if (isEditing) {
        setEditingFood(prev => ({ ...prev, imageUrl: uploadedUrl }));
      } else {
        setForm(prev => ({ ...prev, imageUrl: uploadedUrl }));
      }
      setSuccess('Image uploaded and stored locally successfully!');
    } catch (e) {
      setError(e.response?.data?.message || 'Image upload failed. Ensure it is a valid image under 5MB.');
    } finally {
      setUploading(false);
    }
  }

  // Create new food listing
  async function createFood(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      await api.post('/food', {
        ...form,
        quantity: Number(form.quantity),
        preparedAt: new Date(form.preparedAt).toISOString(),
        bestBefore: new Date(form.bestBefore).toISOString()
      });
      setShowAddModal(false);
      setSuccess('Food listing published immediately! It is now live for receivers.');
      setForm({
        foodName: foodItems.find(i => i.foodType === 'VEG')?.name || 'Dal Rice',
        foodType: 'VEG',
        description: '',
        quantity: 10,
        unit: 'servings',
        preparedAt: defaultPrep,
        bestBefore: defaultBest,
        pickupAddress: user?.address || 'Main Kitchen, Restaurant St.',
        city: user?.city || 'Downtown',
        imageUrl: '',
        imageMode: 'upload'
      });
      await loadFoods();
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to publish food listing');
    } finally {
      setBusy(false);
    }
  }

  // Open Edit Modal
  function handleOpenEdit(f) {
    const prepStr = f.preparedAt
      ? new Date(new Date(f.preparedAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      : defaultPrep;
    const bestStr = f.bestBefore
      ? new Date(new Date(f.bestBefore).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      : defaultBest;

    setEditingFood({
      _id: f._id,
      foodName: f.foodName,
      foodType: f.foodType,
      description: f.description || '',
      quantity: f.quantity,
      unit: f.unit || 'servings',
      preparedAt: prepStr,
      bestBefore: bestStr,
      pickupAddress: f.pickupAddress || '',
      city: f.city || '',
      restaurantName: f.restaurantName || user?.restaurantName || '',
      imageUrl: f.imageUrl || '',
      imageMode: 'upload',
      availabilityStatus: f.availabilityStatus || 'AVAILABLE'
    });
  }

  // Submit Update
  async function updateFood(e) {
    e.preventDefault();
    if (!editingFood) return;
    setError('');
    setBusy(true);

    try {
      await api.put(`/food/${editingFood._id}`, {
        ...editingFood,
        quantity: Number(editingFood.quantity),
        preparedAt: new Date(editingFood.preparedAt).toISOString(),
        bestBefore: new Date(editingFood.bestBefore).toISOString()
      });
      setEditingFood(null);
      setSuccess('Food listing updated successfully!');
      await loadFoods();
    } catch (e) {
      setError(e.response?.data?.message || 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  // Delete Food
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setError('');
    try {
      await api.delete(`/food/${deleteTarget._id}`);
      setSuccess(`Listing "${deleteTarget.foodName}" deleted successfully.`);
      setDeleteTarget(null);
      await loadFoods();
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to delete listing');
    } finally {
      setDeleteBusy(false);
    }
  }

  const filteredFoods = useMemo(() => {
    return foods.filter(f => {
      const matchSearch =
        f.foodName?.toLowerCase().includes(search.toLowerCase()) ||
        f.city?.toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || f.foodType === typeFilter;
      const matchStatus = !statusFilter || f.availabilityStatus === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [foods, search, typeFilter, statusFilter]);

  // Dropdown options based on selected foodType
  const currentAvailableItems = useMemo(() => {
    return foodItems.filter(i => i.foodType === form.foodType);
  }, [foodItems, form.foodType]);

  return (
    <main className="wrap page">
      <div className="dashhead">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="eyebrow">RESTAURANT INVENTORY</span>
            <span className="realtime-tag">
              <span className="pulse-dot"></span> Live Sync
            </span>
          </div>
          <h1>{user?.restaurantName || 'My Restaurant'} — Food Listed</h1>
          <p>
            Surplus food listings here are strictly private to <b>{user?.restaurantName || 'your restaurant'}</b>.
            Only customers can discover them when published.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn secondary" onClick={() => setShowMenuModal(true)}>
            <BookOpen size={17} /> Manage Dishes / Menu Items
          </button>
          <button
            className="btn"
            onClick={() => {
              if (!form.foodName) {
                const defaultDish = foodItems.find(i => i.foodType === form.foodType)?.name || '';
                if (defaultDish) setForm(prev => ({ ...prev, foodName: defaultDish }));
              }
              setShowAddModal(true);
            }}
          >
            <Plus size={18} /> Add Food Listing
          </button>
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: 15 }}>{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      <div className="filters">
        <input
          placeholder="Search your listings…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types (Veg / Non-Veg)</option>
          <option value="VEG">Veg only</option>
          <option value="NON_VEG">Non-Veg only</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="RESERVED">Reserved</option>
          <option value="COMPLETED">Completed</option>
          <option value="REMOVED">Removed</option>
        </select>
      </div>

      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>My Food Listings ({filteredFoods.length} of {foods.length})</h2>
          <button className="btn small outline" onClick={loadFoods} title="Refresh">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Food Item</th>
                <th>Type</th>
                <th>Available Quantity</th>
                <th>Status</th>
                <th>Pickup Address</th>
                <th>Best Before</th>
                <th>Actions (CRUD)</th>
              </tr>
            </thead>
            <tbody>
              {filteredFoods.map(f => (
                <tr key={f._id}>
                  <td>
                    <b>{f.foodName}</b>
                    {f.restaurantName && <small>🏢 {f.restaurantName}</small>}
                  </td>
                  <td>
                    <span className={f.foodType === 'VEG' ? 'veg' : 'nonveg'}>
                      {f.foodType}
                    </span>
                  </td>
                  <td><b>{f.quantity}</b> {f.unit}</td>
                  <td>
                    <span className={`badge ${f.availabilityStatus.toLowerCase()}`}>
                      {f.availabilityStatus}
                    </span>
                  </td>
                  <td>{f.pickupAddress}, {f.city}</td>
                  <td>{new Date(f.bestBefore).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>
                    <div className="btn-group">
                      <button
                        className="btn small outline"
                        onClick={() => handleOpenEdit(f)}
                        title="Edit listing"
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      <button
                        className="btn small btn-delete"
                        onClick={() => setDeleteTarget(f)}
                        title="Delete listing"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredFoods.length && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                    No food listings found for your restaurant. Click <b>"Add Food Listing"</b> to publish your surplus food!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* CREATE FOOD MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Surplus Food Listing</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form className="form" onSubmit={createFood}>
              {/* RESTAURANT NAME: NON-EDITABLE BADGE */}
              <div style={{ background: '#f2f7ef', padding: '10px 14px', borderRadius: 10, border: '1px solid #d6e5d2', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#1b4327' }}>
                <Store size={16} /> Restaurant: {user?.restaurantName || 'My Restaurant'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>Food type
                  <select
                    value={form.foodType}
                    onChange={e => {
                      const newType = e.target.value;
                      const nextItem = foodItems.find(i => i.foodType === newType)?.name || '';
                      setForm(prev => ({
                        ...prev,
                        foodType: newType,
                        foodName: nextItem
                      }));
                    }}
                  >
                    <option value="VEG">Veg (Vegetarian)</option>
                    <option value="NON_VEG">Non-Veg</option>
                  </select>
                </label>

                <label>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Food item</span>
                    <button
                      type="button"
                      onClick={() => setShowMenuModal(true)}
                      style={{ background: 'none', border: 'none', color: 'var(--green)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                    >
                      + Add New Dish
                    </button>
                  </div>
                  <select
                    value={form.foodName}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({ ...prev, foodName: val }));
                    }}
                  >
                    {currentAvailableItems.map(item => (
                      <option key={item._id} value={item.name}>
                        {item.name} {item.restaurant ? '★ (Your custom dish)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <label>
                  Quantity
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}>
                    Enter any quantity (e.g. 5, 10, 20)
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                  />
                </label>
                <label>Unit
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    {['servings', 'plates', 'kg', 'packets', 'litres', 'pieces'].map(x => (
                      <option key={x} value={x}>{x}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>Description / Details
                <textarea
                  rows="2"
                  placeholder="e.g. Freshly packed lunch surplus, neatly boxed and warm."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>Prepared at
                  <input
                    type="datetime-local"
                    required
                    value={form.preparedAt}
                    onChange={e => setForm({ ...form, preparedAt: e.target.value })}
                  />
                </label>
                <label>Best before
                  <input
                    type="datetime-local"
                    required
                    value={form.bestBefore}
                    onChange={e => setForm({ ...form, bestBefore: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <label>Pickup address
                  <input
                    required
                    value={form.pickupAddress}
                    onChange={e => setForm({ ...form, pickupAddress: e.target.value })}
                  />
                </label>
                <label>City
                  <input
                    required
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                  />
                </label>
              </div>

              {/* IMAGE UPLOAD & URL SECTION */}
              <div style={{ background: '#f8faf6', padding: 14, borderRadius: 12, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Food Image</span>
                  <div className="img-toggle">
                    <button
                      type="button"
                      className={form.imageMode === 'upload' ? 'active' : ''}
                      onClick={() => setForm({ ...form, imageMode: 'upload' })}
                    >
                      📁 Upload File
                    </button>
                    <button
                      type="button"
                      className={form.imageMode === 'url' ? 'active' : ''}
                      onClick={() => setForm({ ...form, imageMode: 'url' })}
                    >
                      🔗 Paste URL
                    </button>
                  </div>
                </div>

                {form.imageMode === 'upload' ? (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={e => handleFileUpload(e.target.files[0], false)}
                    />
                    <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                      <Upload size={24} style={{ color: 'var(--green)' }} />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>
                        {uploading ? 'Uploading image…' : 'Click to upload image from device'}
                      </span>
                      <small style={{ color: 'var(--muted)' }}>Stored locally on server (JPG, PNG, WebP up to 5MB)</small>
                    </div>
                  </div>
                ) : (
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={form.imageUrl}
                    onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                  />
                )}

                {form.imageUrl && (
                  <div style={{ marginTop: 10 }}>
                    <small style={{ fontWeight: 700, color: '#2b5034' }}>Preview:</small>
                    <img src={form.imageUrl} alt="Preview" className="img-preview" />
                  </div>
                )}
              </div>

              <button className="btn full" disabled={busy || uploading}>
                {busy ? 'Publishing…' : 'Publish Food Listing Immediately'} <ArrowRight size={16} />
              </button>
              <small style={{ color: '#2e5c3b', fontWeight: 600 }}>
                ✓ No approval required: This listing will be immediately visible to food receivers.
              </small>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FOOD MODAL */}
      {editingFood && (
        <div className="modal-overlay" onClick={() => setEditingFood(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Food Listing</h2>
              <button className="modal-close" onClick={() => setEditingFood(null)}>✕</button>
            </div>
            <form className="form" onSubmit={updateFood}>
              {/* RESTAURANT NAME: NON-EDITABLE BADGE */}
              <div style={{ background: '#f2f7ef', padding: '10px 14px', borderRadius: 10, border: '1px solid #d6e5d2', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#1b4327' }}>
                <Store size={16} /> Restaurant: {editingFood.restaurantName || user?.restaurantName || 'My Restaurant'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>Food name
                  <input
                    required
                    value={editingFood.foodName}
                    onChange={e => setEditingFood({ ...editingFood, foodName: e.target.value })}
                  />
                </label>
                <label>Food type
                  <select
                    value={editingFood.foodType}
                    onChange={e => setEditingFood({ ...editingFood, foodType: e.target.value })}
                  >
                    <option value="VEG">Veg</option>
                    <option value="NON_VEG">Non-Veg</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <label>
                  Quantity
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editingFood.quantity}
                    onChange={e => setEditingFood({ ...editingFood, quantity: e.target.value })}
                  />
                </label>
                <label>Unit
                  <select
                    value={editingFood.unit}
                    onChange={e => setEditingFood({ ...editingFood, unit: e.target.value })}
                  >
                    {['servings', 'plates', 'kg', 'packets', 'litres', 'pieces'].map(x => (
                      <option key={x} value={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>Status
                  <select
                    value={editingFood.availabilityStatus}
                    onChange={e => setEditingFood({ ...editingFood, availabilityStatus: e.target.value })}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="RESERVED">RESERVED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="REMOVED">REMOVED</option>
                  </select>
                </label>
              </div>

              <label>Description
                <textarea
                  rows="2"
                  value={editingFood.description}
                  onChange={e => setEditingFood({ ...editingFood, description: e.target.value })}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>Prepared at
                  <input
                    type="datetime-local"
                    required
                    value={editingFood.preparedAt}
                    onChange={e => setEditingFood({ ...editingFood, preparedAt: e.target.value })}
                  />
                </label>
                <label>Best before
                  <input
                    type="datetime-local"
                    required
                    value={editingFood.bestBefore}
                    onChange={e => setEditingFood({ ...editingFood, bestBefore: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <label>Pickup address
                  <input
                    required
                    value={editingFood.pickupAddress}
                    onChange={e => setEditingFood({ ...editingFood, pickupAddress: e.target.value })}
                  />
                </label>
                <label>City
                  <input
                    required
                    value={editingFood.city}
                    onChange={e => setEditingFood({ ...editingFood, city: e.target.value })}
                  />
                </label>
              </div>

              {/* IMAGE EDITING SECTION */}
              <div style={{ background: '#f8faf6', padding: 14, borderRadius: 12, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Food Image</span>
                  <div className="img-toggle">
                    <button
                      type="button"
                      className={editingFood.imageMode === 'upload' ? 'active' : ''}
                      onClick={() => setEditingFood({ ...editingFood, imageMode: 'upload' })}
                    >
                      📁 Upload New
                    </button>
                    <button
                      type="button"
                      className={editingFood.imageMode === 'url' ? 'active' : ''}
                      onClick={() => setEditingFood({ ...editingFood, imageMode: 'url' })}
                    >
                      🔗 Paste URL
                    </button>
                  </div>
                </div>

                {editingFood.imageMode === 'upload' ? (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      ref={editFileInputRef}
                      style={{ display: 'none' }}
                      onChange={e => handleFileUpload(e.target.files[0], true)}
                    />
                    <div className="upload-zone" onClick={() => editFileInputRef.current?.click()}>
                      <Upload size={22} style={{ color: 'var(--green)' }} />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>
                        {uploading ? 'Uploading image…' : 'Click to upload replacement image'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={editingFood.imageUrl}
                    onChange={e => setEditingFood({ ...editingFood, imageUrl: e.target.value })}
                  />
                )}

                {editingFood.imageUrl && (
                  <img src={editingFood.imageUrl} alt="Preview" className="img-preview" />
                )}
              </div>

              <div className="btn-group" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" className="btn secondary" onClick={() => setEditingFood(null)}>
                  Cancel
                </button>
                <button className="btn" disabled={busy || uploading}>
                  {busy ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOD ITEM MENU MANAGER MODAL */}
      <FoodItemManagerModal
        isOpen={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        onItemsUpdated={loadFoods}
        user={user}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Food Listing?"
        message={
          <>
            Are you sure you want to permanently delete <b>"{deleteTarget?.foodName}"</b>?
            <br />
            This surplus food item will be removed from all live feeds immediately.
          </>
        }
        confirmText="Yes, Delete Listing"
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </main>
  );
}

/* =========================================================================
   ADMIN CUSTOMER DETAILS & ORDER HISTORY PAGE (/admin/orders)
   ========================================================================= */
function AdminOrdersPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadRequests() {
    try {
      const res = await api.get('/admin/requests');
      setRequests(res.data.data.items || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load customer orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  async function action(url, message) {
    setError('');
    try {
      await api.patch(url);
      setSuccess(message);
      await loadRequests();
    } catch (e) {
      setError(e.response?.data?.message || 'Order update failed');
    }
  }

  const counts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter(r => r.status === 'PENDING').length,
      active: requests.filter(r => ['ACCEPTED', 'READY_FOR_PICKUP'].includes(r.status)).length,
      completed: requests.filter(r => r.status === 'COMPLETED').length,
      cancelled: requests.filter(r => ['REJECTED', 'CANCELLED'].includes(r.status)).length
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      let matchTab = true;
      if (activeTab === 'PENDING') matchTab = r.status === 'PENDING';
      else if (activeTab === 'ACTIVE') matchTab = ['ACCEPTED', 'READY_FOR_PICKUP'].includes(r.status);
      else if (activeTab === 'COMPLETED') matchTab = r.status === 'COMPLETED';
      else if (activeTab === 'CANCELLED') matchTab = ['REJECTED', 'CANCELLED'].includes(r.status);

      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        r.receiverName?.toLowerCase().includes(q) ||
        r.receiverPhone?.toLowerCase().includes(q) ||
        r.customer?.email?.toLowerCase().includes(q) ||
        r.food?.foodName?.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q);

      return matchTab && matchSearch;
    });
  }, [requests, activeTab, searchTerm]);

  return (
    <main className="wrap page">
      <div className="dashhead">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="eyebrow">CUSTOMER PICKUP MANAGEMENT</span>
            <span className="realtime-tag">
              <span className="pulse-dot"></span> Live Sync
            </span>
          </div>
          <h1>Customer Details & Order History</h1>
          <p>Review customer contact information, delivery notes, and manage order fulfillment.</p>
        </div>
        <button className="btn small outline" onClick={loadRequests}>
          <RefreshCw size={14} /> Refresh Orders
        </button>
      </div>

      {error && <div className="error" style={{ marginBottom: 15 }}>{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveTab('ALL')}
        >
          All Orders ({counts.all})
        </button>
        <button
          className={`tab-btn ${activeTab === 'PENDING' ? 'active' : ''}`}
          onClick={() => setActiveTab('PENDING')}
        >
          Pending Requests ({counts.pending})
        </button>
        <button
          className={`tab-btn ${activeTab === 'ACTIVE' ? 'active' : ''}`}
          onClick={() => setActiveTab('ACTIVE')}
        >
          In Progress ({counts.active})
        </button>
        <button
          className={`tab-btn ${activeTab === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setActiveTab('COMPLETED')}
        >
          Completed ({counts.completed})
        </button>
        <button
          className={`tab-btn ${activeTab === 'CANCELLED' ? 'active' : ''}`}
          onClick={() => setActiveTab('CANCELLED')}
        >
          Cancelled / Rejected ({counts.cancelled})
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search by customer name, phone, email, food, or city…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 500,
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid var(--line)',
            background: 'white'
          }}
        />
      </div>

      <div>
        {filteredRequests.map(r => (
          <article className="order-card" key={r._id}>
            <div className="order-customer">
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: 0.8 }}>
                CUSTOMER CONTACT DETAILS
              </span>
              <h4>{r.receiverName}</h4>
              <span>
                <Phone size={13} /> <a href={`tel:${r.receiverPhone}`}>{r.receiverPhone}</a>
              </span>
              {r.customer?.email && (
                <span>
                  <Mail size={13} /> <a href={`mailto:${r.customer.email}`}>{r.customer.email}</a>
                </span>
              )}
              <span>
                <MapPin size={13} /> {r.pickupAddress}, {r.city}
              </span>
              {r.instructions && (
                <div style={{ marginTop: 6, padding: '6px 10px', background: '#f5f7f2', borderRadius: 6, fontSize: 11, color: '#3f4c41' }}>
                  <b>Customer Note:</b> {r.instructions}
                </div>
              )}
            </div>

            <div className="order-food">
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: 0.8 }}>
                ORDER ITEM
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h4>{r.food?.foodName || 'Food Item'}</h4>
                {r.food?.foodType && (
                  <span className={r.food.foodType === 'VEG' ? 'veg' : 'nonveg'}>
                    {r.food.foodType}
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0', fontSize: 13, fontWeight: 700 }}>
                Quantity: {r.requestedQuantity} {r.unit}
              </p>
              <div className="order-meta">
                <span>Requested: {new Date(r.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="order-actions">
              <span className={`badge ${r.status.toLowerCase()}`}>
                {r.status.replace(/_/g, ' ')}
              </span>

              <div className="btn-group" style={{ marginTop: 8 }}>
                {r.status === 'PENDING' && (
                  <>
                    <button
                      className="btn small"
                      onClick={() => action(`/admin/requests/${r._id}/accept`, 'Order accepted!')}
                    >
                      <Check size={14} /> Accept Order
                    </button>
                    <button
                      className="btn small danger"
                      onClick={() => action(`/admin/requests/${r._id}/reject`, 'Order rejected')}
                    >
                      <X size={14} /> Reject
                    </button>
                  </>
                )}

                {r.status === 'ACCEPTED' && (
                  <button
                    className="btn small"
                    onClick={() => action(`/admin/requests/${r._id}/ready`, 'Order marked Ready for Pickup!')}
                  >
                    Mark Ready for Pickup
                  </button>
                )}

                {r.status === 'READY_FOR_PICKUP' && (
                  <button
                    className="btn small"
                    onClick={() => action(`/admin/requests/${r._id}/complete`, 'Order completed successfully!')}
                  >
                    Mark Picked Up & Complete
                  </button>
                )}

                {r.status === 'COMPLETED' && (
                  <span style={{ fontSize: 11, color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={14} /> Completed
                  </span>
                )}

                {['REJECTED', 'CANCELLED'].includes(r.status) && (
                  <span style={{ fontSize: 11, color: '#991b1b', fontWeight: 600 }}>
                    {r.status}
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}

        {!loading && !filteredRequests.length && (
          <div className="panel" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
            No customer orders found under this category.
          </div>
        )}
      </div>
    </main>
  );
}

/* =========================================================================
   PUBLIC / CUSTOMER FOOD BROWSE (/food)
   ========================================================================= */
function FoodBrowse() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ search: '', type: '', city: '' });
  const [loading, setLoading] = useState(true);

  // If logged in as restaurant owner, redirect to their own food inventory
  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/food" replace />;
  }

  function fetchFood() {
    api.get('/food', { params: filters })
      .then(r => setItems(r.data.data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(fetchFood, 250);
    return () => clearTimeout(t);
  }, [filters]);

  useEffect(() => {
    const interval = setInterval(fetchFood, 8000);
    return () => clearInterval(interval);
  }, [filters]);

  return (
    <main className="wrap page">
      <div className="center">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <span className="realtime-tag">
            <span className="pulse-dot"></span> Live Surplus Food Feed
          </span>
        </div>
        <h1>Food worth <em>sharing.</em></h1>
        <p>Browse fresh surplus food published by verified restaurants, ready for immediate pickup.</p>
      </div>

      <div className="filters">
        <input
          placeholder="Search food or restaurant (e.g. Biryani, Royal Kitchen)"
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
        />
        <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All food types</option>
          <option value="VEG">Veg only</option>
          <option value="NON_VEG">Non-Veg only</option>
        </select>
        <input
          placeholder="Filter by city"
          value={filters.city}
          onChange={e => setFilters({ ...filters, city: e.target.value })}
        />
      </div>

      {loading && !items.length ? (
        <div className="loader">Loading fresh listings…</div>
      ) : (
        <div className="grid">
          {items.map(f => (
            <FoodCard key={f._id} food={f} />
          ))}
        </div>
      )}
      {!loading && !items.length && (
        <p className="empty">No surplus food listings match your filters right now. Check back soon!</p>
      )}
    </main>
  );
}

function FoodCard({ food: f }) {
  // Always display Restaurant Name (never donor personal/owner name)
  const restaurantName = f.donor?.restaurantName?.trim() || f.restaurantName?.trim() || 'Verified Restaurant';

  return (
    <article className="foodcard">
      <div
        className="foodphoto"
        style={{
          backgroundImage: f.imageUrl ? `url(${f.imageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <span className={f.foodType === 'VEG' ? 'veg' : 'nonveg'}>
          {f.foodType === 'VEG' ? '● VEG' : '● NON-VEG'}
        </span>
      </div>
      <div className="foodbody">
        <div className="restaurant-tag">
          <Store size={12} /> {restaurantName}
        </div>
        <small style={{ display: 'block', marginBottom: 4 }}>
          {f.city} · <b>{f.quantity} {f.unit}</b> available
        </small>
        <h3>{f.foodName}</h3>
        <p>{f.description || 'Surplus fresh food prepared by a verified restaurant partner.'}</p>
        <div className="meta">
          <span><MapPin size={14} /> {f.city}</span>
          <span><Clock3 size={14} /> Best before: {new Date(f.bestBefore).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
        <Link to={`/food/${f._id}`}>
          View details & request <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  );
}

function FoodDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [f, setF] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get(`/food/${id}`)
      .then(r => setF(r.data.data.food))
      .catch(e => setErr(e.response?.data?.message || 'Listing unavailable'));
  }, [id]);

  if (err) return <main className="wrap page center"><h2>{err}</h2><Link to="/food" className="btn small">Back to Food Feed</Link></main>;
  if (!f) return <div className="loader">Loading food details…</div>;

  // Always display Restaurant Name (never donor personal/owner name)
  const restaurantName = f.donor?.restaurantName?.trim() || f.restaurantName?.trim() || 'Verified Restaurant';

  return (
    <main className="wrap page detail">
      <div
        className="foodphoto big"
        style={{
          backgroundImage: f.imageUrl ? `url(${f.imageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
          <span className={f.foodType === 'VEG' ? 'veg' : 'nonveg'}>{f.foodType}</span>
          <span className={`badge ${f.availabilityStatus.toLowerCase()}`}>{f.availabilityStatus}</span>
        </div>

        <h1>{f.foodName}</h1>

        <div style={{ background: '#f0f6ee', border: '1px solid #d4e5d0', borderRadius: 12, padding: 14, margin: '15px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#1a4128' }}>
            <Store size={18} /> Restaurant: {restaurantName}
          </div>
          {f.donor?.phone && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Contact: 📞 {f.donor.phone}
            </div>
          )}
        </div>

        <p>{f.description || 'Freshly prepared surplus food ready for immediate pickup.'}</p>
        <p style={{ fontSize: 16 }}>
          <b>{f.quantity} {f.unit}</b> remaining
        </p>

        <div className="meta" style={{ margin: '20px 0' }}>
          <span><MapPin size={16} /> <b>Pickup Address:</b> {f.pickupAddress}, {f.city}</span>
          <span><Clock3 size={16} /> <b>Prepared At:</b> {new Date(f.preparedAt).toLocaleString()}</span>
          <span><Clock3 size={16} /> <b>Best Before:</b> {new Date(f.bestBefore).toLocaleString()}</span>
          {f.instructions && <span><b>Instructions:</b> {f.instructions}</span>}
        </div>

        {user?.role === 'CUSTOMER' ? (
          f.quantity > 0 && f.availabilityStatus === 'AVAILABLE' ? (
            <Link className="btn" to={`/food/${f._id}/request`}>Request this food <ArrowRight size={16} /></Link>
          ) : (
            <div className="notice-box">This food listing is currently reserved or fully requested.</div>
          )
        ) : user?.role === 'ADMIN' ? (
          <div className="notice-box">
            <b>Admin Note:</b> You are logged in as a Food Donor.
            <div style={{ marginTop: 10 }}>
              <Link to="/admin/food" className="btn small secondary">Manage in Food Listed</Link>
            </div>
          </div>
        ) : user?.role === 'SUPERADMIN' ? (
          <div className="notice-box">
            <b>Super Admin Note:</b> Logged in as System Administrator.
            <div style={{ marginTop: 10 }}>
              <Link to="/superadmin" className="btn small secondary">Back to Superadmin Panel</Link>
            </div>
          </div>
        ) : (
          <Link className="btn" to="/login">Log in as customer to request this food <ArrowRight size={16} /></Link>
        )}
      </div>
    </main>
  );
}

function RequestFood() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [food, setFood] = useState(null);
  const [form, setForm] = useState({
    receiverName: user?.fullName || '',
    receiverPhone: user?.phone || '',
    requestedQuantity: 1,
    pickupAddress: user?.address || '',
    city: user?.city || '',
    instructions: ''
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/food/${id}`)
      .then(r => {
        const item = r.data.data.food;
        setFood(item);
        if (item.pickupAddress && !user?.address) {
          setForm(prev => ({ ...prev, pickupAddress: item.pickupAddress, city: item.city }));
        }
      })
      .catch(e => setError(e.response?.data?.message || 'Food not found'));
  }, [id, user]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    const qty = Number(form.requestedQuantity);
    if (!qty || qty <= 0) {
      setError('Please enter a valid quantity greater than 0.');
      return;
    }
    if (food && qty > food.quantity) {
      setError(`Requested quantity cannot exceed available stock (${food.quantity} ${food.unit}).`);
      return;
    }

    setBusy(true);
    try {
      await api.post('/requests', {
        ...form,
        requestedQuantity: qty,
        foodId: id
      });
      nav('/customer');
    } catch (e) {
      setError(e.response?.data?.message || 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  const restaurantName = food?.donor?.restaurantName?.trim() || food?.restaurantName?.trim() || 'Verified Restaurant';

  return (
    <main className="wrap page narrow">
      <div className="center">
        <span className="eyebrow">FOOD PICKUP REQUEST</span>
        <h1>Request {food?.foodName || 'Food'}</h1>
        {food && (
          <div style={{ background: '#f2f7ef', padding: 12, borderRadius: 10, margin: '15px auto', maxWidth: 450 }}>
            <p style={{ margin: 0, fontWeight: 700, color: '#1c4228' }}>
              <Store size={14} style={{ display: 'inline', marginRight: 4 }} />
              From: {restaurantName}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              Stock: <b>{food.quantity} {food.unit}</b> · Location: <b>{food.pickupAddress}, {food.city}</b>
            </p>
          </div>
        )}
      </div>

      <form className="form panel" onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <label>
          Receiver full name
          <input
            required
            type="text"
            value={form.receiverName}
            onChange={e => setForm({ ...form, receiverName: e.target.value })}
          />
        </label>
        <label>
          Contact phone number
          <input
            required
            type="text"
            value={form.receiverPhone}
            onChange={e => setForm({ ...form, receiverPhone: e.target.value })}
          />
        </label>
        <label>
          Quantity to request ({food?.unit || 'units'})
          <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}>
            Enter any whole number (e.g. 1, 5, 10) up to {food?.quantity || 1}
          </span>
          <input
            required
            type="number"
            min="1"
            max={food ? food.quantity : undefined}
            step="any"
            value={form.requestedQuantity}
            onChange={e => setForm({ ...form, requestedQuantity: e.target.value })}
          />
        </label>
        <label>
          Delivery / Pickup address
          <input
            required
            type="text"
            value={form.pickupAddress}
            onChange={e => setForm({ ...form, pickupAddress: e.target.value })}
          />
        </label>
        <label>
          City
          <input
            required
            type="text"
            value={form.city}
            onChange={e => setForm({ ...form, city: e.target.value })}
          />
        </label>
        <label>
          Pickup note / special instructions (optional)
          <textarea
            rows="2"
            value={form.instructions}
            onChange={e => setForm({ ...form, instructions: e.target.value })}
            placeholder="e.g. Arriving at 6:30 PM with food containers"
          />
        </label>
        <button className="btn full" disabled={busy}>
          {busy ? 'Submitting request…' : 'Confirm Food Request'} <ArrowRight size={16} />
        </button>
      </form>
    </main>
  );
}

/* =========================================================================
   CUSTOMER MY REQUESTS PAGE (/customer)
   ========================================================================= */
function Customer() {
  const [items, setItems] = useState([]);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  function loadRequests() {
    api.get('/requests/my')
      .then(r => setItems(r.data.data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRequests();
    const timer = setInterval(loadRequests, 5000);
    return () => clearInterval(timer);
  }, []);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelBusy(true);
    try {
      await api.patch(`/requests/${cancelTarget._id}/cancel`);
      setCancelTarget(null);
      loadRequests();
    } catch (e) {
      // error handled
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <main className="wrap page">
      <div className="dashhead">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="eyebrow">FOOD RECEIVER DASHBOARD</span>
            <span className="realtime-tag">
              <span className="pulse-dot"></span> Live Sync
            </span>
          </div>
          <h1>Welcome, {user?.fullName || 'Receiver'}.</h1>
          <p>Track your food pickup requests and real-time status updates from restaurants.</p>
        </div>
        <Link className="btn" to="/food">
          <Utensils size={16} /> Explore Available Food <ArrowRight size={16} />
        </Link>
      </div>

      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>My Pickup Requests ({items.length})</h2>
          <button className="btn small outline" onClick={loadRequests}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Food Item</th>
                <th>Restaurant / Donor</th>
                <th>Quantity</th>
                <th>Pickup Location</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r._id}>
                  <td>
                    <b>{r.food?.foodName || 'Food Item'}</b>
                    <small>{r.food?.city} · Best before: {r.food?.bestBefore ? new Date(r.food.bestBefore).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</small>
                  </td>
                  <td>
                    <b>{r.food?.restaurantName || r.donor?.restaurantName || 'Verified Restaurant'}</b>
                    {r.donor?.phone && <small>📞 {r.donor.phone}</small>}
                  </td>
                  <td>
                    <b>{r.requestedQuantity}</b> {r.unit}
                  </td>
                  <td>{r.pickupAddress}, {r.city}</td>
                  <td>
                    <span className={`badge ${r.status.toLowerCase()}`}>
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    {['PENDING', 'ACCEPTED'].includes(r.status) ? (
                      <button className="btn small btn-delete" onClick={() => setCancelTarget(r)}>
                        Cancel Request
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {r.status === 'READY_FOR_PICKUP' ? 'Ready for pickup!' : 'Completed'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                    You have no active food requests. <Link to="/food" style={{ color: 'var(--green)', fontWeight: 700 }}>Browse available food</Link> to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* CANCEL CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!cancelTarget}
        title="Cancel Food Request?"
        message={
          <>
            Are you sure you want to cancel your request for <b>"{cancelTarget?.food?.foodName || 'this food'}"</b> from <b>"{cancelTarget?.food?.restaurantName || cancelTarget?.donor?.restaurantName || 'the restaurant'}"</b>?
            <br />
            The reserved quantity ({cancelTarget?.requestedQuantity} {cancelTarget?.unit}) will be returned to available stock.
          </>
        }
        confirmText="Yes, Cancel Request"
        busy={cancelBusy}
        onConfirm={confirmCancel}
        onClose={() => setCancelTarget(null)}
      />
    </main>
  );
}

function How() {
  return (
    <main className="wrap page center">
      <span className="eyebrow">HOW IT WORKS</span>
      <h1>Simple sharing. <em>Zero waste.</em></h1>
      <p>ShareBite connects restaurants with surplus fresh food directly to people and organizations in real time.</p>
      <div className="steps">
        <article>
          <b>01</b>
          <h3>Register & Get Verified</h3>
          <p>Donors and customers register and are approved by the Super Admin.</p>
        </article>
        <article>
          <b>02</b>
          <h3>Instant live listings</h3>
          <p>Approved donors publish meals with photos and pickup details live.</p>
        </article>
        <article>
          <b>03</b>
          <h3>Pick up and enjoy</h3>
          <p>Receivers request meals, donors prepare them for pickup, and food is saved.</p>
        </article>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/how" element={<How />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Auth register />} />

        {/* Superadmin Panel */}
        <Route path="/superadmin" element={<Guard role="SUPERADMIN"><SuperAdminPanel /></Guard>} />

        {/* Customer & Public Food Routes */}
        <Route path="/food" element={<FoodBrowse />} />
        <Route path="/food/:id" element={<FoodDetail />} />
        <Route path="/food/:id/request" element={<Guard role="CUSTOMER"><RequestFood /></Guard>} />
        <Route path="/customer" element={<Guard role="CUSTOMER"><Customer /></Guard>} />

        {/* Dedicated Admin / Donor Routes */}
        <Route path="/admin" element={<Guard role="ADMIN"><AdminDashboard /></Guard>} />
        <Route path="/admin/food" element={<Guard role="ADMIN"><AdminFoodPage /></Guard>} />
        <Route path="/admin/orders" element={<Guard role="ADMIN"><AdminOrdersPage /></Guard>} />

        <Route
          path="*"
          element={
            <main className="wrap page center">
              <h1>Page not found</h1>
              <Link to="/" className="btn small">Back home</Link>
            </main>
          }
        />
      </Routes>
    </Shell>
  );
}
