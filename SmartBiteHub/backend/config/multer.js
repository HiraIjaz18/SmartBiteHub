import multer from 'multer';
import path from 'path';

// Configure Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Files will be saved in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9); // Unique suffix
    const fileExtension = path.extname(file.originalname); // Get file extension
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension); // Unique filename
  },
});

// Configure File Filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif']; // Allowed file types
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error('Only image files (jpeg, png, jpg, gif) are allowed!'), false); // Reject the file
  }
};

// Configure Multer Middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  },
});

// Single File Upload Middleware
export const uploadSingle = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // File uploaded successfully
    const fileUrl = `http://localhost:4000/uploads/${req.file.filename}`;
    req.fileUrl = fileUrl; // Attach fileUrl to the request object
    next();
  });
};

// Multiple File Upload Middleware
export const uploadMultiple = (req, res, next) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    // Files uploaded successfully
    const fileUrls = req.files.map((file) => `http://localhost:4000/uploads/${file.filename}`);
    req.fileUrls = fileUrls; // Attach fileUrls to the request object
    next();
  });
};

export default upload;