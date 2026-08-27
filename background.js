import { classifyComments } from './classifier.js';
import { classifyCommentsWithAI } from './ai-classifier.js';
import { API_KEY } from './config.js';

const CACHE_DURATION_MS = 1000 * 60 * 60 * 24;

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

function isAmbiguous(scores) {
  // "Ambiguous" = almost everything landed in neutral, or total signal is very low
  const nonNeutralTotal = Object.entries(scores)
    .filter(([k]) => k !== "neutral")
    .reduce((sum, [, v]) => sum + v, 0);

  return nonNeutralTotal < 5; // tune this threshold as you test
}

async function getScoresForVideo(videoId, videoTitle) {
  const cacheKey = `scores_${videoId}`;
  const cached = await chrome.storage.local.get(cacheKey);

  if (cached[cacheKey] && (Date.now() - cached[cacheKey].timestamp < CACHE_DURATION_MS)) {
    return cached[cacheKey].scores;
  }

  const comments = await fetchComments(videoId);
  let scores = classifyComments(comments);

  if (isAmbiguous(scores) && comments.length > 0) {
    try {
      const aiScores = await classifyCommentsWithAI(comments, videoTitle);
      scores = aiScores; // trust AI result when keyword result was weak
    } catch (err) {
      console.log("Comment Sense: AI classification failed, keeping keyword result", err);
      // fall back silently to the keyword scores already computed
    }
  }

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
        const scores = await getScoresForVideo(video.videoId, video.title);
        results.push({ ...video, scores });
      }
      sendResponse({ results });
    })();
    return true;
  }
});

console.log("Comment Sense: background script loaded");