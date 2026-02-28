import nodemailer from "nodemailer";

export async function sendVerificationEmail(email, token) {
    const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/verify-email?token=${token}`;

    const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@example.com",
        to: email,
        subject: "Verify your email address",
        html: `
      <h2>Welcome!</h2>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>Or paste this link in your browser: <br>${verificationUrl}</p>
    `,
    };

    if (!process.env.EMAIL_SERVER_HOST) {
        console.log("=========================================");
        console.log("No EMAIL_SERVER_HOST defined. Simulation:");
        console.log(`Sending email to: ${email}`);
        console.log(`Verification URL: ${verificationUrl}`);
        console.log("=========================================");
        return true;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
        },
    });

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
}
