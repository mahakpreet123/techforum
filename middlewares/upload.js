const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function(req, file, callback) {
        const filetypes = /image\/png|image\/jpeg|image\/jpg|image\/gif|image\/bmp|image\/webp|image\/avif/;
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype) {
            callback(null, true); // Allow file upload
        } else {
            console.log("File Not Supported");
            callback(null, false); // Reject file upload
        }
    }
});
module.exports = upload;