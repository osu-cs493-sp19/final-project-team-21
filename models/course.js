const { ObjectId } = require('mongodb');

const { getDBReference } = require('../lib/mongo');
const { extractValidFields } = require('../lib/validation');
const { getAssignmentsByCourseId, deleteAssignmentById } = require('./assignment');

const CourseSchema = {
  subject: { required: true },
  number: { required: true },
  title: { required: true },
  term: { required: true },
  instructorId: { required: true },
};

const getCoursesPage = async (params) => {
  const db = getDBReference();
  const collection = db.collection('courses');

  const query = {};
  ['subject', 'number', 'term'].forEach((field) => {
    if (field in params) {
      query[field] = params[field];
    }
  });

  const count = await collection.countDocuments(query);

  /*
   * Compute last page number and make sure page is within allowed bounds.
   * Compute offset into collection.
   */
  const pageSize = 10;
  const lastPage = Math.ceil(count / pageSize);
  let page = parseInt(params.page, 10) || 1;
  page = page > lastPage ? lastPage : page;
  page = page < 1 ? 1 : page;
  const offset = (page - 1) * pageSize;

  const results = await collection.find(query)
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

const getCoursesByQuery = async (query) => {
  const db = getDBReference();
  const collection = db.collection('courses');
  const results = await collection
    .find(query)
    .toArray();
  return results;
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

const updateEnrolledById = async (id, rawChanges) => {
  const changes = extractValidFields(rawChanges, { add: null, remove: null });
  changes.add = changes.add.map(studentId => new ObjectId(studentId));
  changes.remove = changes.remove.map(studentId => new ObjectId(studentId));
  const db = getDBReference();
  const collection = db.collection('courses');
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const result = await collection
    .updateOne(
      { _id: new ObjectId(id) },
      { $addToSet: { enrolled: { $each: changes.add } } },
    );
  if (result.matchedCount === 0) {
    return null;
  }
  await collection
    .updateOne(
      { _id: new ObjectId(id) },
      { $pullAll: { enrolled: changes.remove } },
    );
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
  const assignments = await getAssignmentsByCourseId(id);
  await Promise.all(assignments.map(
    async assignment => deleteAssignmentById(assignment._id.toString())
  ));
  return true;
};

module.exports = {
  CourseSchema,
  getCoursesPage,
  insertNewCourse,
  getCourseById,
  getCoursesByQuery,
  updateCourseById,
  updateEnrolledById,
  deleteCourseById,
};
