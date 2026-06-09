const fetch = require('node-fetch');

const UNSPLASH_API = 'https://api.unsplash.com';

/**
 * 블로그 내용 기반으로 Unsplash에서 이미지 검색
 * @param {string} blogContent - 블로그 Markdown 내용
 * @param {number} count - 가져올 이미지 수
 * @returns {Promise<Array<{url, thumbUrl, description, credit}>>}
 */
async function searchImages(blogContent, count = 3) {
  // 제목에서 키워드 추출 (첫 번째 # 줄)
  const titleMatch = blogContent.match(/^#\s+(.+)$/m);
  const keyword = titleMatch ? titleMatch[1].slice(0, 30) : 'lifestyle blog';

  const response = await fetch(
    `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(keyword)}&per_page=${count}&orientation=landscape`,
    {
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Unsplash API 오류: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const photos = data.results || [];

  if (photos.length === 0) {
    throw new Error('Unsplash 검색 결과가 없습니다.');
  }

  return photos.map((photo, i) => ({
    url: photo.urls.regular,
    thumbUrl: photo.urls.thumb,
    description: photo.alt_description || photo.description || `이미지 ${i + 1}`,
    credit: {
      name: photo.user.name,
      link: photo.user.links.html,
    },
    index: i + 1,
  }));
}

module.exports = { searchImages };
