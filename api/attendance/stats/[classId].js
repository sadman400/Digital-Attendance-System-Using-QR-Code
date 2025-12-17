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

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  schedule: { day: String, time: String },
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
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

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
    
    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Get attendance records for this class
    const attendanceRecords = await Attendance.find({ class: classId });
    
    // Calculate stats
    const totalStudents = classItem.students.length;
    const totalClasses = await Attendance.distinct('date', { class: classId }).then(dates => dates.length) || 1;
    const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
    const averageAttendance = totalStudents > 0 && totalClasses > 0 
      ? Math.round((presentCount / (totalStudents * totalClasses)) * 100) 
      : 0;

    return res.status(200).json({
      totalStudents,
      totalClasses,
      presentCount,
      averageAttendance,
      attendanceRecords: attendanceRecords.length
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
