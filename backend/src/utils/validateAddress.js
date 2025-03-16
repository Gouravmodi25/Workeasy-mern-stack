const validateAddress = (address) => {
  if (!address || typeof address === "object") {
    return "Address must be type of object  ";
  }

  const { landmark, city, state, address: addr, country } = address;

  if (!landmark || typeof landmark === "string") {
    return "Landmark must be required";
  }

  if (!city || typeof city === "string") {
    return "City must be required";
  }

  if (!state || typeof state === "string") {
    return "State must be required";
  }

  if (!addr || typeof addr === "string") {
    return "Address must be required";
  }

  if (!country || typeof country === "string") {
    return "Country must be required";
  }

  return null;
};
