import express from "express";
import { User } from "../model/users.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

const router = express.Router();

const jwtSecret = process.env.JWT_SECRET;

// signup route
router.post("/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    if (!firstName || !lastName || !email || !password || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const isUserExist = await User.findOne({ email });
    if (isUserExist) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
    });
    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      jwtSecret,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, { httpOnly: true, maxAge: 60 * 60 * 1000 });

    return res
      .status(201)
      .json({ message: "User registered successfully", newUser, token });
  } catch (error) {
    console.error("Error in signup:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// login route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, jwtSecret, {
      expiresIn: "1h",
    });

    res.cookie("token", token, { httpOnly: true, maxAge: 60 * 60 * 1000 });

    return res.status(200).json({ message: "Login successful", user, token });
  } catch (error) {
    console.error("Error in login:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// logout route
router.post("/logout", (req, res) => {
  try {
    res.clearCookie("token");
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Error in logout:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ message: "User with this email does not exist" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      htm: `<p>You requested a password reset. Click <a href="${resetUrl}">here</a> to reset your password. This link is valid for 5 minutes.</p>`,
    });

    return res
      .status(200)
      .json({ message: "Password reset email sent successfully" });
  } catch (error) {
    console.error("Error in forgot-password:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired password reset token" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Error in reset-password:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
