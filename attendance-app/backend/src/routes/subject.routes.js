const express = require('express');
const { getSubjects, createSubject, updateSubject, deleteSubject } = require('../controllers/subject.controller');
const { protect } = require('../middleware/auth.middleware');
const router = express.Router();

router.use(protect);

router.route('/')
  .get(getSubjects)
  .post(createSubject);

router.route('/:id')
  .put(updateSubject)
  .delete(deleteSubject);

module.exports = router;
