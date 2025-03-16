const validateAddress = (address) => {
  console.log("Received address:", address); // Debugging line

  const newAddress = JSON.parse(address);
  console.log(newAddress);
  // Check if the address is an object and not null
  if (!newAddress || typeof newAddress !== "object") {
    return "Address must be a valid object";
  }

  // Destructure fields with default empty strings to prevent undefined errors
  const {
    landmark = "",
    city = "",
    state = "",
    address: addr = "",
    country = "",
  } = newAddress;

  console.log(landmark);
  console.log(city);
  console.log(state);
  console.log(addr);
  console.log(country);

  if (!landmark.trim()) {
    return "Landmark must be required";
  }

  if (!city.trim()) {
    return "City must be required";
  }

  if (!state.trim()) {
    return "State must be required";
  }

  if (!addr.trim()) {
    return "Address must be required";
  }

  if (!country.trim()) {
    return "Country must be required";
  }

  return null;
};

module.exports = validateAddress;
