const message = (fullname, email) => {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #007bff; color: #ffffff; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Welcome to WorkEasy!</h1>
        </div>
        <div style="padding: 20px;">
            <p style="font-size: 16px; color: #333333; line-height: 1.5;">
                Hi <strong>${fullname}</strong>,
            </p>
            <p style="font-size: 16px; color: #333333; line-height: 1.5;">
                Thank you for registering with <strong>WorkEasy</strong>! Your account has been successfully created.
            </p>
            <p style="font-size: 16px; color: #333333; line-height: 1.5;">
                Here are your details:
            </p>
            <ul style="font-size: 16px; color: #333333; line-height: 1.5;">
                <li><strong>Full Name:</strong> ${fullname}</li>
                <li><strong>Email:</strong>${email}</li>
            </ul>
            <p style="font-size: 16px; color: #333333; line-height: 1.5;">
                You can now log in and start exploring our platform.
            </p>
            <p style="font-size: 16px; color: #333333; line-height: 1.5;">
                If you have any questions or need assistance, feel free to reach out to our support team.
            </p>
            <p style="font-size: 16px; color: #007bff; line-height: 1.5;">
                Best Regards,<br>
                The WorkEasy Team
            </p>
        </div>
        <div style="background-color: #f4f4f4; color: #777777; padding: 10px; text-align: center;">
            <p style="font-size: 12px;">&copy; 2025 WorkEasy. All rights reserved.</p>
        </div>
    </div>
</div>
  `;
};

module.exports = message;
