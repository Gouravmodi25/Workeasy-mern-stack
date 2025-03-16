const multer = require("multer");
const path = require("path");

// Multer configuration for upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "../public/temp");
  },
  filename: (req, file, cb) => {
    const fileName = `${file.originalname}-${Date.now()}`;
    cb(null, fileName);
  },
});

// config the storage and limit of file size only 20MB
const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

module.exports = upload;
