require("dotenv").config();

const admin = require("firebase-admin");

const serviceAccount = require("./firebase_key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://reflect-cb8fd.firebasestorage.app",
});

const db = admin.firestore();
const bucket = admin.storage().bucket();
const express = require("express");
const app = express();
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());

const PORT = 8080;

const unlockedPosts = new Set();

// ------------ Set up Oauth -------------

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:8080/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const uid = profile.id;

        const userRef = db.collection("users").doc(uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
          await userRef.set({
            uid,
            name: profile.displayName,
            email: profile.emails?.[0]?.value || "",
            avatar: profile.photos?.[0]?.value || "/images/default.jpg",
            pronouns: "",
            createdAt: new Date().toLocaleString(),
          });
        }

        return done(null, {
          uid,
          name: profile.displayName,
          email: profile.emails?.[0]?.value || "",
          avatar: profile.photos?.[0]?.value || "/images/default.jpg",
        });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.uid);
});

passport.deserializeUser(async (uid, done) => {
  try {
    const userSnap = await db.collection("users").doc(uid).get();

    if (!userSnap.exists) {
      return done(null, false);
    }

    done(null, {
      uid: userSnap.id,
      ...userSnap.data(),
    });
  } catch (err) {
    done(err, null);
  }
});

function requireAuth(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.redirect("/signin");
  }

  next();
}

// --------------- Sign in Routes ------------

app.get("/signin", (req, res) => {
  res.render("login", {
    error: null,
  });
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/signin",
  }),
  (req, res) => {
    res.redirect("/profile");
  }
);

app.post("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/signin");
  });
});

app.get("/signup", (req, res) => {
  res.render("signup", { error: null });
});

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render("signup", { error: "Missing fields" });
  }

  try {
    // check if user exists
    const snapshot = await db
      .collection("users")
      .where("email", "==", email)
      .get();

    if (!snapshot.empty) {
      return res.render("signup", { error: "User already exists" });
    }

    // create user
    const newUser = {
      email,
      password, // ⚠️ plain text for now (fix later)
      createdAt: new Date(),
    };

    const docRef = await db.collection("users").add(newUser);

    // simple session (adjust based on your auth system)
    req.session.userId = docRef.id;

    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.render("signup", { error: "Signup failed" });
  }
});

app.use((req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  return res.redirect("/signin");
});



// ---------- Upload Route ------------ //

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

