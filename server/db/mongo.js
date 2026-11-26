import mongoose from 'mongoose';

const { Schema } = mongoose;
mongoose.set('strictQuery', true);
// Operator injection is blocked upstream (express-mongo-sanitize + zod typed inputs + String() casts).

const productSchema = new Schema({
  slug: { type: String, unique: true, index: true },
  name: { type: String, required: true, maxlength: 120 },
  brand: { type: String, maxlength: 60 },
  category: { type: String, required: true, index: true },
  unit: String,
  price: { type: Number, required: true, min: 0 },
  mrp: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0 },
  color: String,
  shape: String,
  emoji: String,
  aisle: String,
  shelf: Number,
  slot: Number,
  active: { type: Boolean, default: true },
}, { timestamps: true });

const addressSchema = new Schema({
  label: String, name: String, phone: String, line1: String, line2: String,
  landmark: String, city: String, pincode: String,
}, { _id: true });

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  phone: String,
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  blocked: { type: Boolean, default: false },
  addresses: [addressSchema],
  cart: [{ _id: false, productId: String, qty: Number }],
}, { timestamps: true });

const orderSchema = new Schema({
  orderId: { type: String, unique: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  userName: String,
  userEmail: String,
  items: [{ _id: false, productId: String, name: String, unit: String, price: Number, mrp: Number, qty: Number, color: String, emoji: String, category: String }],
  bill: { itemTotal: Number, mrpTotal: Number, deliveryFee: Number, handlingFee: Number, savings: Number, total: Number },
  address: { label: String, name: String, phone: String, line1: String, line2: String, landmark: String, city: String, pincode: String },
  paymentMethod: String,
  status: { type: String, index: true },
  statusHistory: [{ _id: false, status: String, at: Date }],
  autoAdvance: { type: Boolean, default: true },
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);

const out = (d) => {
  if (!d) return null;
  const { _id, __v, ...rest } = d;
  const o = { id: String(_id), ...rest };
  if (o.user) o.user = String(o.user);
  if (o.addresses) o.addresses = o.addresses.map((a) => { const { _id: aid, ...r } = a; return { id: String(aid), ...r }; });
  return o;
};
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isId = (id) => mongoose.isValidObjectId(id);

export async function connectMongo(uri) {
  await mongoose.connect(uri, { dbName: 'quickkart', serverSelectionTimeoutMS: 10000 });
  await Promise.all([Product.init(), User.init(), Order.init()]);
}

export const mongoRepo = {
  kind: 'mongodb',
  products: {
    async count() { return Product.countDocuments(); },
    async insertMany(arr) { await Product.insertMany(arr, { ordered: false }); },
    async list({ q, category, active, page = 1, limit = 100, lowStock } = {}) {
      const f = {};
      if (q) f.$or = [{ name: { $regex: escapeRe(q), $options: 'i' } }, { brand: { $regex: escapeRe(q), $options: 'i' } }];
      if (category) f.category = String(category);
      if (typeof active === 'boolean') f.active = active;
      if (lowStock != null) f.stock = { $lte: Number(lowStock) };
      const [items, total] = await Promise.all([
        Product.find(f).sort({ category: 1, slot: 1 }).skip((page - 1) * limit).limit(limit).lean(),
        Product.countDocuments(f),
      ]);
      return { items: items.map(out), total };
    },
    async getById(id) { return isId(id) ? out(await Product.findById(id).lean()) : null; },
    async getManyByIds(ids) { return (await Product.find({ _id: { $in: ids.filter(isId) } }).lean()).map(out); },
    async create(data) { return out((await Product.create(data)).toObject()); },
    async update(id, patch) { return isId(id) ? out(await Product.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean()) : null; },
    async remove(id) { return isId(id) ? !!(await Product.findByIdAndDelete(id)) : false; },
    async decrementStock(id, qty) {
      const r = await Product.updateOne({ _id: id, active: true, stock: { $gte: qty } }, { $inc: { stock: -qty } });
      return r.modifiedCount === 1;
    },
    async incrementStock(id, qty) { await Product.updateOne({ _id: id }, { $inc: { stock: qty } }); },
    async countLowStock(t) { return Product.countDocuments({ stock: { $lte: t } }); },
  },
  users: {
    async findByEmail(email, withHash = false) {
      const qy = User.findOne({ email: String(email).toLowerCase() });
      if (withHash) qy.select('+passwordHash');
      return out(await qy.lean());
    },
    async findById(id) { return isId(id) ? out(await User.findById(id).lean()) : null; },
    async create(data) { const u = await User.create(data); const o = out(u.toObject()); delete o.passwordHash; return o; },
    async update(id, patch) {
      if (!isId(id)) return null;
      if (patch.addresses) patch = { ...patch, addresses: patch.addresses.map(({ id: aid, ...a }) => (isId(aid) ? { _id: aid, ...a } : a)) };
      return out(await User.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean());
    },
    async list({ q, page = 1, limit = 20 } = {}) {
      const f = q ? { $or: [{ name: { $regex: escapeRe(q), $options: 'i' } }, { email: { $regex: escapeRe(q), $options: 'i' } }] } : {};
      const [items, total] = await Promise.all([
        User.find(f).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        User.countDocuments(f),
      ]);
      return { items: items.map(out), total };
    },
    async count() { return User.countDocuments({ role: 'user' }); },
  },
  orders: {
    async create(data) { return out((await Order.create(data)).toObject()); },
    async findByOrderId(orderId) { return out(await Order.findOne({ orderId: String(orderId) }).lean()); },
    async listByUser(userId) { return (await Order.find({ user: userId }).sort({ createdAt: -1 }).limit(100).lean()).map(out); },
    async list({ status, q, from, to, page = 1, limit = 20 } = {}) {
      const f = {};
      if (status) f.status = String(status);
      if (q) f.$or = [{ orderId: { $regex: escapeRe(q), $options: 'i' } }, { userEmail: { $regex: escapeRe(q), $options: 'i' } }];
      if (from || to) { f.createdAt = {}; if (from) f.createdAt.$gte = from; if (to) f.createdAt.$lte = to; }
      const [items, total] = await Promise.all([
        Order.find(f).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Order.countDocuments(f),
      ]);
      return { items: items.map(out), total };
    },
    async since(date) { return (await Order.find({ createdAt: { $gte: date } }).lean()).map(out); },
    async activeAuto() { return (await Order.find({ autoAdvance: true, status: { $nin: ['DELIVERED', 'CANCELLED'] } }).lean()).map(out); },
    async update(orderId, patch, pushHistory) {
      const u = { $set: patch };
      if (pushHistory) u.$push = { statusHistory: pushHistory };
      return out(await Order.findOneAndUpdate({ orderId: String(orderId) }, u, { new: true }).lean());
    },
  },
};
