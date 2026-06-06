const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * 블로그 내용 기반으로 이미지 프롬프트 생성 후 DALL·E로 이미지 생성
 * @param {string} blogContent - 블로그 Markdown 내용
 * @param {number} count - 생성할 이미지 수
 * @returns {Promise<Array<{url, description}>>}
 */
async function generateImages(blogContent, count = 3) {
  // 블로그 내용에서 이미지 플레이스홀더 설명 추출
  const placeholderRegex = /!\[([^\]]+)\]\(IMAGE_PLACEHOLDER_\d+\)/g;
  const descriptions = [];
  let match;
  while ((match = placeholderRegex.exec(blogContent)) !== null) {
    descriptions.push(match[1]);
  }

  const imageCount = Math.min(count, descriptions.length || count);
  const results = [];

  for (let i = 0; i < imageCount; i++) {
    const description = descriptions[i] || `블로그 포스트 관련 이미지 ${i + 1}`;
    const prompt = `블로그 포스트용 고품질 일러스트레이션. 주제: ${description}. 
    밝고 깔끔한 스타일, 텍스트 없음, 전문적인 블로그 이미지.`;

    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1792x1024',
        quality: 'standard',
      });

      results.push({
        url: response.data[0].url,
        description,
        index: i + 1,
      });
    } catch (err) {
      console.error(`이미지 ${i + 1} 생성 오류:`, err.message);
      results.push({ url: null, description, index: i + 1, error: err.message });
    }
  }

  return results;
}

module.exports = { generateImages };
