require('dotenv').config();

const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

const app = express();

// Configure AWS S3
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION;

console.log('AWS_BUCKET_NAME:', process.env.AWS_BUCKET_NAME || 'Not defined');
console.log('AWS_REGION:', process.env.AWS_REGION || 'Not defined');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID || 'Not defined');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY || 'Not defined');

// Initialize S3 client
const s3 = new AWS.S3({
  region: S3_REGION,
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
});

// Configure multer for S3 upload
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: S3_BUCKET,
    acl: 'public-read',
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + '-' + file.originalname);
    },
  }),
});

app.post('/api/upload', upload.single('video'), (req, res) => {
    console.log('Inside upload endpoint');
    
    if (!req.file) {
      console.log('No file received');
      return res.status(401).json({ message: 'Please upload a video file' });
    }
  
    const videoFilename = req.file.originalname;
    const s3Url = generateS3Url(S3_BUCKET, videoFilename);
  
    console.log('File uploaded successfully');
    return res.status(202).json({
      video_name: videoFilename,
      url: s3Url,
    });
  });
  

// Handle video playback
app.get('/api/play/:video_filename', (req, res) => {
  const videoFilename = req.params.video_filename;
  const s3Url = generateS3Url(S3_BUCKET, videoFilename);

  return res.status(200).json({
    video_name: videoFilename,
    url: s3Url,
  });
});

function generateS3Url(bucket, key) {
  const s3Url = `https://${bucket}.s3.amazonaws.com/${key}`;
  return s3Url;
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
