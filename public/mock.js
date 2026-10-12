// Offline stand in for Jev so the demo runs without a key. Clearly flagged as mock in the UI.
// Shared by server.js (require) and the static GitHub Pages build (script tag).
(function (root) {
  function mockAnswer(email) {
    const t = `${email.from} ${email.subject} ${email.body}`.toLowerCase();
    const has = (...w) => w.some((x) => t.includes(x));
    let category = "Other";
    if (has("verify", "suspicious", "security", "revocation", "sign-in", "password", "access key")) category = "Security";
    else if (has("disabled", "outage", "ticket", "failed", "error", "alert", "broken")) category = "Support";
    else if (has("invoice", "payment", "received", "renew", "receipt", "payout", "subscription")) category = "Finance";
    else if (has("ordered", "shipped", "delivery", "your order", "package")) category = "Shopping";
    else if (has("% off", "sale", "deal", "launch", "offer", "back the campaign", "promo", "factory", "rank #1", "introducing")) category = "Marketing";
    else if (has("what's new", "what is new", "newsletter", "digest", "curated")) category = "Newsletter";
    else if (has("invite", "invited", "webinar", "meeting", "calendar", "rsvp", "accepted", "flight", "event")) category = "Events";
    else if (has("report", "usage", "analytics", "terms", "doc", "review", "mentioned you", "recording")) category = "Work";
    else if (has("forum", "community", "moderator", "replied to your", "reactions", "notifications")) category = "Social";
    const human = has("?", "can you", "let me know", "re:", "following up") && !has("noreply", "no-reply");
    const high = ["Security", "Support"].includes(category) || has("urgent", "important", "asap", "action required");
    const s = high ? 2 : human || has("renew", "failed") ? 1 : 0;
    const probs = [0.05, 0.05, 0.05];
    probs[s] = 0.85;
    probs[(s + 1) % 3] = 0.1;
    const scam = has("verify your password", "gift card", "suspended", "factory", "guaranteed");
    const spamP = scam ? 0.75 + Math.random() * 0.2 : category === "Marketing" ? 0.35 + Math.random() * 0.35 : Math.random() * 0.15;
    const replyP = human ? 0.45 + Math.random() * 0.45 : Math.random() * 0.1;
    return {
      model: "mock",
      mock: true,
      retries: 0,
      answers: {
        category: { type: "choice", choice: category, confidence: 0.8 },
        priority: { type: "score", score: s, probabilities: { 0: probs[0], 1: probs[1], 2: probs[2] }, confidence: 0.85 },
        spam: { type: "noul", noul: spamP },
        reply: { type: "noul", noul: replyP },
      },
      usage: { input_tokens: 420 + Math.floor(t.length / 4), output_tokens: 24 },
    };
  }
  // Pretend network time, so the mock run looks like a run. Not a measurement of Jev.
  function mockLatency() {
    return 300 + Math.random() * 500;
  }
  const api = { mockAnswer, mockLatency };
  if (typeof module !== "undefined") module.exports = api;
  else root.JevMock = api;
})(this);
