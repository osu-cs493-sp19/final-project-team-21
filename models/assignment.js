const { ObjectId } = require('mongodb');

const { getDBReference } = require('../lib/mongo');
const { extractValidFields } = require('../lib/validation');

const AssignmentSchema = {
  courseId: { required: true },
  title: { required: true },
  points: { required: true },
  due: { required: true },
};

const insertNewAssignment = async (rawAssignment) => {
  const assignment = extractValidFields(rawAssignment, AssignmentSchema);
  const db = getDBReference();
  const collection = db.collection('assignments');
  const result = await collection.insertOne(assignment);
  return result.insertedId;
};

const getAssignmentById = async (id) => {
  const db = getDBReference();
  const collection = db.collection('assignments');
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const results = await collection
    .find({ _id: new ObjectId(id) })
    .toArray();
  return results[0];
};

const getAssignmentsByCourseId = async (courseId) => {
  const db = getDBReference();
  const collection = db.collection('assignments');
  const results = await collection
    .find({ courseId })
    .toArray();
  return results;
};

const updateAssignmentById = async (id, rawFields) => {
  const newFields = extractValidFields(rawFields, AssignmentSchema);
  const db = getDBReference();
  const collection = db.collection('assignments');
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

const deleteAssignmentById = async (id) => {
  const db = getDBReference();
  const collection = db.collection('assignments');
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
  AssignmentSchema,
  insertNewAssignment,
  getAssignmentById,
  getAssignmentsByCourseId,
  updateAssignmentById,
  deleteAssignmentById,
};
