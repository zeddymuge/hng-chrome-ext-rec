const express = require('express');
const http = require('http');
const multer = require('multer');
const AWS = require('aws-sdk');
const socketIo = require('socket.io');
const { PassThrough } = require('stream');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION;

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: S3_REGION,
});

const s3 = new AWS.S3();
const upload = multer();

let activeStreams = {};

// Function to wait for the transcription job to complete
async function waitForTranscriptionJobCompletion(jobName) {
  const transcribeService = new AWS.TranscribeService();

  while (true) {
    const { TranscriptionJob } = await transcribeService.getTranscriptionJob({ TranscriptionJobName: jobName }).promise();

    if (TranscriptionJob.TranscriptionJobStatus === 'COMPLETED') {
      return;
    } else if (TranscriptionJob.TranscriptionJobStatus === 'FAILED' || TranscriptionJob.TranscriptionJobStatus === 'CANCELLED') {
      throw new Error(`Transcription job failed or was cancelled: ${jobName}`);
    }

    // Wait for a few seconds before checking the status again
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

// Function to get the transcription result
async function getTranscriptionResult(jobName) {
  const transcribeService = new AWS.TranscribeService();

  const { TranscriptionJob } = await transcribeService.getTranscriptionJob({ TranscriptionJobName: jobName }).promise();

  if (TranscriptionJob.Transcript && TranscriptionJob.Transcript.TranscriptFileUri) {
    // Download the transcription result file
    const transcriptFile = await transcribeService
      .getTranscriptionJob(TranscriptionJob.Transcript.TranscriptFileUri)
      .promise();

    // Parse the result (you may need to adjust this based on the actual format)
    return JSON.parse(transcriptFile.Body.toString());
  }

  return null;
}

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('start-streaming', (videoFilename) => {
    console.log('Start streaming:', videoFilename);

    const params = {
      Bucket: S3_BUCKET,
      Key: videoFilename,
    };

    const stream = s3.getObject(params).createReadStream();

    activeStreams[socket.id] = stream;

    // Emit the video stream to the client
    stream.on('data', (chunk) => {
      socket.emit('stream', chunk);
    });

    stream.on('end', async () => {
      console.log('End of stream');
      const passThrough = new PassThrough();
      passThrough.end(); // End the stream to trigger transcription completion

      // Call your function to handle video parts and transcribe
      await processAndTranscribeVideo(passThrough, videoFilename);

      // Disconnect the client
      socket.disconnect(true);
    });

    stream.on('error', (error) => {
      console.error('Error streaming video:', error);
      socket.disconnect(true);
    });
  });

  socket.on('stop-streaming', () => {
    console.log('Stop streaming');
    const stream = activeStreams[socket.id];

    if (stream) {
      stream.removeAllListeners();
      delete activeStreams[socket.id];
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    const stream = activeStreams[socket.id];

    if (stream) {
      stream.removeAllListeners();
      delete activeStreams[socket.id];
    }
  });
});

app.post('/api/upload', upload.single('video'), async (req, res) => {
  console.log('Inside upload endpoint');

  if (!req.file) {
    console.log('No file received');
    return res.status(401).json({ message: 'Please upload a video file' });
  }

  const videoFilename = req.file.originalname;

  // Process and upload the video chunks to S3
  try {
    const params = {
      Bucket: S3_BUCKET,
      Key: videoFilename,
      Body: req.file.buffer,
    };

    await s3.upload(params).promise();

    console.log('File uploaded successfully');

    // Call your function to handle video parts and transcribe
    await processAndTranscribeVideo(req.file.buffer, videoFilename);

    res.status(201).json({ message: 'successfully uploaded video' });

  } catch (error) {
    console.error('Error uploading video chunk:', error);
    return res.status(500).json({ error: 'Error uploading video chunk' });
  }
});

async function processAndTranscribeVideo(videoBuffer, videoFilename) {
  const transcribeService = new AWS.TranscribeService();

  // Create a unique job name
  const jobName = `TranscriptionJob_${Date.now()}`;

  // Define the AWS Transcribe parameters
  const transcriptionParams = {
    TranscriptionJobName: jobName,
    LanguageCode: 'en-US', 
    MediaSampleRateHertz: 44100, 
    MediaFormat: 'webm', 
    Media: { MediaFileUri: videoBuffer.toString('base64') } 
  };

  try {
    // Start the transcription job
    const transcriptionJob = await transcribeService.startTranscriptionJob(transcriptionParams).promise();

    console.log('Transcription job started:', transcriptionJob);

    // Wait for the transcription job to complete
    await waitForTranscriptionJobCompletion(transcriptionJob.TranscriptionJobName);

    // Optionally, you can retrieve the transcript from the completed job
    const transcript = await getTranscriptionResult(transcriptionJob.TranscriptionJobName);

    console.log('Transcription complete:', transcript);

    // Handle the transcript as needed (store in the database, emit to clients, etc.)

  } catch (error) {
    console.error('Error transcribing video:', error);
    throw error;
  }
}

const PORT = process.env.PORT || 3009;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
