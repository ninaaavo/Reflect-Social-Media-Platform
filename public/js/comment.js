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
  console.log("send comment called");
  const card = button.closest(".post-card");
  const input = card.querySelector(".comment-input");
  const list = card.querySelector(".comments-list");

  const text = input.value.trim();
  if (!text) return;

  const comment = document.createElement("div");
  comment.className = "comment";
  comment.innerHTML = `<p>${text}</p>`;

  list.appendChild(comment);
  input.value = "";
}