const fsPromises = require('fs').promises;

const router = require('express').Router();
const multer = require('multer');

const { requireAuthentication } = require('../lib/auth');
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
const { getCourseById } = require('../models/course');

const upload = multer({ dest: `${__dirname}/uploads` });

const removeUploadedFile = async (file) => {
  await fsPromises.unlink(file.path);
};

router.post('/', requireAuthentication, async (req, res) => {
  if (validateAgainstSchema(req.body, AssignmentSchema)) {
    try {
      const course = await getCourseById(req.body.courseId);
      if (course) {
        if (req.user.role === 'admin' || req.user.id === course.instructorId.toString()) {
          const id = await insertNewAssignment(req.body);
          res.status(201).send({
            id,
            links: {
              assignment: `/assignments/${id}`,
            },
          });
        } else {
          res.status(403).send({
            error: 'This action requires admin or course instructor authentication',
          });
        }
      } else {
        res.status(400).send({
          error: 'courseId does not belong to a valid course',
        });
      }
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

router.patch('/:id', requireAuthentication, async (req, res, next) => {
  try {
    const assignment = await getAssignmentById(req.params.id);
    if (assignment) {
      if (!('courseId' in req.body) || req.body.courseId === assignment.courseId.toString()) {
        const course = await getCourseById(assignment.courseId.toString());
        if (!course) {
          throw new Error(`Assignment with id ${assignment._id} has courseId ${assignment.courseId} but no such course exists`);
        }
        if (req.user.role === 'admin' || req.user.id === course.instructorId.toString()) {
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
          res.status(403).send({
            error: 'This action requires admin or course instructor authentication',
          });
        }
      } else {
        res.status(400).send({
          error: 'Assignment\'s courseId must not be modified.',
        });
      }
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Unable to update assignment. Please try again later.',
    });
  }
});

router.delete('/:id', requireAuthentication, async (req, res, next) => {
  try {
    const assignment = await getAssignmentById(req.params.id);
    if (assignment) {
      const course = await getCourseById(assignment.courseId.toString());
      if (!course) {
        throw new Error(`Assignment with id ${assignment._id} has courseId ${assignment.courseId} but no such course exists`);
      }
      if (req.user.role === 'admin' || req.user.id === course.instructorId.toString()) {
        const result = await deleteAssignmentById(req.params.id);
        if (result) {
          res.status(204).send();
        } else {
          next();
        }
      } else {
        res.status(403).send({
          error: 'This action requires admin or course instructor authentication',
        });
      }
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Unable to delete assignment. Please try again later.',
    });
  }
});

router.get('/:id/submissions', requireAuthentication, async (req, res, next) => {
  try {
    const assignment = await getAssignmentById(req.params.id);
    if (assignment) {
      const course = await getCourseById(assignment.courseId.toString());
      if (!course) {
        throw new Error(`Assignment with id ${assignment._id} has courseId ${assignment.courseId} but no such course exists`);
      }
      if (req.user.role === 'admin' || req.user.id === course.instructorId.toString()) {
        const submissionsPage = await getSubmissionsPageByAssignmentId(
          req.params.id,
          req.query,
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
        res.status(403).send({
          error: 'This action requires admin or course instructor authentication',
        });
      }
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

router.post('/:id/submissions', requireAuthentication, upload.single('file'), async (req, res, next) => {
  try {
    if (validateAgainstSchema(req.body, SubmissionSchema)) {
      const assignment = await getAssignmentById(req.params.id);
      if (assignment) {
        const course = await getCourseById(assignment.courseId.toString());
        if (!course) {
          throw new Error(`Assignment with id ${assignment._id} has courseId ${assignment.courseId} but no such course exists`);
        }
        const enrolledIds = course.enrolled.map(id => id.toString());
        if (req.user.role === 'student' && enrolledIds.includes(req.user.id)) {
          if (req.user.id === req.body.studentId) {
            const submission = {
              path: req.file.path,
              filename: req.file.filename,
              contentType: req.file.mimetype,
              studentId: req.body.studentId,
              assignmentId: req.params.id,
              timestamp: req.body.timestamp,
            };
            const id = await insertNewSubmission(submission);
            await addSubmissionUrl(id);
            res.status(201).send({ id });
          } else {
            res.status(400).send({
              error: 'Authenticated as different student than studentId',
            });
          }
        } else {
          res.status(403).send({
            error: 'This action requires enrolled student authentication',
          });
        }
      } else {
        next();
      }
    } else {
      res.status(400).send({
        error: 'Request body is not a valid submission object',
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Error inserting submission into DB. Please try again later.',
    });
  } finally {
    try {
      await removeUploadedFile(req.file);
    } catch (err) {
      console.error(err);
    }
  }
});

module.exports = router;
