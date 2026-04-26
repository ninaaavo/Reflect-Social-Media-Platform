const express = require('express');

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
const PORT = 8080;

const unlockedPosts = new Set();
const answers = {};

const currentUser = "u1";
const prompts = [
  {
    postId: "p1",
    question: "What do you think about ads on social media?",
    postTitle: "Ads are making social media feel less human",
    postUid: "u1",
    createdAt: "2026-04-25 4:30 PM",
    postText: "I feel like every platform slowly turns into an ad machine. At first it feels like a place to connect, then suddenly every few posts are sponsored, recommended, or trying to sell me something.",
    comments: [
      { uid: "u1", text: "Yeah, it feels like the actual people are buried under sponsored posts.", createdAt: "2026-04-25 4:35 PM" },
      { uid: "u2", text: "I honestly stopped noticing ads because there are so many now.", createdAt: "2026-04-25 4:37 PM" },
      { uid: "u3", text: "The worst is when the ad looks like a normal post.", createdAt: "2026-04-25 4:40 PM" }
    ],
    action: "/answer",
  },
  {
    postId: "p2",
    question: "Do you think long lines in public spaces are acceptable?",
    postTitle: "The line at Worcester Commons was ridiculous today",
    postUid: "u2",
    createdAt: "2026-04-25 3:15 PM",
    postText: "I waited so long just to get food that I almost gave up. I get that places get busy, but at some point it feels like the system just is not built for the amount of people using it.",
    comments: [
      { uid: "u1", text: "Worcester gets so packed during lunch, it is actually wild.", createdAt: "2026-04-25 3:20 PM" },
      { uid: "u2", text: "I feel like they need better traffic flow or more stations open.", createdAt: "2026-04-25 3:22 PM" },
      { uid: "u3", text: "Sometimes the line looks worse than it actually is, but today was bad.", createdAt: "2026-04-25 3:25 PM" }
    ],
    action: "/answer",
  },
  {
    postId: "p3",
    question: "Should apps limit screen time by default?",
    postTitle: "Apps know exactly how to keep us scrolling",
    postUid: "u3",
    createdAt: "2026-04-25 1:05 PM",
    postText: "I think apps should have stronger default screen time limits. Most people do not open an app planning to lose an hour, but the design makes it really easy to keep going.",
    comments: [
      { uid: "u1", text: "Default limits would help because most people never change settings.", createdAt: "2026-04-25 1:10 PM" },
      { uid: "u2", text: "I agree, but I also feel like people should still be able to override it.", createdAt: "2026-04-25 1:12 PM" },
      { uid: "u3", text: "Infinite scroll is the real villain here.", createdAt: "2026-04-25 1:14 PM" }
    ],
    action: "/answer",
  }
];
let nextPostId = prompts.length + 1;

const userInfo = [
  {
    uid: "u1",
    name: "Nina",
    avatar: "/images/nina.jpg",
  },
  {
    uid: "u2",
    name: "StudentUser23",
    avatar: "/images/student.jpg",
  },
  {
    uid: "u3",
    name: "Maya",
    avatar: "/images/maya.jpg",
  },
];

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());

app.get("/profile", (req, res) => {
  res.render("layout", {
    currentPage: "profile",
    currentUser,
    userInfo,
    answers,
    prompts
  });
});


// later populate this with db 
app.get("/", (req, res) => {
  console.log("unlocked post", unlockedPosts);
  console.log("prompts", prompts);
  res.render("layout", {
    userName: "Nina",
    currentPage: "newsfeed",
    prompts,
    unlockedPosts: Array.from(unlockedPosts),
    answers, 
    userInfo,
    currentUser
  });
});

app.post("/answer/:postId", (req, res) => { 
  const postId = req.params.postId;
  const answer = req.body.answer;

  const prompt = prompts.find(prompt => prompt.postId === postId);

  if (!prompt) {
    return res.status(404).send("Post not found");
  }

  unlockedPosts.add(postId);
  console.log("added stuff to unlocked post", unlockedPosts)
  answers[postId] = answer;

  res.render("components/postCard", {
    postId: prompt.postId,
    postTitle: prompt.postTitle,
    postAuthor: prompt.postAuthor,
    postText: prompt.postText,
    postUid: prompt.postUid,  
    createdAt: prompt.createdAt,
    comments: prompt.comments,
    userPromptAnswer: answer,
    userInfo,
    currentUser
  });
});

app.post("/post", (req, res) => {
  const { question, postTitle, postText } = req.body;

  const newPost = {
    postId: "p" + nextPostId++,
    question,
    postTitle,
    postText,
    postUid: currentUser,
    createdAt: new Date().toLocaleString(),
    comments: [],
    action: "/answer"
  };

  prompts.unshift(newPost);

  res.redirect("/profile");
});

app.post("/reset", (req, res) => {
  unlockedPosts.length = 0;
  res.redirect("/");
});

app.listen(PORT, () => {
    console.log("running at 8080")
})