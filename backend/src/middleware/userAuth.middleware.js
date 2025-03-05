const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler.js");
const ApiResponse = require("../utils/ApiResponse.js");
const UserModel = require("../model/user.model.js");

const userAuth = asyncHandler(async (req, res, next) => {
  const token = req.header("Authorization") || req.cookies?.accessToken;
  console.log(token);

  try {
    if (!token) {
      return res
        .status(401)
        .json(new ApiResponse(401, "Not Authorized Login Again"));
    }

    let decodedToken;

    try {
      decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
      return res
        .status(401)
        .json(
          new ApiResponse(401, "Invalid or expired token. Please log in again.")
        );
    }
    console.log(decodedToken.id);
    let loggedUser;

    try {
      loggedUser = await UserModel.findById(decodedToken.id).select(
        "-password"
      );
      console.log("loggedUser", loggedUser);
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
