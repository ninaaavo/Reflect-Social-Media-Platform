function openWritePost() {
  document.getElementById("writePostOverlay").classList.remove("hidden");
}

function closeWritePost(event) {
  if (event && event.target.id !== "writePostOverlay") return;
  document.getElementById("writePostOverlay").classList.add("hidden");
}

function previewImage(event) {
  const file = event.target.files[0];
  const preview = document.getElementById("imagePreview");

  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.classList.remove("hidden");
  } else {
    preview.classList.add("hidden");
  }
}