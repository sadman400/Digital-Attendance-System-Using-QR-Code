const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// MongoDB connection - Vercel recommended pattern with global caching
const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

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

// Define schemas inline to avoid path issues
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  studentId: { type: String, unique: true, sparse: true },
  department: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const classSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  schedule: { day: String, time: String },
  createdAt: { type: Date, default: Date.now }
});

const qrSessionSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  qrCode: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' },
  qrSession: { type: mongoose.Schema.Types.ObjectId, ref: 'QRSession' }
});

// Get or create models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Class = mongoose.models.Class || mongoose.model('Class', classSchema);
const QRSession = mongoose.models.QRSession || mongoose.model('QRSession', qrSessionSchema);
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to connect to DB before each request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB Connection Error:', err);
    res.status(500).json({ message: 'Database connection failed', error: err.message });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', message: 'Server is running', db: mongoose.connection.readyState });
});

// AUTH ROUTES
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, studentId, department } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const user = new User({ name, email, password, role: role || 'student', studentId, department });
    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, studentId: user.studentId, department: user.department }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, studentId: user.studentId, department: user.department }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  res.json({
    user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role, studentId: req.user.studentId, department: req.user.department }
  });
});

// CLASS ROUTES
app.post('/api/classes', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only teachers can create classes' });
    }
    const { name, code, schedule } = req.body;
    const existingClass = await Class.findOne({ code });
    if (existingClass) {
      return res.status(400).json({ message: 'Class code already exists' });
    }
    const newClass = new Class({ name, code, teacher: req.user._id, schedule });
    await newClass.save();
    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/classes', auth, async (req, res) => {
  try {
    let classes;
    if (req.user.role === 'teacher' || req.user.role === 'admin') {
      classes = await Class.find({ teacher: req.user._id }).populate('students', 'name email studentId');
    } else {
      classes = await Class.find({ students: req.user._id }).populate('teacher', 'name email');
    }
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/classes/:id', auth, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id).populate('teacher', 'name email').populate('students', 'name email studentId');
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.json(classItem);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/classes/join', auth, async (req, res) => {
  try {
    const { code } = req.body;
    const classItem = await Class.findOne({ code });
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    if (classItem.students.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already enrolled in this class' });
    }
    classItem.students.push(req.user._id);
    await classItem.save();
    res.json({ message: 'Successfully joined class', class: classItem });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/classes/:id/generate-qr', auth, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    if (classItem.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the class teacher can generate QR codes' });
    }
    const qrData = { classId: classItem._id, timestamp: Date.now(), random: Math.random().toString(36).substring(7) };
    const qrCode = Buffer.from(JSON.stringify(qrData)).toString('base64');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const qrSession = new QRSession({ classId: classItem._id, qrCode, expiresAt });
    await qrSession.save();
    res.json({ qrCode, expiresAt, sessionId: qrSession._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ATTENDANCE ROUTES
app.post('/api/attendance/mark', auth, async (req, res) => {
  try {
    const { qrCode } = req.body;
    const decoded = JSON.parse(Buffer.from(qrCode, 'base64').toString());
    const qrSession = await QRSession.findOne({ qrCode, expiresAt: { $gt: new Date() } });
    if (!qrSession) {
      return res.status(400).json({ message: 'Invalid or expired QR code' });
    }
    const classItem = await Class.findById(qrSession.classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    if (!classItem.students.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are not enrolled in this class' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingAttendance = await Attendance.findOne({
      student: req.user._id,
      class: classItem._id,
      date: { $gte: today }
    });
    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already marked for today' });
    }
    const attendance = new Attendance({
      student: req.user._id,
      class: classItem._id,
      status: 'present',
      qrSession: qrSession._id
    });
    await attendance.save();
    res.status(201).json({ message: 'Attendance marked successfully', attendance });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/attendance/class/:classId', auth, async (req, res) => {
  try {
    const attendance = await Attendance.find({ class: req.params.classId })
      .populate('student', 'name email studentId')
      .sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/attendance/my', auth, async (req, res) => {
  try {
    const attendance = await Attendance.find({ student: req.user._id })
      .populate('class', 'name code')
      .sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Catch-all for unmatched API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

module.exports = app;
