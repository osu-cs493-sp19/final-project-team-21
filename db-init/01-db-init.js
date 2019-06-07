//TODO create an actual instructor and use its id in instructorId
const { insertedId } = db.courses.insertOne({
  subject: 'CS',
  number: 493,
  title: 'Cloud Application Development',
  term: 'sp19',
  instructorId: '123',
})
