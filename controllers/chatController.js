const Message = require('../models/Message');
const axios = require('axios');

exports.getChatHistory = async (req, res, next) => {
  try {
    const partnerId = req.params.partnerId;
    const userId = req.user.id;

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: partnerId },
        { sender: partnerId, recipient: userId }
      ]
    }).sort({ createdAt: 1 });

    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

exports.getIceServers = async (req, res, next) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKeySid = process.env.TWILIO_API_KEY_SID;
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

    // Fallback to Google STUN if credentials are not configured yet
    if (!accountSid || !apiKeySid || !apiKeySecret) {
      console.warn("Twilio credentials missing. Falling back to default Google STUN server.");
      return res.json({
        success: true,
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
    }

    // Authenticate using Basic Auth (API Key SID + Secret encoded in Base64)
    const auth = Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString('base64');
    
    // Request temporary TURN tokens from Twilio Network Traversal API
    const twilioRes = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Tokens.json`,
      {},
      {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      }
    );

    if (twilioRes.data && twilioRes.data.ice_servers) {
      return res.json({
        success: true,
        iceServers: twilioRes.data.ice_servers
      });
    }

    res.json({
      success: true,
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
  } catch (error) {
    console.error("Twilio Token generation failed:", error.message);
    res.json({
      success: true,
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
  }
};
