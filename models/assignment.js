const fs = require('fs');

const { ObjectId, GridFSBucket } = require('mongodb');

const { getDBReference } = require('../lib/mongo');
const { extractValidFields } = require('../lib/validation');

const AssignmentSchema = {
  courseId: { required: true },
  title: { required: true },
  points: { required: true },
  due: { required: true },
};

const SubmissionSchema = {
  studentId: { required: true },
  timestamp: { required: true },
};

const insertNewAssignment = async (rawAssignment) => {
  const assignment = extractValidFields(rawAssignment, AssignmentSchema);
  assignment.courseId = new ObjectId(assignment.courseId);
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
  if (!ObjectId.isValid(courseId)) {
    return null;
  }
  const results = await collection
    .find({ courseId: new ObjectId(courseId) })
    .toArray();
  return results;
};

const updateAssignmentById = async (id, rawFields) => {
  const newFields = extractValidFields(rawFields, AssignmentSchema);
  // We have already confirmed that courseId is the same so it does not need to be updated
  delete newFields.courseId;
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

const insertNewSubmission = submission => new Promise((resolve, reject) => {
  const db = getDBReference();
  const bucket = new GridFSBucket(db, { bucketName: 'submissions' });

  const metadata = {
    contentType: submission.contentType,
    studentId: submission.studentId,
    assignmentId: submission.assignmentId,
    timestamp: submission.timestamp,
  };

  const uploadStream = bucket.openUploadStream(
    submission.filename,
    { metadata },
  );

  fs.createReadStream(submission.path)
    .pipe(uploadStream)
    .on('error', (err) => {
      reject(err);
    })
    .on('finish', (result) => {
      resolve(result._id);
    });
});

const getSubmissionsPageByAssignmentId = async (id, rawPage) => {
  const db = getDBReference();
  const collection = db.collection('submissions.files');
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const count = await collection.countDocuments({ 'metadata.assignmentId': id });
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

  const results = await collection.find({ 'metadata.assignmentId': id })
    .sort({ _id: 1 })
    .skip(offset)
    .limit(pageSize)
    .toArray();

  return {
    submissions: results,
    page,
    totalPages: lastPage,
    pageSize,
    count,
  };
};

const addSubmissionUrl = async (id) => {
  const db = getDBReference();
  const collection = db.collection('submissions.files');
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { 'metadata.url': `/media/submissions/${id}` } },
  );
  return result.matchedCount > 0;
};

const getDownloadStreamById = async (id) => {
  const db = getDBReference();
  const bucket = new GridFSBucket(db, { bucketName: 'submissions' });
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const results = await bucket
    .find({ _id: new ObjectId(id) })
    .toArray();
  const result = results[0];
  return bucket.openDownloadStreamByName(result.filename);
};

module.exports = {
  AssignmentSchema,
  SubmissionSchema,
  insertNewAssignment,
  getAssignmentById,
  getAssignmentsByCourseId,
  updateAssignmentById,
  deleteAssignmentById,
  insertNewSubmission,
  getSubmissionsPageByAssignmentId,
  addSubmissionUrl,
  getDownloadStreamById,
};
