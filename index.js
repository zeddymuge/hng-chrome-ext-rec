require('dotenv').config();

const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const openai = require('openai');

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
// const s3 = new AWS.S3({
//   region: S3_REGION,
//   accessKeyId: AWS_ACCESS_KEY_ID,
//   secretAccessKey: AWS_SECRET_ACCESS_KEY,
// });
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.S3_REGION,
});

// Configure multer for S3 upload
const upload = multer({
  storage: multerS3({
    s3: new AWS.S3(),  // Make sure this is correctly configured
    bucket: S3_BUCKET,
    acl: 'public-read',
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + '-' + file.originalname);
    },
  }),
});
// Set OpenAI API Key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('OpenAI API key is missing. Please set OPENAI_API_KEY in your environment.');
  process.exit(1); // Exit the application if the API key is missing
}

openai.apiKey = OPENAI_API_KEY;

// Function to transcribe code using OpenAI Whisper
async function transcribeCode(code) {
  try {
    if (!openai.Completion) {
      console.error('OpenAI module is not properly initialized.');
      return;
    }

    const response = await openai.Completion.create({
      engine: 'text-davinci-002',
      prompt: code,
      max_tokens: 100,
    });

    const transcription = response.choices[0].text.trim();
    return transcription;
  } catch (error) {
    console.error('Error transcribing code:', error);
    throw error;
  }
}


app.post('/api/upload', upload.single('video'), async (req, res) => {
  console.log('Inside upload endpoint');

  if (!req.file) {
    console.log('No file received');
    return res.status(401).json({ message: 'Please upload a video file' });
  }

  const videoFilename = req.file.originalname;
  const s3Url = generateS3Url(S3_BUCKET, videoFilename);

  // Get the content of the video (assuming it contains code)
  const videoContent = '...'; // Fetch video content from S3 or wherever

  // Transcribe the code
  const transcribedCode = await transcribeCode(videoContent);

  console.log('File uploaded successfully');
  return res.status(202).json({
    video_name: videoFilename,
    url: s3Url,
    transcribed_code: transcribedCode,
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
