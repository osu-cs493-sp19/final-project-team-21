const fsPromises = require('fs').promises;

const router = require('express').Router();
const multer = require('multer');

const { validateAgainstSchema } = require('../lib/validation');
const {
  AssignmentSchema,
  SubmissionSchema,
  insertNewAssignment,
  getAssignmentById,
  updateAssignmentById,
  deleteAssignmentById,
  insertNewSubmission,
  getSubmissionsPageByAssignmentId,
  addSubmissionUrl,
} = require('../models/assignment');

const upload = multer({ dest: `${__dirname}/uploads` });

const removeUploadedFile = async (file) => {
  await fsPromises.unlink(file.path);
};

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

router.get('/:id/submissions', async (req, res, next) => {
  try {
    const assignment = await getAssignmentById(req.params.id);
    if (assignment) {
      const submissionsPage = await getSubmissionsPageByAssignmentId(
        req.params.id,
        parseInt(req.query.page, 10) || 1,
      );

      submissionsPage.links = {};
      if (submissionsPage.page < submissionsPage.totalPages) {
        submissionsPage.links.nextPage = `/assignments/${req.params.id}/submissions?page=${submissionsPage.page + 1}`;
        submissionsPage.links.lastPage = `/assignments/${req.params.id}/submissions?page=${submissionsPage.totalPages}`;
      }
      if (submissionsPage.page > 1) {
        submissionsPage.links.prevPage = `/assignments/${req.params.id}/submissions?page=${submissionsPage.page - 1}`;
        submissionsPage.links.firstPage = `/assignments/${req.params.id}/submissions?page=1`;
      }

      const submissions = submissionsPage.submissions.map(submission => ({
        assignmentId: submission.metadata.assignmentId,
        studentId: submission.metadata.studentId,
        timestamp: submission.metadata.timestamp,
        url: submission.metadata.url,
      }));
      submissionsPage.submissions = submissions;

      res.status(200).send(submissionsPage);
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Error fetching submissions. Please try again later.',
    });
  }
});

router.post('/:id/submissions', upload.single('file'), async (req, res, next) => {
  if (validateAgainstSchema(req.body, SubmissionSchema)) {
    try {
      const assignment = await getAssignmentById(req.params.id);
      if (assignment) {
        const submission = {
          path: req.file.path,
          filename: req.file.filename,
          contentType: req.file.mimetype,
          studentId: req.body.studentId,
          assignmentId: req.params.id,
          timestamp: req.body.timestamp,
        };
        const id = await insertNewSubmission(submission);
        await Promise.all([
          addSubmissionUrl(id),
          removeUploadedFile(req.file),
        ]);
        res.status(201).send({ id });
      } else {
        next();
      }
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: 'Error inserting submission into DB. Please try again later.',
      });
    }
  } else {
    res.status(400).send({
      error: 'Request body is not a valid submission object',
    });
  }
});

module.exports = router;
