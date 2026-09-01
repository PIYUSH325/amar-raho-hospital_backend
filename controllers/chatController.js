const Message = require('../models/Message');
const axios = require('axios');
const path = require('path');

exports.uploadChatMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const mimetype = req.file.mimetype;

    let fileType = 'document';
    if (mimetype.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
      fileType = 'image';
    } else if (mimetype.startsWith('audio/') || ['.webm', '.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext)) {
      fileType = 'audio';
    } else if (mimetype.startsWith('video/') || ['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
      fileType = 'video';
    }

    // Format file size nicely
    const bytes = req.file.size;
    let fileSizeStr = '';
    if (bytes < 1024) fileSizeStr = `${bytes} B`;
    else if (bytes < 1024 * 1024) fileSizeStr = `${(bytes / 1024).toFixed(1)} KB`;
    else fileSizeStr = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

    const fileUrl = `/uploads/chat_media/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileType,
        fileSize: fileSizeStr,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    next(error);
  }
};

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
