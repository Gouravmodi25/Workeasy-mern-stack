const twilio = require("twilio");

const sendSms = async function (option) {
  try {
    const client = new twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      body: option.body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: option.to,
    });

    console.log("SMS sent Successfully");
  } catch (error) {
    console.log("Error While Sending Sms", error);
  }
};

module.exports = sendSms;
