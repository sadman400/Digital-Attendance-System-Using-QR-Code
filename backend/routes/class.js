const express = require('express');
const Class = require('../models/Class');
const User = require('../models/User');
const { auth, isTeacher } = require('../middleware/auth');

const router = express.Router();

// Create class (teachers only)
router.post('/', auth, isTeacher, async (req, res) => {
  try {
    const { name, code, schedule, department } = req.body;

    const existingClass = await Class.findOne({ code: code.toUpperCase() });
    if (existingClass) {
      return res.status(400).json({ message: 'Class code already exists' });
    }

    const newClass = new Class({
      name,
      code: code.toUpperCase(),
      teacher: req.user._id,
      schedule,
      department
    });

    await newClass.save();
    await newClass.populate('teacher', 'name email');

    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all classes for current user
router.get('/', auth, async (req, res) => {
  try {
    let classes;
    if (req.user.role === 'teacher' || req.user.role === 'admin') {
      classes = await Class.find({ teacher: req.user._id })
        .populate('teacher', 'name email')
        .populate('students', 'name email studentId');
    } else {
      classes = await Class.find({ students: req.user._id })
        .populate('teacher', 'name email')
        .populate('students', 'name email studentId');
    }
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single class
router.get('/:id', auth, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('students', 'name email studentId');
    
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.json(classData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Join class (students)
router.post('/join/:code', auth, async (req, res) => {
  try {
    const classData = await Class.findOne({ code: req.params.code.toUpperCase() });
    
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classData.students.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already enrolled in this class' });
    }

    classData.students.push(req.user._id);
    await classData.save();
    await classData.populate('teacher', 'name email');
    await classData.populate('students', 'name email studentId');

    res.json(classData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add student to class (teachers)
router.post('/:id/students', auth, isTeacher, async (req, res) => {
  try {
    const { studentEmail } = req.body;
    const classData = await Class.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classData.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const student = await User.findOne({ email: studentEmail, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (classData.students.includes(student._id)) {
      return res.status(400).json({ message: 'Student already in class' });
    }

    classData.students.push(student._id);
    await classData.save();
    await classData.populate('students', 'name email studentId');

    res.json(classData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete class
router.delete('/:id', auth, isTeacher, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classData.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Class.findByIdAndDelete(req.params.id);
    res.json({ message: 'Class deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
