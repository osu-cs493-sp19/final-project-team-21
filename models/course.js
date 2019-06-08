const { ObjectId } = require('mongodb');

const { getDBReference } = require('../lib/mongo');
const { extractValidFields } = require('../lib/validation');

const CourseSchema = {
  subject: { required: true },
  number: { required: true },
  title: { required: true },
  term: { required: true },
  instructorId: { required: true },
};

const getCoursesPage = async (rawPage) => {
  const db = getDBReference();
  const collection = db.collection('courses');
  const count = await collection.countDocuments();

  /*
   * Compute last page number and make sure page is within allowed bounds.
   * Compute offset into collection.
   */
  const pageSize = 10;
  const lastPage = Math.ceil(count / pageSize);
  let page = rawPage;
  page = page > lastPage ? lastPage : page;
  page = page < 1 ? 1 : page;
  const offset = (page - 1) * pageSize;

  const results = await collection.find({})
    .sort({ _id: 1 })
    .skip(offset)
    .limit(pageSize)
    .toArray();

  return {
    courses: results,
    page,
    totalPages: lastPage,
    pageSize,
    count,
  };
};

const insertNewCourse = async (rawCourse) => {
  const course = extractValidFields(rawCourse, CourseSchema);
  const db = getDBReference();
  const collection = db.collection('courses');
  const result = await collection.insertOne(course);
  return result.insertedId;
};

const getCourseById = async (id) => {
  const db = getDBReference();
  const collection = db.collection('courses');
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const results = await collection
    .find({ _id: new ObjectId(id) })
    .toArray();
  return results[0];
};

// TODO Implement
const getCourseDetailsById = async (id) => {
  const course = await getCourseById(id);
  return course;
};

const updateCourseById = async (id, rawFields) => {
  const newFields = extractValidFields(rawFields, CourseSchema);
  const db = getDBReference();
  const collection = db.collection('courses');
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const result = await collection
    .updateOne({ _id: new ObjectId(id) }, { $set: newFields });
  if (result.matchedCount === 0) {
    return null;
  }
  return true;
};

const deleteCourseById = async (id) => {
  const db = getDBReference();
  const collection = db.collection('courses');
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const result = await collection
    .deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    return null;
  }
  return true;
};

module.exports = {
  CourseSchema,
  getCoursesPage,
  insertNewCourse,
  getCourseDetailsById,
  updateCourseById,
  deleteCourseById,
};
