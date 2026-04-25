const express = require('express')
const app = express();
const PORT = 8080;

const unlockedPosts = [];

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/profile", (req, res) => {
  res.render("layout", {
    userName: "Nina",
    currentPage: "profile"
  });
});

app.get("/", (req, res) => {
  const prompts = [
  {
    question: "What do you think about ads on social media?",
    postTitle: "Ads are making social media feel less human",
    postAuthor: "Nina",
    postText:
      "I feel like every platform slowly turns into an ad machine. At first it feels like a place to connect, then suddenly every few posts are sponsored, recommended, or trying to sell me something.",
    action: "/answer",
  },
  {
    question: "Do you think long lines in public spaces are acceptable?",
    postTitle: "The line at Worcester Commons was ridiculous today",
    postAuthor: "StudentUser23",
    postText:
      "I waited so long just to get food that I almost gave up. I get that places get busy, but at some point it feels like the system just is not built for the amount of people using it.",
    action: "/answer",
  },
  {
    question: "Should apps limit screen time by default?",
    postTitle: "Apps know exactly how to keep us scrolling",
    postAuthor: "Maya",
    postText:
      "I think apps should have stronger default screen time limits. Most people do not open an app planning to lose an hour, but the design makes it really easy to keep going.",
    action: "/answer",
  }
];
  // later populate this with db 

  res.render("layout", {
    userName: "Nina",
    currentPage: "newsfeed",
    prompts,
    unlockedPosts
  });
});

app.post("/answer/:id", (req, res) => {
  const id = parseInt(req.params.id);

  if (!unlockedPosts.includes(id)) {
    unlockedPosts.push(id);
  }

  res.redirect("/");
});


app.post("/reset", (req, res) => {
  unlockedPosts.length = 0;
  res.redirect("/");
});

app.listen(PORT, () => {
    console.log("running at 8080")
})