const multer = require("multer");

const storage = multer.memoryStorage();
const singleUpload = multer({ storage }).single("file");
const multipleUpload = multer({ storage }).array("files", 5);

module.exports = { singleUpload, multipleUpload };
