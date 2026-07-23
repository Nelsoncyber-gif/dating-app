// AI Content Moderation Service
// Mock implementation — replace with your chosen provider (Hive Moderation, AWS Rekognition, OpenAI Moderation, etc.)

/**
 * Checks text content against a list of prohibited words.
 * In production, swap this with a call to Perspective API or OpenAI Moderation.
 * @param {string} text - The text to moderate
 * @returns {{ isSafe: boolean, reason: string|null }}
 */
async function moderateText(text) {
  const forbiddenWords = ['spam', 'abuse', 'scam'];
  const isFlagged = forbiddenWords.some(word => text.toLowerCase().includes(word));

  return {
    isSafe: !isFlagged,
    reason: isFlagged ? 'Contains prohibited content' : null,
  };
}

/**
 * Checks an image URL for NSFW/inappropriate content.
 * In production, swap with Hive Moderation or AWS Rekognition.
 * @param {string} imageUrl - The Cloudinary URL to check
 * @returns {{ isSafe: boolean, reason: string|null }}
 */
async function moderateImage(imageUrl) {
  // Mock: always passes. Replace with actual API call that returns NSFW/violence scores.
  return {
    isSafe: true,
    reason: null,
  };
}

module.exports = { moderateText, moderateImage };
