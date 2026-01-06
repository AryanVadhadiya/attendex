const Subject = require('../models/Subject');
const Joi = require('joi');

const getSubjects = async (req, res) => {
  const startTime = Date.now();
  try {
    const subjects = await Subject.find({ ownerId: req.user._id });
    console.log('[PERF] getSubjects', req.user._id.toString(), Date.now() - startTime, 'ms', 'count:', subjects.length);
    res.json(subjects);
  } catch (err) {
    console.error('[PERF] getSubjects error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const createSubject = async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    code: Joi.string().allow('', null),
    color: Joi.string().allow('', null),
    lecturesPerWeek: Joi.number().integer().min(0),
    labsPerWeek: Joi.number().integer().min(0)
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const startTime = Date.now();
  try {
    const subject = await Subject.create({
      ...req.body,
      ownerId: req.user._id
    });
    console.log('[PERF] createSubject', req.user._id.toString(), Date.now() - startTime, 'ms');
    res.status(201).json(subject);
  } catch (err) {
    console.error('[PERF] createSubject error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateSubject = async (req, res) => {
  const startTime = Date.now();
  try {
    const subject = await Subject.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!subject) {
      console.log('[PERF] updateSubject not-found', req.user._id.toString(), Date.now() - startTime, 'ms');
      return res.status(404).json({ message: 'Subject not found' });
    }

    Object.assign(subject, req.body);
    await subject.save();
    console.log('[PERF] updateSubject', req.user._id.toString(), Date.now() - startTime, 'ms');
    res.json(subject);
  } catch (err) {
    console.error('[PERF] updateSubject error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteSubject = async (req, res) => {
  const startTime = Date.now();
  try {
    const subject = await Subject.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });
    if (!subject) {
      console.log('[PERF] deleteSubject not-found', req.user._id.toString(), Date.now() - startTime, 'ms');
      return res.status(404).json({ message: 'Subject not found' });
    }

    // TODO: cleanup related WeeklySlots and Occurrences?
    console.log('[PERF] deleteSubject', req.user._id.toString(), Date.now() - startTime, 'ms');
    res.json({ message: 'Subject removed' });
  } catch (err) {
    console.error('[PERF] deleteSubject error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getSubjects, createSubject, updateSubject, deleteSubject };
