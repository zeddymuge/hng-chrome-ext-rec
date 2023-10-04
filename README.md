# Project README

## Description

This project is a video streaming and transcription service built with Node.js, Express, Socket.io, AWS SDK, and AWS Transcribe. It allows users to upload video files, stream them in real-time, and transcribe the audio content using AWS Transcribe.

## Getting Started

These instructions will help you set up and run the project on your local machine.

### Prerequisites

Before you begin, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v14.0.0 or higher)
- [npm](https://www.npmjs.com/) (v6.0.0 or higher)
- [AWS CLI](https://aws.amazon.com/cli/) (for AWS credentials configuration)

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/your-username/your-project.git
    cd your-project
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Create a `.env` file in the project root and add your AWS credentials:

    ```env
    AWS_ACCESS_KEY_ID=your-access-key-id
    AWS_SECRET_ACCESS_KEY=your-secret-access-key
    S3_BUCKET=your-s3-bucket-name
    S3_REGION=your-s3-region
    ```

### Running the Application

Start the server:

```bash
npm start
```

The server will be running at [http://localhost:3009](http://localhost:3009).

## Usage

1. **Upload a Video:**

    - Make a `POST` request to `/api/upload` endpoint with a video file attached.

    ```bash
    curl -X POST -F "video=@path/to/your/video.mp4" http://localhost:3009/api/upload
    ```

2. **List Available Videos:**

    - Access [http://localhost:3009/api/videos](http://localhost:3009/api/videos) to get a list of available videos.

3. **Play a Video:**

    - Access [http://localhost:3009/api/play/{videoKey}](http://localhost:3009/api/play/{videoKey}) to stream and play a specific video.

4. **Real-time Streaming and Transcription:**

    - Connect to the Socket.io endpoint [http://localhost:3009](http://localhost:3009) to start real-time video streaming.

    - Emit a `start-streaming` event with the video filename to begin streaming.

    ```javascript
    socket.emit('start-streaming', 'your-video-filename.mp4');
    ```

    - Emit a `stop-streaming` event to stop streaming.

    ```javascript
    socket.emit('stop-streaming');
    ```

## Contributing

If you would like to contribute to the project, please follow the [Contribution Guidelines](CONTRIBUTING.md).

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
