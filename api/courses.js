const router = require('express').Router();
const { ObjectId } = require('mongodb');

const { requireAuthentication } = require('../lib/auth');
const { validateAgainstSchema } = require('../lib/validation');
const {
  CourseSchema,
  getCoursesPage,
  insertNewCourse,
  getCourseById,
  updateCourseById,
  updateEnrolledById,
  deleteCourseById,
} = require('../models/course');
const { getAssignmentsByCourseId } = require('../models/assignment');
const { getUserById, getUsersByQuery } = require('../models/user');

router.get('/', async (req, res) => {
  try {
    /*
     * Fetch page info, generate HATEOAS links for surrounding pages and then
     * send response.
     */
    const coursePage = await getCoursesPage(req.query);
    coursePage.courses.forEach((course) => {
      delete course.enrolled;
    });
    coursePage.links = {};
    if (coursePage.page < coursePage.totalPages) {
      coursePage.links.nextPage = `/courses?page=${coursePage.page + 1}`;
      coursePage.links.lastPage = `/courses?page=${coursePage.totalPages}`;
    }
    if (coursePage.page > 1) {
      coursePage.links.prevPage = `/courses?page=${coursePage.page - 1}`;
      coursePage.links.firstPage = '/courses?page=1';
    }
    res.status(200).send(coursePage);
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Error fetching courses. Please try again later.',
    });
  }
});

router.post('/', requireAuthentication, async (req, res) => {
  if (req.user.role === 'admin') {
    if (validateAgainstSchema(req.body, CourseSchema)) {
      try {
        const user = await getUserById(req.body.instructorId);
        if (user && user.role === 'instructor') {
          const id = await insertNewCourse(req.body);
          res.status(201).send({
            id,
            links: {
              course: `/courses/${id}`,
            },
          });
        } else {
          res.status(400).send({
            error: 'instructorId does not belong to valid instructor',
          });
        }
      } catch (err) {
        console.error(err);
        res.status(500).send({
          error: 'Error inserting course into DB. Please try again later.',
        });
      }
    } else {
      res.status(400).send({
        error: 'Request body is not a valid course object.',
      });
    }
  } else {
    res.status(403).send({
      error: 'This action requires admin authentication',
    });
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const course = await getCourseById(req.params.id);
    if (course) {
      delete course.enrolled;
      res.status(200).send(course);
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Unable to fetch course. Please try again later.',
    });
  }
});

router.patch('/:id', requireAuthentication, async (req, res, next) => {
  try {
    const course = await getCourseById(req.params.id);
    if (course) {
      if (req.user.role === 'admin' || req.user.id === course.instructorId.toString()) {
        if (
          !('instructorId' in req.body)
          || req.body.instructorId === course.instructorId.toString()
        ) {
          const result = await updateCourseById(req.params.id, req.body);
          if (result) {
            res.status(200).send({
              links: {
                course: `/courses/${req.params.id}`,
              },
            });
          } else {
            next();
          }
        } else {
          res.status(400).send({
            error: 'Course\'s instructorId must not be modified',
          });
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
      error: 'Unable to update course. Please try again later.',
    });
  }
});

router.delete('/:id', requireAuthentication, async (req, res, next) => {
  if (req.user.role === 'admin') {
    try {
      const result = await deleteCourseById(req.params.id);
      if (result) {
        res.status(204).send();
      } else {
        next();
      }
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: 'Unable to delete course. Please try again later.',
      });
    }
  } else {
    res.status(403).send({
      error: 'This action requires admin authentication',
    });
  }
});

router.get('/:id/students', requireAuthentication, async (req, res, next) => {
  try {
    const course = await getCourseById(req.params.id);
    if (course) {
      if (req.user.role === 'admin' || req.user.id === course.instructorId.toString()) {
        const response = { students: course.enrolled };
        res.status(200).send(response);
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
      error: 'Unable to fetch course. Please try again later.',
    });
  }
});

router.post('/:id/students', requireAuthentication, async (req, res, next) => {
  const changes = req.body;
  ['add', 'remove'].forEach((field) => {
    if (field in changes) {
      changes[field].forEach((studentId) => {
        if (!ObjectId.isValid(studentId)) {
          return res.status(400).send({
            error: 'Request body contained badly formatted student ID(s).',
          });
        }
      });
    } else {
      changes[field] = [];
    }
  });
  try {
    const course = await getCourseById(req.params.id);
    if (course) {
      if (req.user.role === 'admin' || req.user.id === course.instructorId.toString()) {
        const result = await updateEnrolledById(req.params.id, changes);
        if (result) {
          res.status(200).send({
            links: {
              students: `/courses/${req.params.id}/students`,
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
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Unable to update course students. Please try again later.',
    });
  }
});

router.get('/:id/roster', requireAuthentication, async (req, res, next) => {
  try {
    const course = await getCourseById(req.params.id);
    if (course) {
      if (req.user.role === 'admin' || req.user.id === course.instructorId.toString()) {
        let csvString = 'id,name,email';
        const query = { _id: { $in: course.enrolled } };
        const students = await getUsersByQuery(query);
        students.forEach((student) => {
          csvString += `\n${student._id},"${student.name}","${student.email}"`;
        });

        res.setHeader('Content-disposition', 'attachment; filename=roster.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.status(200).send(csvString);
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
      error: 'Unable to fetch course. Please try again later.',
    });
  }
});

router.get('/:id/assignments', async (req, res, next) => {
  try {
    const course = await getCourseById(req.params.id);
    if (course) {
      const assignments = await getAssignmentsByCourseId(req.params.id);
      const assignmentIds = assignments.map(assignment => assignment._id);
      res.status(200).send({ assignments: assignmentIds });
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Unable to fetch course. Please try again later.',
    });
  }
});

module.exports = router;
