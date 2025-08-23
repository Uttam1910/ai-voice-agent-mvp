const axios = require('axios');

async function sendPamphletMessage(phoneNumber, name) {
  const url = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const data = {
    messaging_product: "whatsapp",
    to: phoneNumber.replace('+', ''), // remove '+' for WhatsApp API
    type: "text",
    text: {
      body: `Hello ${name || ''}, As discussed, here is our pamphlet: [link]`
    }
  };

  try {
    const res = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    return {
      status: res.data.messages?.[0]?.status || "sent",
      id: res.data.messages?.[0]?.id || null
    };
  } catch (err) {
    console.error('WhatsApp send error:', err.response?.data || err.message);
    return { status: "error", id: null };
  }
}

module.exports = { sendPamphletMessage };
