const fs = require('fs');
const speech = require('@google-cloud/speech');
const axios = require('axios');

const client = new speech.SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

async function transcribeRecording(recordingUrl) {
  try {
    console.log(`Downloading audio from: ${recordingUrl}.mp3`);

    // Download MP3 from Twilio
    const audioRes = await axios.get(`${recordingUrl}.mp3`, {
      responseType: 'arraybuffer',
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN
      }
    });

    const audioBytes = audioRes.data.toString('base64');

    // Correct config for Twilio MP3 call audio
    const request = {
      audio: { content: audioBytes },
      config: {
        encoding: 'MP3',
        sampleRateHertz: 8000,
        audioChannelCount: 1,
        enableAutomaticPunctuation: true,
        languageCode: 'en-IN', // English-India
        alternativeLanguageCodes: ['hi-IN'] // Hindi fallback
      }
    };

    const [response] = await client.recognize(request);

    console.log('Full Google STT response:', JSON.stringify(response, null, 2));

    const transcript = response.results
      .map(r => r.alternatives[0]?.transcript || '')
      .join('\n')
      .trim();

    return transcript;
  } catch (err) {
    console.error('STT Error:', err);
    throw err;
  }
}

module.exports = { transcribeRecording };
