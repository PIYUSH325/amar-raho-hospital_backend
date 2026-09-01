const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure 'uploads/chat_media' directory exists
const chatUploadDir = path.join(__dirname, '../uploads/chat_media');
if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
}

// Storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatUploadDir);
  },
  filename: (req, file, cb) => {
    // Generate clean safe filename with timestamp
    const ext = path.extname(file.originalname).toLowerCase() || (file.mimetype.includes('webm') ? '.webm' : file.mimetype.includes('mp3') ? '.mp3' : file.mimetype.includes('audio') ? '.webm' : '');
    const rawBase = path.basename(file.originalname, ext);
    const baseName = (rawBase || 'file').replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}-${baseName}${ext}`);
  }
});

// File validation
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    // Documents
    '.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx', '.xls', '.ppt', '.pptx',
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
    // Audio / Voice notes
    '.webm', '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.mp4a',
    // Video
    '.mp4', '.mov', '.avi', '.mkv'
  ];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type ${ext}. Upload documents, images, audio, or video files only.`), false);
  }
};

module.exports = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});
