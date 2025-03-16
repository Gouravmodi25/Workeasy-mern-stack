const { v2 } = require("cloudinary");
const cloudinary = v2;
require("dotenv").config({ path: "./.env" });
const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const uploadOnCLoudinary = async function (localFilePath) {
  console.log(localFilePath);
  try {
    if (!localFilePath) {
      return null;
    }

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("FIle upload on Cloudinary", response);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.log("Error in uploadOnCloudinary", error);
    fs.unlinkSync(localFilePath);
    return null;
  }
};

module.exports = uploadOnCLoudinary;
