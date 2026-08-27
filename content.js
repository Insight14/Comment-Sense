console.log("Comment Sense: content script loaded on", window.location.href);

const POSITIVE_CATEGORIES = ["confirmed_legit", "praised_clarity", "exam_success"];
const NEGATIVE_CATEGORIES = ["flagged_fake", "confusion", "accuracy_complaint"];

function computeRankScore(scores) {
  let rank = 0;
  for (const cat of POSITIVE_CATEGORIES) rank += scores[cat] || 0;
  for (const cat of NEGATIVE_CATEGORIES) rank -= scores[cat] || 0;
  return rank;
}

function extractVideoResults() {
  const videoElements = document.querySelectorAll('ytd-video-renderer');
  const results = [];

  videoElements.forEach((el) => {
    const linkEl = el.querySelector('a#thumbnail');
    const titleEl = el.querySelector('#video-title');

    if (!linkEl || !titleEl) return;

    const href = linkEl.getAttribute('href');
    if (!href || !href.includes('v=')) return;

    const videoId = new URLSearchParams(href.split('?')[1]).get('v');
    const title = titleEl.textContent.trim();

    results.push({ videoId, title });
  });

  return results;
}

function getVerdictLabel(video) {
  const s = video.scores || {};
  const entries = Object.entries(s).filter(([k]) => k !== "neutral");

  if (entries.length === 0) {
    return { label: "No strong signal", color: "#888" };
  }

  const [topCategory] = entries.sort((a, b) => b[1] - a[1])[0];

  const labels = {
    confirmed_legit: { label: "✅ Confirmed legit", color: "#4caf50" },
    flagged_fake: { label: "🚫 Flagged as fake/clickbait", color: "#e53935" },
    praised_clarity: { label: "👍 Praised for clarity", color: "#4caf50" },
    confusion: { label: "⚠️ Some viewers confused", color: "#fbc02d" },
    accuracy_complaint: { label: "❌ Accuracy complaints", color: "#e53935" },
    exam_success: { label: "🎓 Helped viewers pass exams", color: "#4caf50" },
  };

  return labels[topCategory] || { label: "No strong signal", color: "#888" };
}

function renderLoadingSidebar() {
  const existing = document.getElementById('comment-sense-panel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'comment-sense-panel';
  panel.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    width: 300px;
    background: #1f1f1f;
    color: #fff;
    border: 1px solid #444;
    border-radius: 10px;
    padding: 16px;
    z-index: 9999;
    font-family: Roboto, Arial, sans-serif;
    box-shadow: 0 2px 12px rgba(0,0,0,0.5);
    text-align: center;
  `;
      const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px;
    margin: -16px -16px 8px -16px;
    background: linear-gradient(120deg, #4285f4, #8e67c7, #d96570, #4285f4);
    background-size: 300% 300%;
    animation: cs-gradient-shift 6s ease infinite;
    border-radius: 10px 10px 0 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  `;
  header.innerHTML = `
    <img src="${chrome.runtime.getURL('icons/icon48.png')}" style="width: 22px; height: 22px; border-radius: 6px;" />
    <div style="font-weight: 700; font-size: 15px; color: #fff;">Comment Sense</div>
  `;
  panel.appendChild(header);

  const loadingText = document.createElement('div');
  loadingText.textContent = "Reading comments…";
  loadingText.style.cssText = "color: #aaa; font-size: 13px; text-align: center; margin-top: 4px;";
  panel.appendChild(loadingText);

  if (!document.getElementById('cs-gradient-style')) {
    const style = document.createElement('style');
    style.id = 'cs-gradient-style';
    style.textContent = `
      @keyframes cs-gradient-shift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
    document.head.appendChild(style);
  }
  document.body.appendChild(panel);
}

function renderSidebar(rankedVideos) {
  const existing = document.getElementById('comment-sense-panel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'comment-sense-panel';
  panel.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    width: 300px;
    max-height: 80vh;
    overflow-y: auto;
    background: #1f1f1f;
    color: #fff;
    border: 1px solid #444;
    border-radius: 10px;
    padding: 14px;
    z-index: 9999;
    font-family: Roboto, Arial, sans-serif;
    box-shadow: 0 2px 12px rgba(0,0,0,0.5);
  `;

      const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px 10px 16px;
    margin: -14px -14px 10px -14px;
    background: linear-gradient(120deg, #4285f4, #8e67c7, #d96570, #4285f4);
    background-size: 300% 300%;
    animation: cs-gradient-shift 6s ease infinite;
    border-radius: 10px 10px 0 0;
  `;
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <img src="${chrome.runtime.getURL('icons/icon48.png')}" style="width: 22px; height: 22px; border-radius: 6px;" />
      <span style="font-weight: 700; font-size: 15px; letter-spacing: 0.2px; color: #fff;">Comment Sense</span>
    </div>
    <span id="cs-toggle" style="cursor: pointer; font-size: 12px; color: rgba(255,255,255,0.85);">hide</span>
  `;
  panel.appendChild(header);

  const subtitle = document.createElement('div');
  subtitle.textContent = "Ranked by comment quality, not views";
  subtitle.style.cssText = `
    font-size: 11px;
    color: #999;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #333;
  `;
  panel.appendChild(subtitle);

  // Inject the keyframe animation once
  if (!document.getElementById('cs-gradient-style')) {
    const style = document.createElement('style');
    style.id = 'cs-gradient-style';
    style.textContent = `
      @keyframes cs-gradient-shift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
    document.head.appendChild(style);
  }

  const list = document.createElement('div');
  list.id = 'cs-list';

  rankedVideos.forEach((video, index) => {
    const verdict = getVerdictLabel(video);

    const item = document.createElement('div');
    item.style.cssText = `
      padding: 10px;
      margin-bottom: 8px;
      background: #2a2a2a;
      border-left: 4px solid ${verdict.color};
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.15s;
    `;
    item.onmouseenter = () => item.style.background = "#333";
    item.onmouseleave = () => item.style.background = "#2a2a2a";

    const shortTitle = video.title.length > 60
      ? video.title.slice(0, 60) + "…"
      : video.title;

    item.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px; line-height: 1.3;">#${index + 1} ${shortTitle}</div>
      <div style="color: ${verdict.color}; font-size: 11px;">${verdict.label}</div>
    `;
    item.addEventListener('click', () => {
      window.location.href = `https://www.youtube.com/watch?v=${video.videoId}`;
    });
    list.appendChild(item);
  });

  panel.appendChild(list);
  document.body.appendChild(panel);

  document.getElementById('cs-toggle').addEventListener('click', () => {
    const isHidden = list.style.display === 'none';
    list.style.display = isHidden ? 'block' : 'none';
    document.getElementById('cs-toggle').textContent = isHidden ? 'hide' : 'show';
  });
}

function waitForResultsAndExtract(retries = 10, delay = 500) {
  const videos = extractVideoResults();

  if (videos.length > 0) {
    console.log("Comment Sense: found videos", videos);

    chrome.runtime.sendMessage(
      { type: "RANK_VIDEOS", videos: videos },
      (response) => {
        console.log("Comment Sense: got ranked results", response.results);

        const rankedVideos = response.results
          .map(v => ({ ...v, rankScore: computeRankScore(v.scores) }))
          .sort((a, b) => b.rankScore - a.rankScore);

        renderSidebar(rankedVideos);
      }
    );
    renderLoadingSidebar();
    return;
  }

  if (retries > 0) {
    setTimeout(() => waitForResultsAndExtract(retries - 1, delay), delay);
  } else {
    console.log("Comment Sense: gave up, no videos found after retries");
  }
}

waitForResultsAndExtract();