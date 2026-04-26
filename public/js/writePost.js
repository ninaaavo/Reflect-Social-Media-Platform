function openWritePost() {
  document.getElementById("writePostOverlay").classList.remove("hidden");
}

function closeWritePost(event) {
  if (event && event.target.id !== "writePostOverlay") return;
  document.getElementById("writePostOverlay").classList.add("hidden");
}
