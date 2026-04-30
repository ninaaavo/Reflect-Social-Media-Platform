function toggleComments(button) {
  console.log("toggle comment called");

  const card = button.closest(".post-card");
  const section = card.querySelector(".comment-section");

  section.classList.toggle("hidden");
  button.classList.toggle("active");
}

function autoResize(el) {
  el.style.height = "36px";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";

  el.style.overflowY = el.scrollHeight > 120 ? "auto" : "hidden";
}

function toggleSave(btn) {
  btn.classList.toggle("active");
}

async function sendComment(button) {
  const card = button.closest(".post-card");
  const input = card.querySelector(".comment-input");
  const list = card.querySelector(".comments-list");

  const text = input.value.trim();
  if (!text) return;

  const postId = card.dataset.postId;
  const uid = window.currentUser;

  try {
    const response = await fetch(`/comment/${postId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uid,
        text,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save comment");
    }

    const savedComment = await response.json();

    const user = window.userInfo.find(user => user.uid === uid) || {
      name: "Unknown User",
      avatar: "/images/default.jpg",
    };

    const template = document.getElementById("comment-template");
    const newComment = template.content.firstElementChild.cloneNode(true);

    newComment.querySelector(".comment-avatar").src = user.avatar;
    newComment.querySelector(".comment-avatar").alt = user.name;
    newComment.querySelector(".comment-username").textContent = user.name;
    newComment.querySelector(".comment-text").textContent = savedComment.text;
    newComment.querySelector(".comment-time").textContent = savedComment.createdAt;

    const emptyMessage = list.querySelector(".no-comments");
    if (emptyMessage) emptyMessage.remove();

    list.appendChild(newComment);
    list.scrollTop = list.scrollHeight;

    input.value = "";
    autoResize(input);

  } catch (err) {
    console.error(err);
    alert("Could not send comment. Try again.");
  }
}