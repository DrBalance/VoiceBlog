const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * MIME 타입에서 확장자 추출
 */
function getExtFromMime(mimeType) {
  const map = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'audio/m4a': 'm4a',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
  };
  return map[mimeType] || 'm4a';
}

/**
 * 음성 파일을 텍스트로 변환 (Whisper API)
 * @param {string} filePath - 임시 저장된 파일 경로
 * @param {string} mimeType - 파일 MIME 타입
 * @param {string} originalName - 원본 파일명
 * @returns {Promise<string>} 변환된 텍스트
 */
async function transcribeAudio(filePath, mimeType, originalName) {
  // 원본 파일명에서 확장자 추출, 없으면 MIME 타입으로 추출
  const ext = path.extname(originalName || '').slice(1) || getExtFromMime(mimeType);
  const fileWithExt = `${filePath}.${ext}`;

  // 확장자 있는 파일명으로 복사
  fs.copyFileSync(filePath, fileWithExt);

  try {
    const fileStream = fs.createReadStream(fileWithExt);

    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      language: 'ko',
      response_format: 'text',
    });

    return transcription;
  } finally {
    // 임시 파일 삭제
    fs.unlink(fileWithExt, () => {});
  }
}

module.exports = { transcribeAudio };
