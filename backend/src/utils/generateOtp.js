// generate otp for verification
function generateOtp() {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp;
}

module.exports = generateOtp;
