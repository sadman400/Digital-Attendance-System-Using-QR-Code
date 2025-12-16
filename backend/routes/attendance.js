const express = require('express');
const QRCode = require('qrcode');
const crypto = require('crypto');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const QRSession = require('../models/QRSession');
const { auth, isTeacher } = require('../middleware/auth');

const router = express.Router();

// Generate QR code for attendance (teachers only)
router.post('/generate-qr/:classId', auth, isTeacher, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.classId);
    
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classData.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Deactivate any existing sessions for this class
    await QRSession.updateMany(
      { class: classData._id, isActive: true },
      { isActive: false }
    );

    // Generate unique session code
    const sessionCode = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create QR data
    const qrData = JSON.stringify({
      sessionCode,
      classId: classData._id,
      className: classData.name,
      expiresAt: expiresAt.toISOString()
    });

    // Generate QR code image
    const qrImage = await QRCode.toDataURL(qrData);

    // Save session
    const session = new QRSession({
      class: classData._id,
      teacher: req.user._id,
      sessionCode,
      qrData,
      expiresAt
    });
    await session.save();

    res.json({
      qrImage,
      sessionCode,
      expiresAt,
      className: classData.name
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark attendance via QR code (students)
router.post('/mark', auth, async (req, res) => {
  try {
    const { sessionCode, classId } = req.body;

    // Find active session
    const session = await QRSession.findOne({
      sessionCode,
      class: classId,
      isActive: true
    });

    if (!session) {
      return res.status(400).json({ message: 'Invalid or expired QR code' });
    }

    // Check if session expired
    if (new Date() > session.expiresAt) {
      session.isActive = false;
      await session.save();
      return res.status(400).json({ message: 'QR code has expired' });
    }

    // Check if student is enrolled in class
    const classData = await Class.findById(classId);
    if (!classData.students.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are not enrolled in this class' });
    }

    // Check for existing attendance today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      class: classId,
      student: req.user._id,
      date: { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already marked for today' });
    }

    // Mark attendance
    const attendance = new Attendance({
      class: classId,
      student: req.user._id,
      date: new Date(),
      status: 'present',
      qrSessionId: sessionCode
    });

    await attendance.save();

    res.json({
      message: 'Attendance marked successfully',
      attendance: {
        class: classData.name,
        date: attendance.date,
        status: attendance.status
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Attendance already marked for today' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get attendance for a class (teachers)
router.get('/class/:classId', auth, isTeacher, async (req, res) => {
  try {
    const { date } = req.query;
    const classData = await Class.findById(req.params.classId);

    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    let query = { class: req.params.classId };

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }

    const attendance = await Attendance.find(query)
      .populate('student', 'name email studentId')
      .sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get student's own attendance
router.get('/my-attendance', auth, async (req, res) => {
  try {
    const { classId } = req.query;
    let query = { student: req.user._id };

    if (classId) {
      query.class = classId;
    }

    const attendance = await Attendance.find(query)
      .populate('class', 'name code')
      .sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get attendance statistics for a class
router.get('/stats/:classId', auth, isTeacher, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.classId)
      .populate('students', 'name email studentId');

    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const stats = await Promise.all(
      classData.students.map(async (student) => {
        const totalAttendance = await Attendance.countDocuments({
          class: req.params.classId,
          student: student._id
        });

        const presentCount = await Attendance.countDocuments({
          class: req.params.classId,
          student: student._id,
          status: 'present'
        });

        return {
          student: {
            id: student._id,
            name: student.name,
            email: student.email,
            studentId: student.studentId
          },
          totalClasses: totalAttendance,
          present: presentCount,
          percentage: totalAttendance > 0 ? ((presentCount / totalAttendance) * 100).toFixed(2) : 0
        };
      })
    );

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get active QR session for a class
router.get('/active-session/:classId', auth, isTeacher, async (req, res) => {
  try {
    const session = await QRSession.findOne({
      class: req.params.classId,
      teacher: req.user._id,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return res.json({ hasActiveSession: false });
    }

    const qrImage = await QRCode.toDataURL(session.qrData);

    res.json({
      hasActiveSession: true,
      qrImage,
      sessionCode: session.sessionCode,
      expiresAt: session.expiresAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
