const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TONE_PROMPTS = {
  informative: '객관적이고 전문적인 정보 전달 스타일로, 깔끔한 구조와 신뢰감 있는 어조로 작성해주세요.',
  friendly: '친근하고 따뜻한 구어체로, 이웃에게 이야기하듯 자연스러운 네이버 블로그 감성으로 작성해주세요.',
  expert: '권위 있는 전문가 어조로, 데이터와 근거를 중심으로 작성해주세요.',
  storytelling: '경험 중심의 감성적인 스토리텔링 방식으로 작성해주세요.',
};

/**
 * 텍스트(글감)를 받아 블로그 포스트 Markdown 생성
 * @param {string} transcript - STT 변환 텍스트
 * @param {object} options - { tone, imageCount, imageSource }
 * @returns {Promise<string>} Markdown 형식의 블로그 글
 */
async function generateBlogPost(transcript, options = {}) {
  const { tone = 'informative', imageCount = 3 } = options;
  const toneInstruction = TONE_PROMPTS[tone] || TONE_PROMPTS.informative;

  const prompt = `다음은 블로그 포스트의 글감입니다. 음성을 텍스트로 변환한 내용이므로 다소 구어체적이거나 정리가 덜 되어 있을 수 있습니다.

[글감]
${transcript}

위 글감을 바탕으로 네이버 블로그 포스트를 작성해주세요.

[작성 규칙]
- ${toneInstruction}
- Markdown 형식으로 작성
- 구조: # 제목, ## 소제목, 본문 단락
- 이미지는 총 ${imageCount}개가 들어갈 위치에 아래 형식으로 표시:
  ![이미지설명](IMAGE_PLACEHOLDER_1), ![이미지설명](IMAGE_PLACEHOLDER_2) ... 순서대로
- 이미지 위치는 내용 흐름상 자연스러운 곳에 배치
- 글 길이: 1500~2500자 내외
- 서론/본론/결론 구조 유지
- SEO를 고려한 자연스러운 키워드 포함

Markdown 본문만 출력하세요. 부가 설명 없이 바로 # 제목부터 시작하세요.`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].text;
}

module.exports = { generateBlogPost };
