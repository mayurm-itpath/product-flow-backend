import express from "express";
import multer from "multer";
import { User } from "../model/users.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinaryHelpers.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.patch(
  "/update-profile/:id",
  upload.single("profilePic"),
  verifyToken,
  async (req, res) => {
    try {
      const id = req.params.id;
      const { firstName, lastName, phone } = req.body;

      const updatedData = { firstName, lastName, phone };
      const profilePic = req.file;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (profilePic) {
        if (user.profilePicId) {
          await deleteFromCloudinary(user.profilePicId);

          const result = await uploadToCloudinary(profilePic.buffer, 'user_profiles');
          updatedData.profilePic = result.secure_url;
          updatedData.profilePicId = result.public_id;
        } else {
          const result = await uploadToCloudinary(profilePic.buffer, 'user_profiles');
          updatedData.profilePic = result.secure_url;
          updatedData.profilePicId = result.public_id;
        }
      }

      const updatedUser = await User.findByIdAndUpdate(id, updatedData, { new: true });

      return res.status(200).json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser._id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          phone: updatedUser.phone,
          profilePic: updatedUser.profilePic,
        },
      });
    } catch (error) {
      console.error("Error in update-profile:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
