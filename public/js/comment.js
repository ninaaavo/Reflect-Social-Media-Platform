function toggleComments(button) {
  console.log("toggle comment called");
  const card = button.closest(".post-card");
  const section = card.querySelector(".comment-section");

  section.classList.toggle("hidden");
  btn.classList.toggle("active");
}

function autoResize(el) {
  el.style.height = "36px";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";

  if (el.scrollHeight > 120) {
    el.style.overflowY = "auto";
  } else {
    el.style.overflowY = "hidden";
  }
}

function toggleSave(btn) {
  btn.classList.toggle("active");
}

function sendComment(button) {
  const card = button.closest(".post-card");
  const input = card.querySelector(".comment-input");
  const list = card.querySelector(".comments-list");

  const text = input.value.trim();
  if (!text) return;

  const uid = window.currentUser;

  const user = window.userInfo.find(user => user.uid === uid) || {
    name: "Unknown User",
    avatar: "/images/default.jpg"
  };

  const template = document.getElementById("comment-template");
  const newComment = template.content.firstElementChild.cloneNode(true);

  newComment.querySelector(".comment-avatar").src = user.avatar;
  newComment.querySelector(".comment-avatar").alt = user.name;
  newComment.querySelector(".comment-username").textContent = user.name;
  newComment.querySelector(".comment-text").textContent = text;

  const emptyMessage = list.querySelector(".no-comments");
  if (emptyMessage) emptyMessage.remove();

  list.appendChild(newComment);
  list.scrollTop = list.scrollHeight;
  input.value = "";
}