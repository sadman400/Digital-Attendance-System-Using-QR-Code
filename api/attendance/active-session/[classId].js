const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const MONGODB_URI = process.env.MONGODB_URI;
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  studentId: { type: String, unique: true, sparse: true },
  department: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const qrSessionSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  qrCode: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const QRSession = mongoose.models.QRSession || mongoose.model('QRSession', qrSessionSchema);

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(decoded.userId);
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    await connectDB();
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { classId } = req.query;
    
    // Find active (non-expired) QR session for this class
    const activeSession = await QRSession.findOne({
      classId,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!activeSession) {
      return res.status(200).json({ active: false, session: null });
    }

    return res.status(200).json({
      active: true,
      session: {
        id: activeSession._id,
        qrCode: activeSession.qrCode,
        expiresAt: activeSession.expiresAt,
        createdAt: activeSession.createdAt
      }
    });
  } catch (error) {
    console.error('Active session error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
