const EmailMessage = (fullname, otp) => {
  return `
<div style="font-family: Arial, sans-serif; background-color: #121212; margin: 0; padding: 0; color: #e0e0e0;">
  <div style="max-width: 600px; margin: 20px auto; background-color: #1e1e1e; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
      <div style="padding: 20px; text-align: center; background-color: #333333;">
          <h2 style="margin: 0; font-size: 24px; color: #ffffff;">OTP Verification - WorkEasy</h2>
      </div>
      <div style="padding: 20px;">
          <p style="font-size: 16px; margin: 8px 0; color: #b0b0b0;">Hi <strong>${fullname}</strong>,</p>
          <p style="font-size: 16px; margin: 8px 0; color: #b0b0b0;">
              We received a request to verify your account on <strong>WorkEasy</strong>.
          </p>
          <p style="font-size: 16px; margin: 8px 0; color: #b0b0b0;">
              Please use the following OTP to complete your verification:
          </p>
          <div style="margin: 20px 0; text-align: center;">
              <span style="font-size: 32px; color: #00d1b2; background-color: #2a2a2a; padding: 10px 20px; border-radius: 5px;">
                 ${otp}
              </span>
          </div>
          <p style="font-size: 16px; margin: 8px 0; color: #b0b0b0;">
              This OTP is valid for 10 minutes. Please do not share it with anyone.
          </p>
          <p style="font-size: 16px; margin: 8px 0; color: #b0b0b0;">
              If you did not request this, please ignore this email or contact support immediately.
          </p>
          <p style="font-size: 16px; margin: 8px 0; color: #b0b0b0;">Best Regards,<br>The WorkEasy Team</p>
      </div>
      <div style="background-color: #333333; color: #777777; padding: 10px; text-align: center;">
          <p style="font-size: 12px;">&copy; 2025 WorkEasy. All rights reserved.</p>
      </div>
  </div>
</div>
`;
};

module.exports = EmailMessage;
