const validateGender = (gender) => {
  const validGenders = ["Male", "Female", "Transgender", "Other"];

  if (!gender || !validGenders.includes(gender)) {
    return "Gender must be valid";
  }

  return null;
};

module.exports = validateGender;
