const express = require('express')

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
const PORT = 8080;

const unlockedPosts = [];
const answers = {}; 


app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());

app.get("/profile", (req, res) => {
  res.render("layout", {
    userName: "Nina",
    currentPage: "profile"
  });
});

const prompts = [
{
  question: "What do you think about ads on social media?",
  postTitle: "Ads are making social media feel less human",
  postAuthor: "Nina",
  postText:
    "I feel like every platform slowly turns into an ad machine. At first it feels like a place to connect, then suddenly every few posts are sponsored, recommended, or trying to sell me something.",
  comments: [
    "Yeah, it feels like the actual people are buried under sponsored posts.",
    "I honestly stopped noticing ads because there are so many now.",
    "The worst is when the ad looks like a normal post."
  ],
  action: "/answer",
},
{
  question: "Do you think long lines in public spaces are acceptable?",
  postTitle: "The line at Worcester Commons was ridiculous today",
  postAuthor: "StudentUser23",
  postText:
    "I waited so long just to get food that I almost gave up. I get that places get busy, but at some point it feels like the system just is not built for the amount of people using it.",
  comments: [
    "Worcester gets so packed during lunch, it is actually wild.",
    "I feel like they need better traffic flow or more stations open.",
    "Sometimes the line looks worse than it actually is, but today was bad."
  ],
  action: "/answer",
},
{
  question: "Should apps limit screen time by default?",
  postTitle: "Apps know exactly how to keep us scrolling",
  postAuthor: "Maya",
  postText:
    "I think apps should have stronger default screen time limits. Most people do not open an app planning to lose an hour, but the design makes it really easy to keep going.",
  comments: [
    "Default limits would help because most people never change settings.",
    "I agree, but I also feel like people should still be able to override it.",
    "Infinite scroll is the real villain here."
  ],
  action: "/answer",
}
];
// later populate this with db 
app.get("/", (req, res) => {

  res.render("layout", {
    userName: "Nina",
    currentPage: "newsfeed",
    prompts,
    unlockedPosts,
    answers
  });
});

app.post("/answer/:id", (req, res) => { 
  const id = parseInt(req.params.id);
  const answer = req.body.answer;

  if (!unlockedPosts.includes(id)) {
    unlockedPosts.push(id);
  }

  answers[id] = answer;

  const prompt = prompts[id]; 

  res.render("components/postCard", {
    postTitle: prompt.postTitle,
    postAuthor: prompt.postAuthor,
    postText: prompt.postText,
    comments: prompt.comments,
    userPromptAnswer: answer
  });
});

app.post("/reset", (req, res) => {
  unlockedPosts.length = 0;
  res.redirect("/");
});

app.listen(PORT, () => {
    console.log("running at 8080")
})