const message = (fullname,) => {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #121212; margin: 0; padding: 0; color: #e0e0e0;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #1e1e1e; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <!-- Header -->
        <div style="padding: 20px; text-align: center; background-color: #333333; color: #ffffff;">
            <h2 style="margin: 0; font-size: 24px;">🔑 Password Changed Successfully!</h2>
        </div>
        <!-- Body -->
        <div style="padding: 20px; color: #e0e0e0;">
            <p style="font-size: 16px; margin: 0;">Hi <strong>${fullname}</strong>,</p>
            <p style="font-size: 16px; margin: 8px 0;">
                Your password has been successfully changed on <strong>WorkEasy</strong>.
            </p>
            <p style="font-size: 16px; margin: 8px 0;">
                If you did not request this change or suspect any unauthorized access, please contact our support team immediately.
            </p>
            <p style="font-size: 16px; margin: 8px 0;">
                For your security, we recommend changing your password periodically and ensuring it is strong and unique.
            </p>
            <p style="font-size: 16px; margin: 8px 0;">Stay secure,<br>The WorkEasy Team</p>
        </div>
        <!-- Footer -->
        <div style="background-color: #333333; padding: 10px; text-align: center;">
            <p style="font-size: 12px; color: #777777;">&copy; 2025 WorkEasy. All rights reserved.</p>
        </div>
    </div>
</div>

`;
};

module.exports = message;
