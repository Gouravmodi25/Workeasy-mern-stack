const validator = require("validator");
const dayjs = require("dayjs");

const dateValidation = (date) => {
  if (!validator.isDate(date, { format: "YYYY-MM-DD", strictMode: true })) {
    return "Date must be in YYYY-MM-DD format";
  }

  if (dayjs(date).isBefore(dayjs().format("YYYY-MM-DD"))) {
    return "Date must be in future not past";
  }

  if (dayjs(date).day() === 0) {
    return "Sunday is not available for booking";
  }

  return null;
};

module.exports = dateValidation;
