const state = {
  userId: localStorage.getItem("clubConnectUserId"),
  dashboard: null,
  selectedFiles: [],
  showFavorites: false,
  selfieReferenceFile: null,
  selfiePreviewUrl: null,
  matchResults: []
};

const stats = document.querySelector("#stats");
const eventsGrid = document.querySelector("#eventsGrid");
const mediaGrid = document.querySelector("#mediaGrid");
const matchGrid = document.querySelector("#matchGrid");
const eventPicker = document.querySelector("#eventPicker");
const resultCount = document.querySelector("#resultCount");
const matchCount = document.querySelector("#matchCount");
const currentUserLabel = document.querySelector("#currentUserLabel");
const notificationsList = document.querySelector("#notificationsList");
const analyticsSummary = document.querySelector("#analyticsSummary");
const analyticsCharts = document.querySelector("#analyticsCharts");
const markReadButton = document.querySelector("#markReadButton");
const selfieInput = document.querySelector("#selfieInput");
const selfiePreview = document.querySelector("#selfiePreview");
const matchSelfieButton = document.querySelector("#matchSelfieButton");
const clearSelfieButton = document.querySelector("#clearSelfieButton");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const eventForm = document.querySelector("#eventForm");
const uploadForm = document.querySelector("#uploadForm");
const eventPanel = eventForm.closest(".panel");
const uploadPanel = uploadForm.closest(".panel");
const dropZone = document.querySelector("#dropZone");
const fileInput = document.querySelector("#fileInput");
const previewList = document.querySelector("#previewList");
const faceButton = document.querySelector("#faceButton");
const showFavoritesButton = document.querySelector("#showFavoritesButton");
const favoritesList = document.querySelector("#favoritesList");
const loginForm = document.querySelector("#loginForm");
const loginRole = document.querySelector("#loginRole");
const logoutButton = document.querySelector("#logoutButton");
const loginError = document.querySelector("#loginError");
const appMain = document.querySelector("#appMain");

async function api(path, options = {}) {
  const url = state.userId ? `${path}${path.includes("?") ? "&" : "?"}userId=${state.userId}` : path;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error(`Invalid JSON response from ${path}: ${text.slice(0, 200)}`);
    }
  }

  if (!response.ok) {
    throw new Error(data.message || response.statusText || "Request failed");
  }

  return data;
}

async function loadDashboard() {
  if (!state.userId) {
    showLoginScreen();
    return;
  }

  try {
    state.dashboard = await api("/api/dashboard");
    renderCurrentUser();
    const mediaList = state.showFavorites ? getFavorites() : state.dashboard.media;
    renderDashboard(mediaList);
    showApp();
  } catch (error) {
    showLoginScreen(error.message);
  }
}

function renderCurrentUser() {
  if (state.dashboard?.user) {
    currentUserLabel.textContent = `Signed in as ${state.dashboard.user.name} - ${state.dashboard.user.role}`;
  } else {
    currentUserLabel.textContent = "";
  }
}

let notificationPollInterval = null;

function showLoginScreen(message) {
  stopNotificationPolling();
  loginForm.classList.remove("hidden");
  logoutButton.classList.add("hidden");
  appMain.classList.add("hidden");
  if (message) {
    loginError.textContent = message;
    loginError.classList.remove("hidden");
  } else {
    loginError.classList.add("hidden");
  }
}

function updatePermissionUI() {
  uploadPanel.classList.remove("hidden");
  eventPanel.classList.remove("hidden");
}

function showApp() {
  loginForm.classList.add("hidden");
  logoutButton.classList.remove("hidden");
  appMain.classList.remove("hidden");
  loginError.classList.add("hidden");
  startNotificationPolling();
}

