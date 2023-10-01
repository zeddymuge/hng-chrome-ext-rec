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

// Initialize AWS S3 client
AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: S3_REGION,
});

// Configure multer for S3 upload
const upload = multer({
  storage: multerS3({
    s3: new AWS.S3(),
    bucket: S3_BUCKET,
    acl: 'public-read',
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + '-' + file.originalname);
    },
  }),
}).single('video');

// Initialize AWS Transcribe
const transcribeService = new AWS.TranscribeService();

async function transcribeVideo(jobName, mediaFileUri) {
  try {
    const params = {
      TranscriptionJobName: jobName,
      Media: {
        MediaFileUri: mediaFileUri,
      },
      OutputBucketName: S3_BUCKET,
    };

    const transcriptionJob = await transcribeService.startTranscriptionJob(params).promise();

    console.log('Transcription job started:', transcriptionJob);

    return transcriptionJob;
  } catch (error) {
    console.error('Error starting transcription job:', error);
    throw error;
  }
}

app.post('/api/upload', upload, (req, res) => {
  console.log('Inside upload endpoint');

  if (!req.file) {
    console.log('No file received');
    return res.status(401).json({ message: 'Please upload a video file' });
  }

  const videoFilename = req.file.originalname;

  console.log('File uploaded successfully');
  return res.status(202).json({
    video_name: videoFilename,
  });
});

app.get('/api/video-info/:video_filename', (req, res) => {
  const videoFilename = req.params.video_filename;

  console.log('Video information retrieved successfully');
  return res.status(200).json({
    video_name: videoFilename,
  });
});

app.get('/api/transcribe/:video_filename', async (req, res) => {
  const videoFilename = req.params.video_filename;

  try {
    const jobName = `TranscriptionJob_${Date.now()}`;
    const mediaFileUri = `s3://${S3_BUCKET}/${videoFilename}`;

    // Start transcription job
    const transcriptionJob = await transcribeVideo(jobName, mediaFileUri);

    return res.status(200).json({
      job_name: transcriptionJob.TranscriptionJobName,
      status: transcriptionJob.TranscriptionJobStatus,
    });
  } catch (error) {
    console.error('Error transcribing video:', error);
    return res.status(500).json({ error: 'Error transcribing video' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
