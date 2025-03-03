const { v2 } = require("cloudinary");
const ApiError = require("./ApiError.js");
const cloudinary = v2;
require("dotenv").config({ path: "./.env" });

// cloudinary.config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

// extract the public_id from the url
const extractPublicId = (imageUrl) => {
  const parts = url.split("/");
  const lastPart = parts[parts.length - 1];
  const publicId = lastPart.split(".")[0];
  return publicId;
};

// deleteOnCloudinary
const deleteOnCloudinary = async function (imageUrl) {
  try {
    const publicId = extractPublicId(imageUrl);

    const response = await cloudinary.uploader.destroy(publicId);

    if (response.result == "ok") {
      console.log("File deleted on Cloudinary");
    } else if (response.result == "not found") {
      console.log(
        "File not found on Cloudinary.Public id may be incorrect",
        publicId
      );
    } else {
      console.log("Error while destroying file on cloudinary", response);
    }
  } catch (error) {
    throw new ApiError(500, "failed to delete image on cloudinary");
  }
};

module.exports = deleteOnCloudinary;
