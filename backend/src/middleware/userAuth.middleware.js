const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler.js");
const ApiResponse = require("../utils/ApiResponse.js");
const UserModel = require("../model/user.model.js");

const userAuth = asyncHandler(async (req, res, next) => {
  const token =
    req?.cookies?.accessToken ||
    (req?.headers["authorization"]?.startsWith("Bearer ")
      ? req.headers["authorization"].split(" ")[1]
      : null);

  if (!token) {
    return res
      .status(401)
      .json(new ApiResponse(401, "Not Authorized. Please log in again."));
  }

  try {
    // Verify the token
    const decodedToken = await jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );
    console.log("Decoded Token ID:", decodedToken.id);

    // Find the worker using the decoded ID
    const loggedUser = await UserModel.findById(decodedToken.id).select(
      "-password"
    );

    if (!loggedUser) {
      return res
        .status(401)
        .json(new ApiResponse(401, "User not found. Please log in again."));
    }

    console.log("Logged User:", loggedUser);

    // Attach the worker to the request object
    req.user = loggedUser;
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);

    // Handle expired token explicitly
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json(new ApiResponse(401, "Token expired. Please log in again."));
    }

    return res
      .status(401)
      .json(new ApiResponse(401, "Invalid token. Please log in again."));
  }
});

module.exports = userAuth;
