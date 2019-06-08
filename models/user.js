const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');

const { getDBReference } = require('../lib/mongo');
const { extractValidFields } = require('../lib/validation');
const { getCoursesByQuery } = require('../models/course');

const UserSchema = {
  name: { required: true },
  email: { required: true },
  password: { required: true },
  role: { required: true },
};

const insertNewUser = async (rawUser) => {
  const user = extractValidFields(rawUser, UserSchema);
  const passwordHash = await bcrypt.hash(user.password, 8);
  user.password = passwordHash;

  const db = getDBReference();
  const collection = db.collection('users');
  const result = await collection.insertOne(user);
  return result.insertedId;
};

const getUserByEmail = async (email) => {
  const db = getDBReference();
  const collection = db.collection('users');
  const results = await collection
    .find({ email })
    .toArray();
  return results[0];
};

const getUserById = async (id) => {
  const db = getDBReference();
  const collection = db.collection('users');
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const results = await collection
    .find({ _id: new ObjectId(id) })
    .toArray();
  return results[0];
};

const getUserDetailsById = async (id) => {
  const user = await getUserById(id);
  if (user) {
    let courses = [];
    if (user.role === 'instructor') {
      courses = await getCoursesByQuery({ instructorId: new ObjectId(id) });
    } else if (user.role === 'student') {
      courses = await getCoursesByQuery({ enrolled: new ObjectId(id) });
    }
    user.courses = [];
    courses.forEach((course) => {
      user.courses.push(course._id);
    });
  }
  return user;
};

const getUsersByQuery = async (query) => {
  const db = getDBReference();
  const collection = db.collection('users');
  const results = await collection
    .find(query)
    .toArray();
  return results;
};

const validateUser = async (email, password) => {
  const user = await getUserByEmail(email);
  const authenticated = user && await bcrypt.compare(password, user.password);
  return authenticated ? { id: user._id, role: user.role } : false;
};

module.exports = {
  UserSchema,
  insertNewUser,
  getUserByEmail,
  getUserDetailsById,
  getUsersByQuery,
  validateUser,
};