function startNotificationPolling() {
  if (notificationPollInterval) return;
  notificationPollInterval = setInterval(async () => {
    if (!state.userId) return;
    try {
      const previousNotifications = state.dashboard?.notifications?.map(n => n.id).join(",") || "";
      const previousCount = state.dashboard?.stats?.notifications || 0;
      const updatedDashboard = await api("/api/dashboard");
      const currentNotifications = updatedDashboard.notifications.map(n => n.id).join(",");
      const currentCount = updatedDashboard.stats.notifications;
      state.dashboard = updatedDashboard;
      if (previousNotifications !== currentNotifications || previousCount !== currentCount) {
        renderDashboard(state.showFavorites ? getFavorites() : state.dashboard.media);
      } else {
        renderNotifications();
        renderStats();
      }
    } catch (error) {
      console.warn("Notification poll failed:", error.message);
    }
  }, 5000);
}

function stopNotificationPolling() {
  if (!notificationPollInterval) return;
  clearInterval(notificationPollInterval);
  notificationPollInterval = null;
}

function renderDashboard(mediaItems) {
  renderStats();
  renderEvents();
  renderAnalytics();
  renderFavoritesPanel();
  renderMedia(mediaItems);
  renderMatchedPhotos();
  renderNotifications();
}

function renderAnalytics() {
  const analytics = state.dashboard.analytics || {};
  analyticsSummary.innerHTML = analytics.totalMedia == null
    ? `<div class="notification">Analytics not available yet.</div>`
    : [
        ["Total media", analytics.totalMedia],
        ["Total events", analytics.totalEvents],
        ["Total likes", analytics.totalLikes],
        ["Total comments", analytics.totalComments],
        ["Total favourites", analytics.totalFavorites]
      ].map(([label, value]) => `
        <div class="analytics-row">
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      `).join("");

  if (!analytics.topTags) {
    analyticsCharts.innerHTML = "";
    return;
  }

  const roleRows = Object.entries(analytics.uploadsByRole || {}).map(([role, count]) => `
    <div class="analytics-bar-row">
      <span>${role}</span>
      <span>${count}</span>
    </div>
  `).join("");

  const tagRows = (analytics.topTags || []).map(tag => `
    <div class="analytics-bar-row">
      <span>${tag.tag}</span>
      <span>${tag.count}</span>
    </div>
  `).join("");

  const contributorRows = (analytics.topContributors || []).map(contributor => `
    <div class="analytics-bar-row">
      <span>${contributor.name}</span>
      <span>${contributor.count}</span>
    </div>
  `).join("");

  analyticsCharts.innerHTML = `
    <div class="panel-subsection">
      <strong>Uploads by role</strong>
      ${roleRows || "<div class=\"notification\">No uploads yet.</div>"}
    </div>
    <div class="panel-subsection">
      <strong>Top tags</strong>
      ${tagRows || "<div class=\"notification\">No tags yet.</div>"}
    </div>
    <div class="panel-subsection">
      <strong>Top contributors</strong>
      ${contributorRows || "<div class=\"notification\">No contributors yet.</div>"}
    </div>
  `;
}

