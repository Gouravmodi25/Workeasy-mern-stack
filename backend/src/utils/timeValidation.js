const timeValidation = (time) => {
  const timeRegex = /^(0[1-9]|1[0-2]):([0-5][0-9])\s?(AM|PM)$/i;

  if (!time.match(timeRegex)) {
    return "Time is not valid. Please write time in 12-hour format with AM and PM.";
  }

  const [, hour, minutes, period] = time.match(timeRegex);

  console.log(hour, minutes, period);

  // Convert hours into 24-hour format
  let hours = parseInt(hour, 10);

  if (period.toUpperCase() === "PM" && hours !== 12) {
    hours += 12;
  }

  if (period.toUpperCase() === "AM" && hours === 12) {
    hours = 0;
  }

  if (hours < 9 || hours >= 21) {
    return "Time is not valid. Please select time between 9 AM to 9 PM.";
  }

  const now = new Date();
  const givenTime = new Date();
  givenTime.setHours(hours, parseInt(minutes, 10), 0, 0);

  if (givenTime < now) {
    return "Time is not valid. Past times are not acceptable.";
  }

  return null;
};

module.exports = timeValidation;
