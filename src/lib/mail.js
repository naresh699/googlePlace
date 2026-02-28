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
      <a href="${verificationUrl}" style="padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email</a>
      <p style="margin-top: 20px;">Or paste this link in your browser: <br>${verificationUrl}</p>
      <p style="margin-top: 20px; font-size: 0.8em; color: #666;">This link will expire in 24 hours.</p>
    `,
    };

    if (!process.env.EMAIL_SERVER_HOST) {
        console.log("\n--- EMAIL SIMULATION MODE ---");
        console.log(`To: ${email}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`Verification URL: ${verificationUrl}`);
        console.log("------------------------------\n");
        return { success: true, simulation: true, url: verificationUrl };
    }

    const port = parseInt(process.env.EMAIL_SERVER_PORT || "587");
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: port,
        secure: port === 465, // true for port 465, false for others
        auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
        },
        // For development/testing with self-signed certificates
        tls: {
            rejectUnauthorized: process.env.NODE_ENV === "production",
        },
    });

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: %s", info.messageId);
        return { success: true, simulation: false };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error: error.message };
    }
}
