import jwt from "jsonwebtoken";
const jwtSecret = process.env.JWT_SECRET;

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.token || "";
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Invalid token" });
      }
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error("Error in verifyToken middleware:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
