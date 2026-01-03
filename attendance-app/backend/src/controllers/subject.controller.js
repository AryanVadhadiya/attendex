const Subject = require('../models/Subject');
const Joi = require('joi');

const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ ownerId: req.user._id });
    res.json(subjects);
  } catch (err) {
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

  try {
    const subject = await Subject.create({
      ...req.body,
      ownerId: req.user._id
    });
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    Object.assign(subject, req.body);
    await subject.save();
    res.json(subject);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    // TODO: cleanup related WeeklySlots and Occurrences?
    res.json({ message: 'Subject removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getSubjects, createSubject, updateSubject, deleteSubject };
