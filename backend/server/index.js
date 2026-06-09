const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// Load environment from .env when present (optional)
try {
  require("dotenv").config();
} catch (err) {
  // dotenv not installed — ignore
}

const PORT = process.env.PORT || 3000;
const rootDir = path.join(__dirname, "..", "..");
const clientDir = path.join(rootDir, "frontend", "client");
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "database.json");

const roles = {
  admin: ["create:event", "upload:media", "view:private", "moderate:media", "download:media"],
  photographer: ["create:event", "upload:media", "view:private", "download:media"],
  member: ["create:event", "upload:media", "view:private", "download:media"],
  viewer: ["download:media"]
};

// Optional AWS S3 integration. Configure via environment variables:
// AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
let s3Client = null;
let AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;
let AWS_REGION = process.env.AWS_REGION;
try {
  const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
  if (AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({ region: AWS_REGION || "us-east-1" });
  }
  async function uploadToS3FromDataUrl(dataUrl, key, contentType) {
    if (!s3Client) throw new Error("S3 not configured");
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) throw new Error("Invalid dataUrl");
    const buffer = Buffer.from(matches[2], "base64");
    const cmd = new PutObjectCommand({ Bucket: AWS_S3_BUCKET, Key: key, Body: buffer, ContentType: contentType, ACL: "public-read" });
    await s3Client.send(cmd);
    const region = AWS_REGION || "us-east-1";
    const url = `https://${AWS_S3_BUCKET}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
    return url;
  }
} catch (err) {
  // aws-sdk may not be installed; skip S3 support gracefully
  s3Client = null;
}

function readDatabase() {
  return JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

function writeDatabase(database) {
  fs.writeFileSync(dataFile, JSON.stringify(database, null, 2));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", chunk => {
      body += chunk.toString();
      if (body.length > 12_000_000) {
        reject(new Error("Payload is too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function getCurrentUser(database, requestUrl) {
  const userId = requestUrl.searchParams.get("userId");
  return userId ? database.users.find(user => user.id === userId) || null : null;
}

function can(user, permission) {
  return roles[user.role]?.includes(permission);
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function canDeleteMedia(user, media) {
  if (!user || !media) return false;
  if (user.role === "admin") return true;
  if (user.role === "member" && media.uploadedBy === user.id) return true;
  return false;
}

function generateTags(media, event) {
  const text = `${media.name} ${event?.name || ""} ${event?.category || ""} ${media.description || ""}`.toLowerCase();
  const matches = {
    workshop: ["workshop", "speaker", "learning", "coding", "session"],
    sports: ["sports", "competition", "team", "action", "match", "tournament"],
    crowd: ["crowd", "audience", "festival", "concert", "performance"],
    mountains: ["mountain", "mountains", "hill", "peak", "summit", "trek"],
    beaches: ["beach", "beaches", "sand", "waves", "shore", "coast", "sunset"],
    party: ["party", "friends", "celebration", "candid", "dance", "night"],
    portrait: ["portrait", "face", "profile", "member", "headshot"],
    nature: ["forest", "river", "waterfall", "wildlife", "landscape", "outdoor"]
  };
  const tags = new Set(["club-media"]);
  Object.entries(matches).forEach(([keyword, values]) => {
    values.forEach(tag => {
      if (text.includes(tag)) tags.add(tag);
    });
  });
  if (text.includes("group")) tags.add("group");
  if (text.includes("team")) tags.add("team");
  if (text.includes("photography")) tags.add("photography");
  return Array.from(tags).slice(0, 10);
}

function generateCaption(media, event, user) {
  const eventName = event?.name || "club event";
  const baseDescription = media.description || `${media.name.replace(/[-_]/g, " ")}`;
  const featureTags = (media.tags || []).slice(0, 4).join(", ");
  return `${user?.name || "A club member"} captured a memorable ${event?.category?.toLowerCase() || "club"} moment from ${eventName}. ${baseDescription}${featureTags ? ` Featuring ${featureTags}.` : ""}`;
}

function getAnalytics(database, user) {
  const visibleMedia = filterVisibleMedia(database, user);
  const totalMedia = visibleMedia.length;
  const totalEvents = database.events.length;
  const totalLikes = visibleMedia.reduce((sum, item) => sum + (item.likes?.length || 0), 0);
  const totalComments = visibleMedia.reduce((sum, item) => sum + (item.comments?.length || 0), 0);
  const totalFavorites = visibleMedia.reduce((sum, item) => sum + (item.favourites?.length || 0), 0);
  const uploadsByRole = database.media.reduce((acc, item) => {
    const uploader = database.users.find(user => user.id === item.uploadedBy);
    const role = uploader?.role || "unknown";
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});
  const topTags = Object.entries(visibleMedia.flatMap(item => item.tags || [])
    .reduce((counts, tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
      return counts;
    }, {}))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag, count]) => ({ tag, count }));
  const topContributors = Object.entries(database.media.reduce((acc, item) => {
    acc[item.uploadedBy] = (acc[item.uploadedBy] || 0) + 1;
    return acc;
  }, {}))
    .map(([userId, count]) => ({ name: database.users.find(user => user.id === userId)?.name || userId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  return {
    totalMedia,
    totalEvents,
    totalLikes,
    totalComments,
    totalFavorites,
    uploadsByRole,
    topTags,
    topContributors
  };
}

function addNotification(database, userId, message) {
  database.notifications.unshift({
    id: createId("n"),
    userId,
    message,
    read: false,
    createdAt: new Date().toISOString()
  });
}

function filterVisibleMedia(database, user) {
  return database.media.filter(item => item.visibility === "public" || can(user, "view:private"));
}

function serveStatic(response, requestPath) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(clientDir, safePath));
  if (!filePath.startsWith(clientDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  const ext = path.extname(filePath);
  const contentTypes = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".svg": "image/svg+xml"
  };
  response.writeHead(200, { "Content-Type": contentTypes[ext] || "text/plain" });
  fs.createReadStream(filePath).pipe(response);
}

async function handleApi(request, response, requestUrl) {
  const database = readDatabase();
  const user = getCurrentUser(database, requestUrl);
  const route = requestUrl.pathname;

  if (request.method === "OPTIONS") return sendJson(response, 200, { ok: true });

  if (request.method === "POST" && route === "/api/login") {
    const body = await readBody(request);
    const role = (body.role || "").toLowerCase();
    if (!role) {
      return sendJson(response, 400, { message: "Role is required." });
    }
    const allowedRoles = ["admin", "photographer", "member", "viewer"];
    if (!allowedRoles.includes(role)) {
      return sendJson(response, 400, { message: "Login role must be admin, photographer, member, or viewer." });
    }
    const user = database.users.find(u => u.role === role);
    if (!user) {
      return sendJson(response, 404, { message: "Role user not found." });
    }
    const { password, ...publicUser } = user;
    return sendJson(response, 200, { user: publicUser, userId: user.id });
  }

  if (request.method === "POST" && route === "/api/logout") {
    return sendJson(response, 200, { ok: true });
  }

  if (!user && route !== "/api/login" && route !== "/api/logout") {
    return sendJson(response, 401, { message: "Authentication required." });
  }

  if (request.method === "GET" && route === "/api/dashboard") {
    const visibleMedia = filterVisibleMedia(database, user);
    return sendJson(response, 200, {
      user,
      stats: {
        events: database.events.length,
        media: visibleMedia.length,
        privateItems: database.media.filter(item => item.visibility === "private").length,
        notifications: database.notifications.filter(item => item.userId === user.id && !item.read).length
      },
      analytics: getAnalytics(database, user),
      events: database.events,
      media: visibleMedia,
      users: database.users.map(({ password, ...publicUser }) => publicUser),
      notifications: database.notifications.filter(item => item.userId === user.id).slice(0, 12)
    });
  }

  if (request.method === "GET" && route === "/api/search") {
    const query = (requestUrl.searchParams.get("q") || "").toLowerCase();
    const results = filterVisibleMedia(database, user).filter(item => {
      const event = database.events.find(entry => entry.id === item.eventId);
      return [item.name, item.uploadedByName, event?.name, event?.category, item.uploadDate, item.description, ...(item.tags || [])]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
    return sendJson(response, 200, { results });
  }

  if (request.method === "POST" && route === "/api/events") {
    if (!can(user, "create:event")) return sendJson(response, 403, { message: "Only admin, photographer, and member users can create events." });
    const body = await readBody(request);
    const event = {
      id: createId("e"),
      name: body.name,
      category: body.category,
      date: body.date,
      description: body.description,
      access: body.access || "public",
      coverColor: body.coverColor || "#0f766e"
    };
    database.events.unshift(event);
    writeDatabase(database);
    return sendJson(response, 201, { event });
  }

  if (request.method === "POST" && route === "/api/media") {
    if (!can(user, "upload:media")) return sendJson(response, 403, { message: "This role cannot upload media." });
    const body = await readBody(request);
    const event = database.events.find(entry => entry.id === body.eventId);
    const s3Enabled = !!s3Client;
    const uploadedItems = [];
    for (const file of (body.files || [])) {
      const key = `club-media/${body.eventId}/${Date.now().toString(36)}_${file.name}`;
      let dataUrl = file.dataUrl;
      let storageProvider = "Local S3-compatible adapter";
      let storageKey = `club-media/${body.eventId}/${file.name}`;
      if (s3Enabled && file.dataUrl) {
        try {
          const uploadedUrl = await uploadToS3FromDataUrl(file.dataUrl, key, file.type || "application/octet-stream");
          dataUrl = uploadedUrl;
          storageProvider = "AWS S3";
          storageKey = key;
        } catch (err) {
          // if S3 upload fails, fall back to embedding dataUrl as-is and keep provider as local
          console.warn("S3 upload failed for", file.name, err.message);
        }
      }
      const tags = generateTags({ name: file.name, description: body.description }, event);
      const media = {
        id: createId("m"),
        eventId: body.eventId,
        name: file.name,
        type: file.type?.startsWith("video") ? "video" : "photo",
        dataUrl: dataUrl,
        size: file.size,
        visibility: body.visibility || "public",
        description: body.description || "",
        uploadedBy: user.id,
        uploadedByName: user.name,
        uploadDate: new Date().toISOString().slice(0, 10),
        tags,
        caption: "",
        likes: [],
        comments: [],
        favourites: [],
        taggedUsers: body.taggedUsers || [],
        storageProvider,
        storageKey
      };
      media.caption = generateCaption(media, event, user);
      media.taggedUsers.forEach(userId => addNotification(database, userId, `${user.name} tagged you in ${media.name}`));
      uploadedItems.push(media);
    }
    database.media.unshift(...uploadedItems);
    writeDatabase(database);
    return sendJson(response, 201, { media: uploadedItems });
  }

  if (request.method === "POST" && route.match(/^\/api\/media\/[^/]+\/caption$/)) {
    const mediaId = route.split("/")[3];
    const media = database.media.find(item => item.id === mediaId);
    if (!media) return sendJson(response, 404, { message: "Media not found." });
    const event = database.events.find(entry => entry.id === media.eventId);
    media.caption = generateCaption(media, event, user);
    writeDatabase(database);
    return sendJson(response, 200, { media });
  }

  if (request.method === "POST" && route.match(/^\/api\/media\/[^/]+\/like$/)) {
    const mediaId = route.split("/")[3];
    const media = database.media.find(item => item.id === mediaId);
    if (!media) return sendJson(response, 404, { message: "Media not found." });
    const alreadyLiked = media.likes.includes(user.id);
    if (alreadyLiked) {
      media.likes = media.likes.filter(id => id !== user.id);
    } else {
      media.likes = [...media.likes, user.id];
      if (media.uploadedBy !== user.id) {
        addNotification(database, media.uploadedBy, `${user.name} liked ${media.name}`);
      }
    }
    writeDatabase(database);
    return sendJson(response, 200, { media });
  }

  if (request.method === "POST" && route.match(/^\/api\/media\/[^/]+\/comment$/)) {
    const mediaId = route.split("/")[3];
    const body = await readBody(request);
    const media = database.media.find(item => item.id === mediaId);
    if (!media) return sendJson(response, 404, { message: "Media not found." });
    const text = (body.text || "").trim();
    if (!text) return sendJson(response, 400, { message: "Comment text is required." });
    const existingComment = media.comments.find(comment => comment.userId === user.id);
    if (existingComment) {
      existingComment.text = text;
      existingComment.createdAt = new Date().toISOString();
    } else {
      media.comments.push({ id: createId("c"), userId: user.id, userName: user.name, text, createdAt: new Date().toISOString() });
    }
    if (media.uploadedBy !== user.id) addNotification(database, media.uploadedBy, `${user.name} commented on ${media.name}`);
    writeDatabase(database);
    return sendJson(response, 201, { media });
  }

  if (request.method === "POST" && route.match(/^\/api\/media\/[^/]+\/favourite$/)) {
    const mediaId = route.split("/")[3];
    const media = database.media.find(item => item.id === mediaId);
    if (!media) return sendJson(response, 404, { message: "Media not found." });
    media.favourites = media.favourites.includes(user.id) ? media.favourites.filter(id => id !== user.id) : [...media.favourites, user.id];
    writeDatabase(database);
    return sendJson(response, 200, { media });
  }

  if (request.method === "POST" && route.match(/^\/api\/media\/[^/]+\/delete$/)) {
    const mediaId = route.split("/")[3];
    const media = database.media.find(item => item.id === mediaId);
    if (!media) return sendJson(response, 404, { message: "Media not found." });
    if (!canDeleteMedia(user, media)) return sendJson(response, 403, { message: "Not authorized to delete this media." });
    database.media = database.media.filter(item => item.id !== mediaId);
    writeDatabase(database);
    return sendJson(response, 200, { ok: true });
  }

  if (request.method === "POST" && route === "/api/face-match") {
    const body = await readBody(request);
    const selfieName = (body.selfieName || "").toLowerCase();
    const selfieTokens = new Set([
      ...(user.name || "").toLowerCase().split(/\W+/).filter(Boolean),
      ...selfieName.replace(/\.[^.]+$/, "").split(/\W+/).filter(Boolean)
    ]);
    const results = filterVisibleMedia(database, user).filter(item => {
      const event = database.events.find(entry => entry.id === item.eventId);
      const text = [
        item.name,
        item.description,
        item.uploadedByName,
        event?.name,
        event?.category,
        ...(item.tags || [])
      ]
        .join(" ")
        .toLowerCase();
      const tagged = item.taggedUsers.includes(user.id);
      const uploadedBySelf = item.uploadedBy === user.id;
      const tokenMatch = [...selfieTokens].some(token => token && text.includes(token));
      const faceKeywords = ["portrait", "face", "headshot", "selfie", "photograph", "photo"];
      const portraitMatch = item.tags.some(tag => faceKeywords.includes(tag)) || faceKeywords.some(keyword => text.includes(keyword));
      return tagged || uploadedBySelf || tokenMatch || portraitMatch;
    });
    return sendJson(response, 200, { results });
  }

  if (request.method === "POST" && route === "/api/notifications/read-all") {
    database.notifications.forEach(notification => {
      if (notification.userId === user.id) notification.read = true;
    });
    writeDatabase(database);
    return sendJson(response, 200, { ok: true });
  }

  if (request.method === "GET" && route.match(/^\/api\/media\/[^/]+\/download$/)) {
    const mediaId = route.split("/")[3];
    const media = database.media.find(item => item.id === mediaId);
    const event = database.events.find(entry => entry.id === media?.eventId);
    if (!media) return sendJson(response, 404, { message: "Media not found." });
    if (media.visibility === "private" && !can(user, "view:private")) return sendJson(response, 403, { message: "Private media is restricted." });
    return sendJson(response, 200, {
      media,
      watermark: `${event?.name || "Club Event"} | ${user.role.toUpperCase()} | CIG Club`
    });
  }

  return sendJson(response, 404, { message: "API route not found." });
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  if (requestUrl.pathname.startsWith("/api/")) {
    handleApi(request, response, requestUrl).catch(error => sendJson(response, 500, { message: error.message }));
    return;
  }
  serveStatic(response, requestUrl.pathname);
});

server.on("error", err => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the other process or set a different PORT environment variable.`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
