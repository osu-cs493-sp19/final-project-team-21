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

// TODO Implement
const getAssignmentDetailsById = async (id) => {
  const assignment = await getAssignmentById(id);
  return assignment;
};

const updateAssignmentById = async (id, rawFields) => {
  const newFields = extractValidFields(rawFields, AssignmentSchema);
  const db = getDBReference();
  const collection = db.collection('assignments');
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const result = await collection
    .updateOne({ _id: new ObjectId(id) }, newFields);
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
  getAssignmentDetailsById,
  updateAssignmentById,
  deleteAssignmentById,
};
