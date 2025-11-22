import multer from "multer";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = "./uploads/";

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }

    cb(null, folder);
  },

  filename: (req, file, cb) => {
    const fileName = `${Date.now()}-${file.originalname}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

export default upload;
