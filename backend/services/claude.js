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
  const { tone = 'informative', imageCount = 3, customSystemPrompt } = options;
  const toneInstruction = customSystemPrompt || TONE_PROMPTS[tone] || TONE_PROMPTS.informative;

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
- **볼드(**텍스트**)는 절대 최소한으로 사용**: 문단 전체나 긴 문장에 볼드 금지. 반드시 강조가 필요한 핵심 단어 1~2개에만 사용. 볼드 없이도 자연스러운 글이 되도록 작성.

Markdown 본문만 출력하세요. 부가 설명 없이 바로 # 제목부터 시작하세요.`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].text;
}

/**
 * 블로그 마크다운을 받아 네이버/인스타 해시태그 생성
 * @param {string} markdown - 블로그 글 마크다운
 * @returns {Promise<{ naver: string[], instagram: string[] }>}
 */
async function generateHashtags(markdown) {
  const prompt = `다음 블로그 글을 분석해서 해시태그를 생성해주세요.

[블로그 글]
${markdown.slice(0, 2000)}

아래 JSON 형식으로만 응답하세요. 설명이나 마크다운 없이 JSON만 출력:
{
  "naver": ["키워드1", "키워드2", ...],
  "instagram": ["keyword1", "키워드2", ...]
}

규칙:
- naver: 10~15개, 한글 키워드 중심, # 기호 없이 단어만
- instagram: 20~30개, 영문+한글 혼합, # 기호 없이 단어만
- 블로그 주제와 직접 관련된 키워드 우선
- 검색량이 많을 것 같은 실용적 키워드 선택`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    const text = message.content[0].text.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { naver: [], instagram: [] };
  }
}

/**
 * 예시 글을 분석해서 커스텀 스타일 생성
 * @param {string} exampleText - 사용자가 입력한 예시 글 (최대 1,000자)
 * @returns {Promise<{ name: string, description: string, systemPrompt: string }>}
 */
async function analyzeStyle(exampleText) {
  const prompt = `다음 예시 글의 문체와 어조를 분석해서 블로그 글쓰기 스타일을 정의해주세요.

[예시 글]
${exampleText}

아래 JSON 형식으로만 응답하세요. 설명이나 마크다운 없이 JSON만 출력:
{
  "name": "스타일 이름 (10자 이내, 예: 감성 일기체)",
  "description": "스타일 한 줄 설명 (30자 이내)",
  "systemPrompt": "이 스타일로 블로그 글을 쓸 때 Claude에게 전달할 상세 지침 (문체, 어조, 문장 길이, 특징적 표현 방식 등을 구체적으로 기술)"
}`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    const text = message.content[0].text.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return {
      name: '커스텀 스타일',
      description: '사용자 정의 스타일',
      systemPrompt: '사용자가 제공한 예시 글의 문체와 어조를 따라 작성해주세요.',
    };
  }
}

module.exports = { generateBlogPost, generateHashtags, analyzeStyle };
