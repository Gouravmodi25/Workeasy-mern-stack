const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler.js");
const ApiResponse = require("../utils/ApiResponse.js");
const UserModel = require("../models/User.js");

const userAuth = asyncHandler(async (req, _, next) => {
  const token = req.header("Authorization") || req.cookies?.access_token;

  try {
    if (!token) {
      return res
        .status(401)
        .json(new ApiResponse(401, "Not Authorized Login Again"));
    }

    let decodedToken;

    try {
      decodedToken = await jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (error) {
      return res
        .status(401)
        .json(
          new ApiResponse(401, "Invalid or expired token. Please log in again.")
        );
    }

    let loggedUser;

    try {
      loggedUser = await UserModel.findById(decodedToken._id).select(
        "-password"
      );
    } catch (error) {
      return res
        .status(401)
        .json(
          new ApiResponse(
            401,
            "Error verifying token data. Please log in again."
          )
        );
    }

    req.user = loggedUser;
    next();
  } catch (error) {
    return res
      .status(401)
      .json(new ApiResponse(401, "Not Authorized Login Again"));
  }
});

module.exports = userAuth;