function renderStats() {
  const items = [
    ["Events", state.dashboard.stats.events],
    ["Visible media", state.dashboard.stats.media],
    ["Private files", state.dashboard.stats.privateItems],
    ["Unread alerts", state.dashboard.stats.notifications]
  ];
  stats.innerHTML = items.map(([label, value]) => `<div class="stat-card"><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function getEventCoverImage(event) {
  const defaultImages = {
    trip: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    workshop: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80",
    fest: "https://images.unsplash.com/photo-1515169067865-5387ec356754?auto=format&fit=crop&w=900&q=80",
    party: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=900&q=80"
  };
  const key = (event.category || "").toLowerCase();
  return event.coverImage || defaultImages[key] || defaultImages.trip;
}

function renderEvents() {
  const sorted = [...state.dashboard.events].sort((a, b) => {
    if (sortSelect.value === "name") return a.name.localeCompare(b.name);
    if (sortSelect.value === "category") return a.category.localeCompare(b.category);
    return new Date(b.date) - new Date(a.date);
  });

  eventPicker.innerHTML = sorted.map(event => `<option value="${event.id}">${event.name}</option>`).join("");
  eventsGrid.innerHTML = sorted.map(event => {
    const coverImage = getEventCoverImage(event);
    return `
      <article class="event-card" style="background-image: linear-gradient(180deg, rgba(15, 118, 110, 0.32), rgba(15, 118, 110, 0.7)), url('${coverImage}');">
        <div>
          <span>${event.category} - ${event.access}</span>
          <h4>${event.name}</h4>
          <p>${event.description}</p>
        </div>
        <span>${event.date}</span>
      </article>
    `;
  }).join("");
}

function createMediaCard(item) {
  const template = document.querySelector("#mediaCardTemplate");
  const event = state.dashboard.events.find(entry => entry.id === item.eventId);
  const card = template.content.cloneNode(true);
  const thumb = card.querySelector(".media-thumb");
  const title = card.querySelector("h4");
  const badge = card.querySelector(".badge");
  const description = card.querySelector("p");
  const tags = card.querySelector(".tags");
  const comments = card.querySelector(".comments");

  if (item.dataUrl && item.type === "photo") {
    thumb.innerHTML = `<img src="${item.dataUrl}" alt="${item.name}" />`;
  } else if (item.dataUrl && item.type === "video") {
    thumb.innerHTML = `<video src="${item.dataUrl}" controls></video>`;
  } else {
    thumb.textContent = event?.name || "Club media";
  }

  title.textContent = item.name;
  badge.textContent = item.visibility;
  description.textContent = `${event?.name || "Event"} - uploaded by ${item.uploadedByName} on ${item.uploadDate}`;
  tags.innerHTML = item.tags.map(tag => `<span>${tag}</span>`).join("");
  comments.innerHTML = item.comments.map(comment => `<div><strong>${comment.userName}:</strong> ${comment.text}</div>`).join("");

  const deleteButton = card.querySelector("[data-action='delete']");
  const captionButton = card.querySelector("[data-action='caption']");
  const captionText = card.querySelector(".caption-text");
  const likeButton = card.querySelector(".like-button");
  const favoriteButton = card.querySelector("[data-action='favourite']");
  const canDelete = state.dashboard.user && (state.dashboard.user.role === "admin" || (state.dashboard.user.role === "member" && item.uploadedBy === state.dashboard.user.id));
  const hasLiked = state.dashboard.user && item.likes && item.likes.includes(state.dashboard.user.id);
  const hasFavourite = state.dashboard.user && item.favourites && item.favourites.includes(state.dashboard.user.id);
  deleteButton.classList.toggle("hidden", !canDelete);
  captionButton.textContent = item.caption ? "Refresh caption" : "AI Caption";
  captionText.textContent = item.caption || "Tap AI Caption to generate a suggested caption.";
  likeButton.textContent = `${hasLiked ? "Liked" : "Like"} (${item.likes?.length || 0})`;
  likeButton.classList.toggle("active", hasLiked);
  favoriteButton.textContent = `${hasFavourite ? "Favourited" : "Favourite"} (${item.favourites?.length || 0})`;
  favoriteButton.classList.toggle("active", hasFavourite);
  card.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => handleMediaAction(item, button.dataset.action));
  });

  card.querySelector(".comment-form").addEventListener("submit", async eventObject => {
    eventObject.preventDefault();
    const text = new FormData(eventObject.currentTarget).get("comment").trim();
    if (!text) return;
    await api(`/api/media/${item.id}/comment`, { method: "POST", body: JSON.stringify({ text }) });
    await loadDashboard();
  });

  return card;
}

function renderMedia(mediaItems) {
  const template = document.querySelector("#mediaCardTemplate");
  mediaGrid.innerHTML = "";
  resultCount.textContent = `${mediaItems.length} item${mediaItems.length === 1 ? "" : "s"}`;

  mediaItems.forEach(item => {
    const event = state.dashboard.events.find(entry => entry.id === item.eventId);
    const card = template.content.cloneNode(true);
    const thumb = card.querySelector(".media-thumb");
    const title = card.querySelector("h4");
    const badge = card.querySelector(".badge");
    const description = card.querySelector("p");
    const tags = card.querySelector(".tags");
    const comments = card.querySelector(".comments");

    if (item.dataUrl && item.type === "photo") {
      thumb.innerHTML = `<img src="${item.dataUrl}" alt="${item.name}" />`;
    } else if (item.dataUrl && item.type === "video") {
      thumb.innerHTML = `<video src="${item.dataUrl}" controls></video>`;
    } else {
      thumb.textContent = event?.name || "Club media";
    }

    title.textContent = item.name;
    badge.textContent = item.visibility;
    description.textContent = `${event?.name || "Event"} - uploaded by ${item.uploadedByName} on ${item.uploadDate}`;
    tags.innerHTML = item.tags.map(tag => `<span>${tag}</span>`).join("");
    comments.innerHTML = item.comments.map(comment => `<div><strong>${comment.userName}:</strong> ${comment.text}</div>`).join("");

    const deleteButton = card.querySelector("[data-action='delete']");
    const captionButton = card.querySelector("[data-action='caption']");
    const captionText = card.querySelector(".caption-text");
    const likeButton = card.querySelector(".like-button");
    const favoriteButton = card.querySelector("[data-action='favourite']");
    const canDelete = state.dashboard.user && (state.dashboard.user.role === "admin" || (state.dashboard.user.role === "member" && item.uploadedBy === state.dashboard.user.id));
    const hasLiked = state.dashboard.user && item.likes && item.likes.includes(state.dashboard.user.id);
    const hasFavourite = state.dashboard.user && item.favourites && item.favourites.includes(state.dashboard.user.id);
    deleteButton.classList.toggle("hidden", !canDelete);
    captionButton.textContent = item.caption ? "Refresh caption" : "AI Caption";
    captionText.textContent = item.caption || "Tap AI Caption to generate a suggested caption.";
    likeButton.textContent = `${hasLiked ? "Liked" : "Like"} (${item.likes?.length || 0})`;
    likeButton.classList.toggle("active", hasLiked);
    favoriteButton.textContent = `${hasFavourite ? "Favourited" : "Favourite"} (${item.favourites?.length || 0})`;
    favoriteButton.classList.toggle("active", hasFavourite);
    card.querySelectorAll("[data-action]").forEach(button => {
      button.addEventListener("click", () => handleMediaAction(item, button.dataset.action));
    });

    card.querySelector(".comment-form").addEventListener("submit", async eventObject => {
      eventObject.preventDefault();
      const text = new FormData(eventObject.currentTarget).get("comment").trim();
      if (!text) return;
      await api(`/api/media/${item.id}/comment`, { method: "POST", body: JSON.stringify({ text }) });
      await loadDashboard();
    });

    mediaGrid.appendChild(card);
  });
}

function renderMatchedPhotos() {
  const matches = state.matchResults || [];
  matchCount.textContent = `${matches.length} match${matches.length === 1 ? "" : "es"}`;
  matchGrid.innerHTML = "";
  if (!matches.length) {
    matchGrid.innerHTML = `<div class="notification">Upload a selfie above to find matching photos.</div>`;
    return;
  }
  matches.forEach(item => matchGrid.appendChild(createMediaCard(item)));
}

function renderNotifications() {
  const notifications = state.dashboard.notifications || [];
  const unread = notifications.filter(item => !item.read);
  markReadButton.classList.toggle("hidden", !unread.length);
  if (!notifications.length) {
    notificationsList.innerHTML = `<div class="notification">No notifications yet.</div>`;
    return;
  }
  notificationsList.innerHTML = notifications.map(item => `
    <div class="notification${item.read ? "" : " notification-new"}">
      ${item.message}
    </div>
  `).join("");
}

markReadButton.addEventListener("click", async () => {
  try {
    await api("/api/notifications/read-all", { method: "POST" });
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
});

function renderFavoritesPanel() {
  const user = state.dashboard.user;
  if (!user) {
    favoritesList.innerHTML = "No favourites yet.";
    showFavoritesButton.disabled = true;
    return;
  }
  const favorites = state.dashboard.media.filter(item => item.favourites?.includes(user.id));
  showFavoritesButton.disabled = false;
  showFavoritesButton.textContent = state.showFavorites ? "Show all" : `Your favourites (${favorites.length})`;
  if (!favorites.length) {
    favoritesList.innerHTML = "No favourites yet.";
    return;
  }
  favoritesList.innerHTML = favorites.map(item => `<div class="favorite-item"><strong>${item.name}</strong><span>${item.uploadDate}</span></div>`).join("");
}

function getFavorites() {
  const user = state.dashboard.user;
  if (!user) return [];
  return state.dashboard.media.filter(item => item.favourites?.includes(user.id));
}

async function handleMediaAction(item, action) {
  if (action === "download") {
    const data = await api(`/api/media/${item.id}/download`);
    downloadWithWatermark(data.media, data.watermark);
    return;
  }
  if (action === "caption") {
    await api(`/api/media/${item.id}/caption`, { method: "POST" });
    await loadDashboard();
    return;
  }
  await api(`/api/media/${item.id}/${action}`, { method: "POST" });
  await loadDashboard();
}

function downloadWithWatermark(media, watermark) {
  if (!media.dataUrl) {
    alert(`Demo watermark: ${watermark}\nSeed media has no physical file attached. Upload a local image to test canvas download.`);
    return;
  }
  if (media.type !== "photo") {
    const link = document.createElement("a");
    link.href = media.dataUrl;
    link.download = media.name;
    link.click();
    return;
  }
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    context.fillStyle = "rgba(0, 0, 0, 0.48)";
    context.fillRect(0, canvas.height - 54, canvas.width, 54);
    context.fillStyle = "#ffffff";
    context.font = `${Math.max(18, Math.round(canvas.width / 36))}px Arial`;
    context.fillText(watermark, 24, canvas.height - 20);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `watermarked-${media.name.replace(/\.[^.]+$/, "")}.png`;
    link.click();
  };
  image.src = media.dataUrl;
}

async function filesToPayload(files) {
  return Promise.all([...files].map(file => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result });
    reader.readAsDataURL(file);
  })));
}

function updatePreviewList() {
  previewList.innerHTML = state.selectedFiles.map(file => {
    const previewUrl = URL.createObjectURL(file);
    const previewContent = file.type.startsWith("image/")
      ? `<img src="${previewUrl}" alt="${file.name}" />`
      : `<video src="${previewUrl}" muted playsinline></video>`;
    return `
      <div class="preview-item">
        <div class="preview-thumb">${previewContent}</div>
        <div>
          <strong>${file.name}</strong>
          <span>${(file.size / 1024).toFixed(1)} KB</span>
          <span>${file.type || "Unknown"}</span>
        </div>
      </div>
    `;
  }).join("");
}

function updateSelfiePreview() {
  if (!state.selfieReferenceFile) {
    selfiePreview.textContent = "No selfie selected.";
    clearSelfieButton.classList.add("hidden");
    return;
  }
  selfiePreview.innerHTML = `
    <div class="preview-item selfie-item">
      <img src="${state.selfiePreviewUrl}" alt="Reference selfie" />
      <div>
        <strong>${state.selfieReferenceFile.name}</strong>
      </div>
    </div>
  `;
  clearSelfieButton.classList.remove("hidden");
}

function clearSelfieReference() {
  if (state.selfiePreviewUrl) {
    URL.revokeObjectURL(state.selfiePreviewUrl);
  }
  state.selfieReferenceFile = null;
  state.selfiePreviewUrl = null;
  state.matchResults = [];
  selfieInput.value = "";
  matchCount.textContent = "";
  updateSelfiePreview();
  renderMatchedPhotos();
}

function setDropZoneActive(active) {
  dropZone.classList.toggle("dragover", active);
}

dropZone.addEventListener("dragover", event => {
  event.preventDefault();
  setDropZoneActive(true);
});

dropZone.addEventListener("dragleave", event => {
  event.preventDefault();
  setDropZoneActive(false);
});

dropZone.addEventListener("drop", event => {
  event.preventDefault();
  setDropZoneActive(false);
  const files = [...event.dataTransfer.files].filter(file => file.type.startsWith("image/") || file.type.startsWith("video/"));
  if (!files.length) return;
  state.selectedFiles = files;
  fileInput.files = event.dataTransfer.files;
  updatePreviewList();
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const body = {
    role: loginRole.value
  };

  try {
    const data = await api("/api/login", { method: "POST", body: JSON.stringify(body) });
    state.userId = data.userId;
    localStorage.setItem("clubConnectUserId", state.userId);
    loginRole.value = "";
    await loadDashboard();
  } catch (error) {
    loginError.textContent = error.message;
    loginError.classList.remove("hidden");
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await api("/api/logout", { method: "POST" });
  } catch (_) {
    // ignore logout network failures
  }
  localStorage.removeItem("clubConnectUserId");
  state.userId = null;
  state.dashboard = null;
  showLoginScreen();
});

sortSelect.addEventListener("change", () => renderDashboard(state.dashboard.media));

searchInput.addEventListener("input", async event => {
  const query = event.target.value.trim();
  if (!query) {
    renderMedia(state.showFavorites ? getFavorites() : state.dashboard.media);
    return;
  }
  const data = await api(`/api/search?q=${encodeURIComponent(query)}`);
  const results = state.showFavorites ? data.results.filter(item => item.favourites?.includes(state.dashboard.user.id)) : data.results;
  renderMedia(results);
});

showFavoritesButton.addEventListener("click", () => {
  state.showFavorites = !state.showFavorites;
  const mediaList = state.showFavorites ? getFavorites() : state.dashboard.media;
  renderFavoritesPanel();
  renderMedia(mediaList);
});

eventForm.addEventListener("submit", async event => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await api("/api/events", { method: "POST", body: JSON.stringify(body) });
    event.currentTarget.reset();
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
});

fileInput.addEventListener("change", event => {
  state.selectedFiles = [...event.target.files];
  updatePreviewList();
});

selfieInput.addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;
  if (state.selfiePreviewUrl) {
    URL.revokeObjectURL(state.selfiePreviewUrl);
  }
  state.selfieReferenceFile = file;
  state.selfiePreviewUrl = URL.createObjectURL(file);
  updateSelfiePreview();
});

matchSelfieButton.addEventListener("click", async () => {
  if (!state.selfieReferenceFile) {
    return alert("Upload a reference selfie first.");
  }
  const [payload] = await filesToPayload([state.selfieReferenceFile]);
  try {
    const data = await api("/api/face-match", { method: "POST", body: JSON.stringify({ selfieName: state.selfieReferenceFile.name, selfieDataUrl: payload.dataUrl }) });
    state.matchResults = data.results;
    renderMatchedPhotos();
  } catch (error) {
    alert(error.message);
  }
});

clearSelfieButton.addEventListener("click", () => {
  clearSelfieReference();
});

uploadForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!state.selectedFiles.length) {
    alert("Choose at least one photo or video first.");
    return;
  }
  const formData = new FormData(event.currentTarget);
  const body = {
    eventId: formData.get("eventId"),
    visibility: formData.get("visibility"),
    description: formData.get("description"),
    taggedUsers: [state.userId],
    files: await filesToPayload(state.selectedFiles)
  };
  try {
    await api("/api/media", { method: "POST", body: JSON.stringify(body) });
    state.selectedFiles = [];
    fileInput.value = "";
    previewList.innerHTML = "";
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
});

faceButton.addEventListener("click", async () => {
  const selfieName = prompt("Enter selfie filename hint for demo matching", "yuvraj-selfie.jpg");
  if (!selfieName) return;
  const data = await api("/api/face-match", { method: "POST", body: JSON.stringify({ selfieName }) });
  renderMedia(data.results);
});

loadDashboard().catch(error => {
  document.body.innerHTML = `<main class="panel"><h1>Could not start app</h1><p>${error.message}</p></main>`;
});
