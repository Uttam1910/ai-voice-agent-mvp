const express = require('express');
const router = express.Router();
const client = require('../services/twilioClient');
const db = require('../services/db');
// const { transcribeRecording } = require('../services/stt');
const { decideInterest } = require('../services/geminiClient'); 
const { sendPamphletMessage } = require('../services/whatsapp');
const { transcribeRecording } = require('../services/transcribe');

const FROM = process.env.TWILIO_FROM_NUMBER;
const BASE_URL = process.env.BASE_URL;


if (!FROM) console.warn("⚠️ TWILIO_FROM_NUMBER is missing in .env");
if (!BASE_URL) console.warn("⚠️ BASE_URL is missing in .env");

// ========================
// 1) MAKE A CALL
// ========================
router.post('/make', async (req, res) => {
  try {
    const { to, name } = req.body;
    if (!to) return res.status(400).json({ error: 'Recipient phone number is required' });

    const twimlUrl = `${BASE_URL}/calls/voice?name=${encodeURIComponent(name || '')}`;

    const call = await client.calls.create({
      url: twimlUrl,
      to,
      from: FROM,
    });

    await db.execute(
      `INSERT INTO calls (call_sid, phone_number) VALUES (?, ?)`,
      [call.sid, to]
    );

    res.json({ success: true, callSid: call.sid });
  } catch (err) {
    console.error("❌ Error making call:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// 2) VOICE HANDLER (Twilio → Us)
// ========================
router.all('/voice', (req, res) => {
  const name = req.query.name || '';
  const greeting = `Namaste! Main Fibre Bond Industries se bol raha hoon. Kya aap humein apna pamphlet bhejne ki anumati dete hain?`;

  const responseTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="hi-IN">${greeting}</Say>
  <Record action="${BASE_URL}/calls/recordingWebhook" method="POST" maxLength="7" playBeep="true" trim="do-not-trim"/>
  <Say>Thank you. Goodbye.</Say>
</Response>`;

  res.set('Content-Type', 'text/xml');
  res.status(200).send(responseTwiml);
});




// ========================
// 3) RECORDING WEBHOOK
// ========================

router.post('/recordingWebhook', async (req, res) => {
  const recordingUrl = req.body.RecordingUrl;
  const callSid = req.body.CallSid;
  const caller = req.body.From;

  console.log('🎤 Recording received:', { callSid, caller, recordingUrl });

  if (!recordingUrl) {
    console.error("❌ No Recording URL provided by Twilio");
    return res.type('text/xml').send('<Response></Response>');
  }

  try {
    // Save recording URL in DB
    await db.execute(
      `UPDATE calls SET recording_url = ? WHERE call_sid = ?`,
      [recordingUrl, callSid]
    );

    // 🔥 Transcribe immediately
    const transcript = await transcribeRecording(recordingUrl);
    console.log("📝 Transcript:", transcript);

    // (Optional) Save transcript in DB right away
    await db.execute(
      `UPDATE calls SET transcript = ? WHERE call_sid = ?`,
      [transcript, callSid]
    );

  } catch (err) {
    console.error("❌ Error during recording processing:", err);
  }

  res.type('text/xml').send('<Response></Response>');
});


// ========================
// 4) PROCESS CALL
// ========================
// 4) Process a finished call by callSid
router.post('/process/:callSid', async (req, res) => {
  const { callSid } = req.params;
  try {
    // 1. Fetch call record
    const [rows] = await db.execute(`SELECT * FROM calls WHERE call_sid = ?`, [callSid]);
    if (!rows.length) return res.status(404).json({ error: 'Call not found' });
    const call = rows[0];
    if (!call.recording_url) return res.status(400).json({ error: 'No recording yet' });

    // 2. Transcribe
    const transcript = await transcribeRecording(call.recording_url);

    // 3. Decide interest via Gemini
    const interested = await decideInterest(transcript);

    // 4. Update DB
    await db.execute(
      `UPDATE calls SET transcript = ?, interested = ? WHERE call_sid = ?`,
      [transcript, interested ? 1 : 0, callSid]
    );

    let waResult = null;
    if (interested) {
      // Example: we use the same phone_number stored earlier
      waResult = await sendPamphletMessage(call.phone_number, 'Customer');
      await db.execute(
        `INSERT INTO whatsapp_logs (phone_number, message, status, provider_message_id)
         VALUES (?, ?, ?, ?)`,
        [call.phone_number, `Pamphlet sent for call ${callSid}`, waResult.status, waResult.id]
      );
    }

    res.json({
      callSid,
      transcript,
      interested,
      whatsapp: waResult
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