app.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).send("No file uploaded");
    }

    const fileName = `posts/${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    blobStream.on("error", (err) => {
      console.error(err);
      res.status(500).send("Upload error");
    });

    blobStream.on("finish", async () => {
      // Make public
      await fileUpload.makePublic();

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      res.json({ imageUrl: publicUrl, imagePath: fileName });
    });

    blobStream.end(file.buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong");
  }
});

// --------- Pages Routes --------------//

app.get("/profile", async (req, res) => {
  const currentUser = req.user.uid;
  const usersSnapshot = await db.collection("users").get();
  const postsSnapshot = await db
    .collection("posts")
    .where("postUid", "==", currentUser)
    .orderBy("createdAt", "desc")
    .get();

  const userInfo = usersSnapshot.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  }));

  const prompts = postsSnapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      postId: doc.id,
      ...data,
      createdAt: data.createdAt ? data.createdAt.toDate().toLocaleString() : "",
    };
  });

  console.log("The prompts are", prompts)
  res.render("layout", {
    currentPage: "profile",
    currentUser,
    userInfo,
    prompts,
    answers: {},
  });
});

app.get("/posts/:postId/comments", async (req, res) => {
  const currentUser = req.user.uid;
  const { postId } = req.params;

  const usersSnapshot = await db.collection("users").get();

  const userInfo = usersSnapshot.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  }));
  const commentsSnapshot = await db
    .collection("posts")
    .doc(postId)
    .collection("comments")
    .orderBy("createdAt", "asc")
    .get();

  const comments = commentsSnapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      commentId: doc.id,
      ...data,
      createdAt: data.createdAt ? data.createdAt.toDate().toLocaleString() : "",
    };
  });

  res.render("components/commentsList", {
    comments,
    userInfo,
  });
});

// app.get("/seed", async (req, res) => {
//   try {
//     const batch = db.batch();

//     // ===== USERS =====
//     const userInfo = [
//       {
//         uid: "u1",
//         name: "Nina",
//         pronouns: "she/her",
//         avatar: "/images/nina.jpg",
//       },
//       {
//         uid: "u2",
//         name: "StudentUser23",
//         pronouns: "he/him",
//         avatar: "/images/student.jpg",
//       },
//       {
//         uid: "u3",
//         name: "Maya",
//         pronouns: "she/her",
//         avatar: "/images/maya.jpg",
//       },
//     ];

//     userInfo.forEach(user => {
//       const ref = db.collection("users").doc(user.uid);
//       batch.set(ref, {
//         name: user.name,
//         pronouns: user.pronouns,
//         avatar: user.avatar,
//         createdAt: admin.firestore.FieldValue.serverTimestamp(),
//       });
//     });

//     // ===== POSTS =====
//     const prompts = [
//       {
//         postId: "p1",
//         question: "What do you think about ads on social media?",
//         postTitle: "Ads are making social media feel less human",
//         postUid: "u1",
//         postText: "I feel like every platform slowly turns into an ad machine...",
//         comments: [
//           { uid: "u1", text: "Yeah, it feels like the actual people are buried under sponsored posts." },
//           { uid: "u2", text: "I honestly stopped noticing ads because there are so many now." },
//           { uid: "u3", text: "The worst is when the ad looks like a normal post." }
//         ],
//       },
//       {
//         postId: "p2",
//         question: "Do you think long lines in public spaces are acceptable?",
//         postTitle: "The line at Worcester Commons was ridiculous today",
//         postUid: "u2",
//         postText: "I waited so long just to get food that I almost gave up...",
//         comments: [
//           { uid: "u1", text: "Worcester gets so packed during lunch, it is actually wild." },
//           { uid: "u2", text: "I feel like they need better traffic flow or more stations open." },
//           { uid: "u3", text: "Sometimes the line looks worse than it actually is, but today was bad." }
//         ],
//       },
//       {
//         postId: "p3",
//         question: "Should apps limit screen time by default?",
//         postTitle: "Apps know exactly how to keep us scrolling",
//         postUid: "u3",
//         postText: "I think apps should have stronger default screen time limits...",
//         comments: [
//           { uid: "u1", text: "Default limits would help because most people never change settings." },
//           { uid: "u2", text: "I agree, but I also feel like people should still be able to override it." },
//           { uid: "u3", text: "Infinite scroll is the real villain here." }
//         ],
//       }
//     ];

//     // Create posts
//     for (const post of prompts) {
//       const postRef = db.collection("posts").doc(post.postId);

//       batch.set(postRef, {
//         question: post.question,
//         postTitle: post.postTitle,
//         postUid: post.postUid,
//         postText: post.postText,
//         createdAt: admin.firestore.FieldValue.serverTimestamp(),
//       });

//       // comments subcollection
//       post.comments.forEach((comment, index) => {
//         const commentRef = postRef
//           .collection("comments")
//           .doc(`c${index + 1}`);

//         batch.set(commentRef, {
//           uid: comment.uid,
//           text: comment.text,
//           createdAt: admin.firestore.FieldValue.serverTimestamp(),
//         });
//       });
//     }

//     await batch.commit();

//     res.send("Database seeded successfully 🚀");
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error seeding database");
//   }
// });

// later populate this with db

app.get("/", async (req, res) => {
  const currentUser = req.user.uid;
  try {
    // ===== fetch users =====
    const usersSnapshot = await db.collection("users").get();
    const userInfo = usersSnapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    // ===== fetch posts =====
    const postsSnapshot = await db.collection("posts").get();

    const prompts = [];
    const unlockedPosts = [];
    const answers = {};

    for (const doc of postsSnapshot.docs) {
      const postId = doc.id;
      const postData = doc.data();

      const createdAtRaw = postData.createdAt;

      // check if current user answered
      const answerDoc = await db
        .collection("posts")
        .doc(postId)
        .collection("answers")
        .doc(currentUser)
        .get();

      if (answerDoc.exists) {
        unlockedPosts.push(postId);
        answers[postId] = answerDoc.data().answer;
      }

      prompts.push({
        postId,
        ...postData,

        // keep raw timestamp for sorting
        createdAtRaw,

        // formatted for UI
        createdAt: createdAtRaw ? createdAtRaw.toDate().toLocaleString() : "",
      });
    }

    // sort using raw timestamp (important)
    prompts.sort((a, b) => {
      const aTime = a.createdAtRaw?.toMillis?.() || 0;
      const bTime = b.createdAtRaw?.toMillis?.() || 0;
      return bTime - aTime;
    });

    res.render("layout", {
      userName: userInfo.find((u) => u.uid === currentUser)?.name || "User",
      currentPage: "newsfeed",
      prompts,
      unlockedPosts,
      answers,
      userInfo,
      currentUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading feed");
  }
});

app.post("/answer/:postId", async (req, res) => {
  const currentUser = req.user.uid;
  try {
    const postId = req.params.postId;
    const answer = req.body.answer;

    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return res.status(404).send("Post not found");
    }

    await postRef
      .collection("answers")
      .doc(currentUser)
      .set({
        uid: currentUser,
        answer,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    const post = {
      postId: postDoc.id,
      ...postDoc.data(),
    };

    const commentsSnapshot = await postRef
      .collection("comments")
      .get();

    const comments = commentsSnapshot.docs.map(doc => ({
      commentId: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.().toLocaleString() || "",
    }));

    // ===== fetch users =====
    const usersSnapshot = await db.collection("users").get();
    const userInfo = usersSnapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));
    
    res.render("components/postCard", {
      postId: post.postId,
      postTitle: post.postTitle,
      postAuthor: post.postAuthor,
      postText: post.postText,
      postUid: post.postUid,
      createdAt: post.createdAt?.toDate?.().toLocaleString() || "",
      comments,
      userPromptAnswer: answer,
      userInfo,
      currentUser,
      imageUrl: post.imageUrl
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving answer");
  }
});

app.post("/post", upload.single("image"), async (req, res) => {
  const currentUser = req.user.uid;
  try {
    const { question, postTitle, postText } = req.body;

    let imageUrl = null;
    let imagePath = null;

    if (req.file) {
      const fileName = `posts/${Date.now()}_${req.file.originalname}`;
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      await fileUpload.makePublic();

      imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      imagePath = fileName;
    }

    await db.collection("posts").add({
      question,
      postTitle,
      postText,
      postUid: currentUser,
      imageUrl,
      imagePath,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating post");
  }
});

app.post("/reset", async (req, res) => {
  try {
    const postsSnapshot = await db.collection("posts").get();

    for (const postDoc of postsSnapshot.docs) {
      const answersSnapshot = await postDoc.ref.collection("answers").get();

      const batch = db.batch();

      answersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    }

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error resetting");
  }
});

app.post("/comment/:postId", async (req, res) => {
  console.log("im posting comment");

  try {
    const currentUser = req.user.uid;
    const { postId } = req.params;
    const { uid, text } = req.body;

    if (!uid || !text) {
      return res.status(400).json({ error: "Missing uid or text" });
    }

    const commentData = {
      uid,
      text,
      createdAt: new Date(), // store as Date (Firestore Timestamp)
    };

    const commentRef = await db
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .add(commentData);

    // return formatted version for UI
    res.json({
      commentId: commentRef.id,
      ...commentData,
      createdAt: commentData.createdAt.toLocaleString(),
    });

  } catch (err) {
    console.error("Error saving comment:", err);
    res.status(500).json({ error: "Failed to save comment" });
  }
});

app.listen(PORT, () => {
  console.log("running at 8080");
});
