db.users.createIndex({ 'email': 1 }, { unique: true })

const { insertedIds: insertedUserIds } = db.users.insertMany([
  {
    name: 'Jane Doe Admin',
    email: 'doejadm@oregonstate.edu',
    password: '$2a$08$Ztpw.e9eSP6fZGNDaKyqSebYcmSEdIW8pPsbjePs5lDb7MOMn1GVy',
    role: 'admin',
  },
  {
    name: 'Jane Doe Instructor',
    email: 'doejins@oregonstate.edu',
    password: '$2a$08$Ztpw.e9eSP6fZGNDaKyqSebYcmSEdIW8pPsbjePs5lDb7MOMn1GVy',
    role: 'instructor',
  },
  {
    name: 'Jane Doe Student',
    email: 'doejstu@oregonstate.edu',
    password: '$2a$08$Ztpw.e9eSP6fZGNDaKyqSebYcmSEdIW8pPsbjePs5lDb7MOMn1GVy',
    role: 'student',
  },
  {
    name: 'Another Student',
    email: 'studastu@oregonstate.edu',
    password: '$2a$08$Ztpw.e9eSP6fZGNDaKyqSebYcmSEdIW8pPsbjePs5lDb7MOMn1GVy',
    role: 'student',
  },
]);

const { insertedId: insertedCourseId } = db.courses.insertOne({
  subject: 'CS',
  number: 493,
  title: 'Cloud Application Development',
  term: 'sp19',
  instructorId: insertedUserIds[1],
  enrolled: [
    insertedUserIds[2],
    insertedUserIds[3],
  ]
});

db.assignments.insertOne({
  courseId: insertedCourseId,
  title: 'CS 493 Assignment 1',
  points: 100,
  due: '2019-06-14T17:00:00-07:00',
});
