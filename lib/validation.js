/*
 * Performs data validation on an object by verifying that it contains
 * all required fields specified in a given schema.
 *
 * Returns true if the object is valid agianst the schema and false otherwise.
 */
exports.validateAgainstSchema = (obj, schema) => (
  obj && Object.keys(schema).every(field => !schema[field].required || field in obj)
);
/*
 * Extracts all fields from an object that are valid according to a specified
 * schema.  Extracted fields can be either required or optional.
 *
 * Returns a new object containing all valid fields extracted from the
 * original object.
 */
exports.extractValidFields = (obj, schema) => {
  const validObj = {};
  Object.keys(schema).forEach((field) => {
    if (obj[field]) {
      validObj[field] = obj[field];
    }
  });
  return validObj;
};
