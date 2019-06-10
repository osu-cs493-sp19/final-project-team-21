const router = require('express').Router();
const { ObjectId } = require('mongodb');

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
const { getUsersByQuery } = require('../models/user');

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

router.post('/', async (req, res) => {
  if (validateAgainstSchema(req.body, CourseSchema)) {
    try {
      const id = await insertNewCourse(req.body);
      res.status(201).send({
        id,
        links: {
          course: `/courses/${id}`,
        },
      });
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

router.patch('/:id', async (req, res, next) => {
  const PatchCourseSchema = CourseSchema;
  Object.keys(PatchCourseSchema).forEach((key) => {
    PatchCourseSchema[key] = { required: false };
  });
  if (validateAgainstSchema(req.body, PatchCourseSchema)) {
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
    res.status(400).send({ error: 'Request body is not a valid course object' });
  }
});

router.delete('/:id', async (req, res, next) => {
  const result = await deleteCourseById(req.params.id);
  if (result) {
    res.status(204).send();
  } else {
    next();
  }
});

router.get('/:id/students', async (req, res, next) => {
  try {
    const course = await getCourseById(req.params.id);
    if (course) {
      const response = { students: course.enrolled };
      res.status(200).send(response);
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

router.post('/:id/students', async (req, res, next) => {
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
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: 'Unable to update course students. Please try again later.',
    });
  }
});

router.get('/:id/roster', async (req, res, next) => {
  try {
    const course = await getCourseById(req.params.id);
    if (course) {
      let csvString = 'id,name,email';
      const query = { _id: { $in: course.enrolled } };
      const students = await getUsersByQuery(query);
      students.forEach((student) => {
        csvString += `\n${student._id},${student.name},${student.email}`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.status(200).send(csvString);
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
