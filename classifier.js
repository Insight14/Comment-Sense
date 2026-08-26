// classifier.js

const CATEGORIES = {
  // Intent A: legitimacy/quality check (movies, "free download", pirated content)
  confirmed_legit: [
    "for uploading", "the real one", "works fine", "actual movie",
    "the actual", "legit", "not clickbait", "real deal", "thanks", "thank you"
  ],
  flagged_fake: [
    "clickbait", "click bait", "not the actual", "fake", "scam",
    "redirect", "virus", "malware", "waste of time", "wrong movie",
    "this isn't", "this isnt", "misleading", "trash", "doesn't work", "doesn't work", "does not work", "doesn't play",
  ],

  // Intent B: explainer/tutorial quality
  praised_clarity: [
    "best explanation", "cleared", "finally understood", "finally understand",
    "so clear", "goat", "easy to understand", "helped me a lot",
    "great explanation", "makes sense now", "explained well"
  ],
  confusion: [
    "confused", "don't understand", "dont understand", "still don't get",
    "still dont get", "can you explain", "didn't understand", "didnt understand",
    "lost me", "not clear", "confusing"
  ],
  accuracy_complaint: [
    "is wrong", "incorrect", "thats wrong", "that's wrong",
    "outdated", "mistake", "error in", "not correct"
  ],
  exam_success: [
    "helped me pass", "before my exam", "before my test", "exam tomorrow",
    "exam in", "cleared my exam", "passed because", "exam in 12 hours",
    "exam in", "test tomorrow"
  ]
};

function classifyComment(text) {
  const lower = text.toLowerCase();
  const matches = [];

  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(kw => lower.includes(kw))) {
      matches.push(category);
    }
  }

  return matches.length > 0 ? matches : ["neutral"];
}

function classifyComments(comments) {
  const scores = {};

  comments.forEach(comment => {
    const categories = classifyComment(comment.textOriginal);
    const weight = 1 + (comment.likeCount || 0);

    categories.forEach(category => {
      scores[category] = (scores[category] || 0) + weight;
    });
  });

  return scores;
}

const POSITIVE_CATEGORIES = ["confirmed_legit", "praised_clarity", "exam_success"];
const NEGATIVE_CATEGORIES = ["flagged_fake", "confusion", "accuracy_complaint"];

function computeRankScore(scores) {
  let rank = 0;
  for (const cat of POSITIVE_CATEGORIES) {
    rank += scores[cat] || 0;
  }
  for (const cat of NEGATIVE_CATEGORIES) {
    rank -= scores[cat] || 0;
  }
  return rank;
}

export { classifyComment, classifyComments, computeRankScore };