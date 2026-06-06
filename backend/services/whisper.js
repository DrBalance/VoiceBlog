const OpenAI = require('openai');
const fs = require('fs');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * 음성 파일을 텍스트로 변환 (Whisper API)
 * @param {string} filePath - 임시 저장된 파일 경로
 * @param {string} mimeType - 파일 MIME 타입
 * @returns {Promise<string>} 변환된 텍스트
 */
async function transcribeAudio(filePath, mimeType) {
  const fileStream = fs.createReadStream(filePath);

  const transcription = await openai.audio.transcriptions.create({
    file: fileStream,
    model: 'whisper-1',
    language: 'ko',
    response_format: 'text',
  });

  return transcription;
}

module.exports = { transcribeAudio };
