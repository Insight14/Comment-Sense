import { classifyComments } from './classifier.js';

const API_KEY = "AIzaSyAViwc7XutypO8dWr5V38T9DnfxWwm5TZ0"; // paste your real key
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24; // 24 hours

async function fetchComments(videoId) {
  const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&order=relevance&key=${API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.items) return [];

  return data.items.map(item => ({
    textOriginal: item.snippet.topLevelComment.snippet.textOriginal,
    likeCount: item.snippet.topLevelComment.snippet.likeCount
  }));
}

async function getScoresForVideo(videoId) {
  const cacheKey = `scores_${videoId}`;
  const cached = await chrome.storage.local.get(cacheKey);

  if (cached[cacheKey] && (Date.now() - cached[cacheKey].timestamp < CACHE_DURATION_MS)) {
    return cached[cacheKey].scores;
  }

  const comments = await fetchComments(videoId);
  const scores = classifyComments(comments);

  await chrome.storage.local.set({
    [cacheKey]: { scores, timestamp: Date.now() }
  });

  return scores;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RANK_VIDEOS") {
    (async () => {
      const results = [];
      for (const video of message.videos) {
        const scores = await getScoresForVideo(video.videoId);
        results.push({ ...video, scores });
      }
      sendResponse({ results });
    })();
    return true; // keep the message channel open for async response
  }
});

console.log("Comment Sense: background script loaded");