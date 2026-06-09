const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { transcribeAudio } = require('../services/whisper');

const router = express.Router();

// 임시 파일 저장 설정
const upload = multer({
  dest: '/tmp/voice-blog/',
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB (Whisper 제한)
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/flac'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(mp3|mp4|wav|webm|ogg|m4a|flac|mpeg|mpga)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다.'));
    }
  },
});

// POST /api/transcribe
router.post('/', authMiddleware, upload.single('audio'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: '음성 파일이 필요합니다.' });
  }

  const tempPath = req.file.path;

  try {
    const transcript = await transcribeAudio(tempPath, req.file.mimetype, req.file.originalname);
    res.json({ transcript });
  } catch (err) {
    next(err);
  } finally {
    // 임시 파일 삭제
    fs.unlink(tempPath, () => {});
  }
});

module.exports = router;
