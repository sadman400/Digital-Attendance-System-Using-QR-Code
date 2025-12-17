const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

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

// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  studentId: { type: String, unique: true, sparse: true },
  department: { type: String },
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
  name: { type: String, required: true },
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

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Class = mongoose.models.Class || mongoose.model('Class', classSchema);
const QRSession = mongoose.models.QRSession || mongoose.model('QRSession', qrSessionSchema);
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

// Auth middleware
async function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// DB middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ message: 'Database connection failed', error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running', version: '3.0' });
});

// AUTH ROUTES
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, studentId, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const userData = { name, email, password, role: role || 'student', department: department || undefined };
    if (studentId && studentId.trim()) userData.studentId = studentId.trim();

    const user = new User(userData);
    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, studentId: user.studentId, department: user.department } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, studentId: user.studentId, department: user.department } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role, studentId: req.user.studentId, department: req.user.department } });
});

// CLASS ROUTES
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

app.post('/api/classes', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only teachers can create classes' });
    }
    const { name, code, schedule } = req.body;
    const existingClass = await Class.findOne({ code });
    if (existingClass) return res.status(400).json({ message: 'Class code already exists' });
    const newClass = new Class({ name, code, teacher: req.user._id, schedule });
    await newClass.save();
    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/classes/:id', auth, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id).populate('teacher', 'name email').populate('students', 'name email studentId');
    if (!classItem) return res.status(404).json({ message: 'Class not found' });
    res.json(classItem);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/classes/:id', auth, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    if (!classItem) return res.status(404).json({ message: 'Class not found' });
    if (classItem.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the class teacher can delete this class' });
    }
    await Class.findByIdAndDelete(req.params.id);
    await QRSession.deleteMany({ classId: req.params.id });
    await Attendance.deleteMany({ class: req.params.id });
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/classes/join', auth, async (req, res) => {
  try {
    const { code } = req.body;
    const classItem = await Class.findOne({ code });
    if (!classItem) return res.status(404).json({ message: 'Class not found' });
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
    if (!classItem) return res.status(404).json({ message: 'Class not found' });
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
    const qrSession = await QRSession.findOne({ qrCode, expiresAt: { $gt: new Date() } });
    if (!qrSession) return res.status(400).json({ message: 'Invalid or expired QR code' });
    const classItem = await Class.findById(qrSession.classId);
    if (!classItem) return res.status(404).json({ message: 'Class not found' });
    if (!classItem.students.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are not enrolled in this class' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingAttendance = await Attendance.findOne({ student: req.user._id, class: classItem._id, date: { $gte: today } });
    if (existingAttendance) return res.status(400).json({ message: 'Attendance already marked for today' });
    const attendance = new Attendance({ student: req.user._id, class: classItem._id, status: 'present', qrSession: qrSession._id });
    await attendance.save();
    res.status(201).json({ message: 'Attendance marked successfully', attendance });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/attendance/my', auth, async (req, res) => {
  try {
    const attendance = await Attendance.find({ student: req.user._id }).populate('class', 'name code').sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/attendance/class/:classId', auth, async (req, res) => {
  try {
    const attendance = await Attendance.find({ class: req.params.classId }).populate('student', 'name email studentId').sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/attendance/stats/:classId', auth, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.classId);
    if (!classItem) return res.status(404).json({ message: 'Class not found' });
    const attendanceRecords = await Attendance.find({ class: req.params.classId });
    const totalStudents = classItem.students.length;
    const uniqueDates = [...new Set(attendanceRecords.map(a => a.date.toDateString()))];
    const totalClasses = uniqueDates.length || 1;
    const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
    const averageAttendance = totalStudents > 0 && totalClasses > 0 ? Math.round((presentCount / (totalStudents * totalClasses)) * 100) : 0;
    res.json({ totalStudents, totalClasses, presentCount, averageAttendance, attendanceRecords: attendanceRecords.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/attendance/active-session/:classId', auth, async (req, res) => {
  try {
    const activeSession = await QRSession.findOne({ classId: req.params.classId, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!activeSession) return res.json({ active: false, session: null });
    res.json({ active: true, session: { id: activeSession._id, qrCode: activeSession.qrCode, expiresAt: activeSession.expiresAt, createdAt: activeSession.createdAt } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/attendance/generate-qr/:classId', auth, async (req, res) => {
  try {
    console.log('Generate QR for classId:', req.params.classId, 'by user:', req.user._id);
    const classItem = await Class.findById(req.params.classId);
    if (!classItem) {
      console.log('Class not found:', req.params.classId);
      return res.status(404).json({ message: 'Class not found' });
    }
    console.log('Class teacher:', classItem.teacher, 'Request user:', req.user._id);
    if (classItem.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the class teacher can generate QR codes' });
    }
    const qrData = { classId: classItem._id.toString(), timestamp: Date.now(), random: Math.random().toString(36).substring(7) };
    const qrCode = Buffer.from(JSON.stringify(qrData)).toString('base64');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const qrSession = new QRSession({ classId: classItem._id, qrCode, expiresAt });
    await qrSession.save();
    console.log('QR Session created:', qrSession._id);
    res.json({ qrCode, expiresAt, sessionId: qrSession._id });
  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
  }
});

// Catch-all
app.all('/api/*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found', path: req.path });
});

module.exports = app;
