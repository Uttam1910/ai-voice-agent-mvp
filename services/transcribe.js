const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const axios = require('axios');
const speech = require('@google-cloud/speech');

const client = new speech.SpeechClient();

async function transcribeRecording(recordingUrl) {
  const mp3Path = 'temp.mp3';
  const wavPath = 'temp.wav';

  // download mp3
  const response = await axios({
    url: recordingUrl,
    method: 'GET',
    responseType: 'stream',
    auth: {
      username: process.env.TWILIO_ACCOUNT_SID,
      password: process.env.TWILIO_AUTH_TOKEN,
    },
  });
  await new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(mp3Path);
    response.data.pipe(stream);
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  // convert to wav
  await new Promise((resolve, reject) => {
    ffmpeg(mp3Path)
      .toFormat('wav')
      .audioCodec('pcm_s16le')
      .audioChannels(1)
      .audioFrequency(16000)
      .on('end', resolve)
      .on('error', reject)
      .save(wavPath);
  });

  // read wav
  const file = fs.readFileSync(wavPath);
  const audioBytes = file.toString('base64');

  const [responseSTT] = await client.recognize({
    audio: { content: audioBytes },
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
    },
  });

  const transcription =
    responseSTT.results
      .map((r) => r.alternatives[0].transcript)
      .join(' ')
      .trim();

  return transcription;
}

module.exports = { transcribeRecording };
