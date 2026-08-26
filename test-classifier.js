// test-classifier.js
const { classifyComments } = require('./classifier');

const sampleComments = [
  { textOriginal: "U just make your audience hate you", likeCount: 40 },
  { textOriginal: "Where’s the rest of", likeCount: 10 },
  { textOriginal: "Thanks idol ❤ next po ❤❤❤❤", likeCount: 0 },
  { textOriginal: "Anyone with the rest of the episode or knows where to watch it?", likeCount: 3 },
  { textOriginal: "Trash", likeCount: 1 }
];

const result = classifyComments(sampleComments);
console.log(result);