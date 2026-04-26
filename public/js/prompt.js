document.addEventListener("submit", async (e) => {
  console.log("submit button hit")
  if (!e.target.classList.contains("answer-form")) return;

  e.preventDefault();

  const form = e.target;
  const action = form.dataset.action;
  const answer = form.querySelector("[name='answer']").value;

  const res = await fetch(action, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ answer })
  });

  const html = await res.text();

  const wrapper = form.closest(".prompt-card-wrapper");
  wrapper.outerHTML = html;
});
