const WorkerModel = require("../model/worker.model");
const ApiResponse = require("../utils/ApiResponse");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");

const workerAuth = asyncHandler(async function (req, res, next) {
  const token = req?.cookies?.accessToken;
  console.log(token);

  if (!token) {
    return res
      .status(401)
      .json(new ApiResponse(401, "Not Authorized Login Again"));
  }

  try {
    let decodedToken;

    try {
      decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
      return res
        .status(401)
        .json(
          new ApiResponse(
            401,
            "Invalid or expired token. Please log in again." || error?.message
          )
        );
    }

    console.log(decodedToken._id);

    let loggedWorker;

    try {
      loggedWorker = await WorkerModel.findById(decodedToken.id).select(
        "-password"
      );
      console.log("loggedUser", loggedUser);
    } catch (error) {
      return res
        .status(401)
        .json(
          new ApiResponse(
            401,
            "Error verifying token data. Please log in again." || error.message
          )
        );
    }

    req.worker = loggedWorker;
    next();
  } catch (error) {
    return res
      .status(401)
      .json(
        new ApiResponse(401, "Not Authorized Login Again" || error.message)
      );
  }
});

module.exports = workerAuth;
