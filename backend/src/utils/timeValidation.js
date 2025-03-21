const timeValidation = (time) => {
  const timeRegex = /^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;

  if (!time.match(timeRegex)) {
    return "Time is not valid Please write time in 12 hours format with am and pm";
  }

  const [_, hour, minutes, period] = time.match(
    /^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i
  );

  //   convert hours into 24 hrs format

  let hours = parseInt(hour, 10);

  if (period.toUpperCase() == "PM" && hours !== 12) {
    hours += 12;
  }

  if (period.toUpperCase() == "AM" && hours == 12) {
    hours = 0;
  }

  if (hours <= 21 && hours >= 9) {
    return "Time is not valid Please select time between 9 AM to 9 PM";
  }
  return null;
};
