const router = require('express').Router();

const { validateAgainstSchema } = require('../lib/validation');
const {
  CourseSchema,
  getCoursesPage,
  insertNewCourse,
  getCourseDetailsById,
  updateCourseById,
  deleteCourseById,
} = require('../models/course');

router.get('/', async (req, res) => {
  try {
    /*
     * Fetch page info, generate HATEOAS links for surrounding pages and then
     * send response.
     */
    const coursePage = await getCoursesPage(parseInt(req.query.page, 10) || 1);
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
    const course = await getCourseDetailsById(req.params.id);
    if (course) {
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
      res.status(200).json({
        links: {
          course: `/courses/${req.params.id}`,
        },
      });
    } else {
      next();
    }
  } else {
    res.status(400).json({ error: 'Request body is not a valid course object' });
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

module.exports = router;
