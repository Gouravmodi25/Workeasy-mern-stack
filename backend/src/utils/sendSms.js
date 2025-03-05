const twilio = require("twilio");

const sendSms = async function (option) {
  try {
    const { TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

    if (!TWILIO_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error("Missing Twilio credentials in environment variables.");
    }

    // Initialize Twilio client
    const client = new twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);

    // Send SMS
    const message = await client.messages.create({
      body: option.body,
      from: TWILIO_PHONE_NUMBER,
      to: option.to,
    });

    console.log("✅ SMS sent successfully:", message.sid);
  } catch (error) {
    console.log("Error While Sending Sms", error);
  }
};

module.exports = sendSms;
