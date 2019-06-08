const router = require('express').Router();

const { validateAgainstSchema } = require('../lib/validation');
const {
  AssignmentSchema,
  insertNewAssignment,
  getAssignmentById,
  updateAssignmentById,
  deleteAssignmentById,
} = require('../models/assignment');

router.post('/', async (req, res) => {
  if (validateAgainstSchema(req.body, AssignmentSchema)) {
    try {
      const id = await insertNewAssignment(req.body);
      res.status(201).send({
        id,
        links: {
          assignment: `/assignments/${id}`,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: 'Error inserting assignment into DB. Please try again later.',
      });
    }
  } else {
    res.status(400).send({
      error: 'Request body is not a valid assignment object.',
    });
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const assignment = await getAssignmentById(req.params.id);
    if (assignment) {
      res.status(200).send(assignment);
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Unable to fetch assignment. Please try again later.',
    });
  }
});

router.patch('/:id', async (req, res, next) => {
  const PatchAssignmentSchema = AssignmentSchema;
  Object.keys(PatchAssignmentSchema).forEach((key) => {
    PatchAssignmentSchema[key] = { required: false };
  });
  if (validateAgainstSchema(req.body, PatchAssignmentSchema)) {
    const result = await updateAssignmentById(req.params.id, req.body);
    if (result) {
      res.status(200).json({
        links: {
          course: `/assignments/${req.params.id}`,
        },
      });
    } else {
      next();
    }
  } else {
    res.status(400).json({ error: 'Request body is not a valid assignment object' });
  }
});

router.delete('/:id', async (req, res, next) => {
  const result = await deleteAssignmentById(req.params.id);
  if (result) {
    res.status(204).send();
  } else {
    next();
  }
});

module.exports = router;
