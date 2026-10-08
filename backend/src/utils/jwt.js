import jwt from "jsonwebtoken";
import env from "../config/env.js";

export const generateAccessToken = (admin) => {
  return jwt.sign(
    {
      sub: admin._id.toString(),
      username: admin.username,
      role: admin.role,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwtSecret);
};