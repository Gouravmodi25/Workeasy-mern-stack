const validator = require("validator");

const validateDateOfBirth = (dob) => {
  if (!dob) {
    return "Date of birth is required";
  }

  if (!validator.isDate(dob, { format: "YYYY-MM-DD", strictMode: true })) {
    return "Invalid Date of Birth format. Use YYYY-MM-DD";
  }

  const dateOfBirth = new Date(dob);
  const currentDate = new Date();

  if (dateOfBirth > currentDate) {
    return "Date of birth  cannot be future date";
  }

  // Calculate age
  let age = currentDate.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = currentDate.getMonth() - dateOfBirth.getMonth();
  const dayDiff = currentDate.getDate() - dateOfBirth.getDate();

  // Adjust age if the current month/day hasn't reached the birth month/day yet
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }
  console.log(age);
  //   check dob is greater than 18 or not

  if (age < 18) {
    return "You must be at least 18 years old";
  }

  if (age > 120) {
    return "Invalid Date of Birth, age seems unrealistic";
  }
  return null;
};

module.exports = validateDateOfBirth;
