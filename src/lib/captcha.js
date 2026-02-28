import axios from "axios";

export async function verifyCaptcha(token) {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
        // If no secret key is provided, bypass captcha for development purposes
        console.warn("No RECAPTCHA_SECRET_KEY found. Bypassing captcha verification.");
        return true;
    }

    try {
        const response = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`
        );
        return response.data.success;
    } catch (error) {
        console.error("Captcha verification error:", error);
        return false;
    }
}
