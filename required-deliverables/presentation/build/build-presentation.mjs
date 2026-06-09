import { Presentation, PresentationFile } from "@oai/artifact-tool";
import fs from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.resolve("../");
const PREVIEW_DIR = path.resolve("./preview");
const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });

const colors = {
  bg: "#F5F7FB",
  ink: "#172033",
  muted: "#667085",
  teal: "#0F766E",
  tealDark: "#115E59",
  blue: "#2563EB",
  orange: "#EA580C",
  line: "#D9E0EA",
  white: "#FFFFFF",
  softTeal: "#E6F6F3",
  softBlue: "#EAF1FF",
  softOrange: "#FFF1E8"
};

presentation.theme.colorScheme = {
  name: "CIG Media Hub",
  themeColors: {
    accent1: colors.teal,
    accent2: colors.blue,
    accent3: colors.orange,
    bg1: colors.white,
    bg2: colors.bg,
    tx1: colors.ink,
    tx2: colors.muted
  }
};

function shape(slide, position, fill = colors.white, line = colors.line, radius = true) {
  const item = slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    position,
    fill,
    line: { style: "solid", fill: line, width: 1 },
    adjustmentList: radius ? [{ name: "adj", formula: "val 9000" }] : undefined
  });
  return item;
}

function text(slide, value, position, options = {}) {
  const box = slide.shapes.add({
    geometry: "rect",
    position,
    fill: "#FFFFFF00",
    line: { width: 0, fill: "#FFFFFF00" }
  });
  box.text = value;
  box.text.typeface = options.typeface || "Lato";
  box.text.fontSize = options.fontSize || 24;
  box.text.color = options.color || colors.ink;
  box.text.bold = Boolean(options.bold);
  box.text.alignment = options.alignment || "left";
  box.text.verticalAlignment = options.verticalAlignment || "top";
  box.text.insets = options.insets || { left: 4, right: 4, top: 4, bottom: 4 };
  box.text.autoFit = "shrinkText";
  return box;
}

function title(slide, heading, subheading) {
  text(slide, heading, { left: 70, top: 42, width: 820, height: 58 }, {
    typeface: "Poppins",
    fontSize: 34,
    bold: true
  });
  if (subheading) {
    text(slide, subheading, { left: 72, top: 100, width: 900, height: 34 }, {
      fontSize: 15,
      color: colors.muted
    });
  }
}

function footer(slide) {
  text(slide, "Event & Media Management Platform", { left: 70, top: 674, width: 420, height: 22 }, {
    fontSize: 12,
    color: colors.muted
  });
  text(slide, "CIG Development Project", { left: 1010, top: 674, width: 210, height: 22 }, {
    fontSize: 12,
    color: colors.muted,
    alignment: "right"
  });
}

function bulletList(slide, items, left, top, width, options = {}) {
  items.forEach((item, index) => {
    const y = top + index * (options.gap || 58);
    shape(slide, { left, top: y + 7, width: 10, height: 10 }, options.dot || colors.teal, options.dot || colors.teal, false);
    text(slide, item, { left: left + 24, top: y, width, height: 42 }, {
      fontSize: options.fontSize || 20,
      color: options.color || colors.ink
    });
  });
}

function card(slide, heading, body, position, accent = colors.teal) {
  shape(slide, position, colors.white, colors.line);
  shape(slide, { left: position.left, top: position.top, width: 8, height: position.height }, accent, accent, false);
  text(slide, heading, { left: position.left + 24, top: position.top + 20, width: position.width - 42, height: 28 }, {
    typeface: "Poppins",
    fontSize: 19,
    bold: true
  });
  text(slide, body, { left: position.left + 24, top: position.top + 58, width: position.width - 42, height: position.height - 72 }, {
    fontSize: 15,
    color: colors.muted
  });
}

function addBackground(slide) {
  slide.background.fill = colors.bg;
  shape(slide, { left: 0, top: 0, width: 1280, height: 8 }, colors.teal, colors.teal, false);
}

async function saveBlobLike(blob, filePath) {
  if (typeof blob.save === "function") {
    await blob.save(filePath);
    return;
  }
  if (typeof blob.arrayBuffer === "function") {
    await fs.writeFile(filePath, Buffer.from(await blob.arrayBuffer()));
    return;
  }
  if (blob.bytes) {
    await fs.writeFile(filePath, Buffer.from(blob.bytes));
    return;
  }
  throw new Error("Unsupported export object.");
}

function slideOne() {
  const slide = presentation.slides.add();
  addBackground(slide);
  shape(slide, { left: 70, top: 110, width: 1140, height: 500 }, colors.white, colors.line);
  shape(slide, { left: 770, top: 110, width: 440, height: 500 }, colors.softTeal, colors.softTeal);
  text(slide, "CIG Event Media Hub", { left: 105, top: 158, width: 630, height: 76 }, {
    typeface: "Poppins",
    fontSize: 44,
    bold: true
  });
  text(slide, "A full-stack platform for event-wise media organization, role-based access, social interactions, AI-powered search, cloud-ready storage, face discovery, and watermark downloads.", { left: 108, top: 250, width: 650, height: 120 }, {
    fontSize: 22,
    color: colors.muted
  });
  card(slide, "Mandatory deliverables", "README, database schema, architecture diagram, PPT, demo script, and runnable project.", { left: 108, top: 420, width: 330, height: 120 }, colors.blue);
  card(slide, "Human-friendly code", "Simple folder names and readable files: client, server, database, docs, presentation.", { left: 470, top: 420, width: 330, height: 120 }, colors.orange);
  ["Events", "Media", "AI Tags", "Access", "Cloud"].forEach((label, i) => {
    shape(slide, { left: 840 + (i % 2) * 120, top: 190 + Math.floor(i / 2) * 110, width: 105, height: 80 }, i % 2 ? colors.softBlue : colors.white, colors.line);
    text(slide, label, { left: 850 + (i % 2) * 120, top: 217 + Math.floor(i / 2) * 110, width: 85, height: 24 }, {
      fontSize: 16,
      bold: true,
      alignment: "center"
    });
  });
  footer(slide);
}

function slideTwo() {
  const slide = presentation.slides.add();
  addBackground(slide);
  title(slide, "Problem Understanding", "Clubs generate large media libraries, but storage and discovery are scattered.");
  card(slide, "Current pain", "Photos and videos live across personal drives, cloud links, and folders with no central ownership.", { left: 70, top: 170, width: 340, height: 170 }, colors.orange);
  card(slide, "Operational gap", "Organizers struggle with access control, event sorting, downloads, and member-specific discovery.", { left: 450, top: 170, width: 340, height: 170 }, colors.blue);
  card(slide, "Proposed goal", "A centralized platform where photographers and organizers manage event media efficiently.", { left: 830, top: 170, width: 340, height: 170 }, colors.teal);
  bulletList(slide, [
    "Event-wise albums and metadata",
    "Public/private access rules",
    "Social engagement and notifications",
    "AI-powered tagging, search, and face discovery"
  ], 110, 405, 900, { gap: 48, fontSize: 22 });
  footer(slide);
}

function slideThree() {
  const slide = presentation.slides.add();
  addBackground(slide);
  title(slide, "Core Feature Coverage", "Mandatory platform features are mapped into practical demo modules.");
  const features = [
    ["Event Management", "Create events, album metadata, date/category/name sorting", colors.teal],
    ["Upload System", "Bulk selection, drag-and-drop, previews, file metadata", colors.blue],
    ["Access Control", "Admin, Photographer, Member, Viewer permissions", colors.orange],
    ["Social Layer", "Like, comment, share-ready download, favourites, user tags", colors.teal],
    ["AI/ML Layer", "Smart tags, advanced search, personalized photo discovery", colors.blue],
    ["Cloud + Watermark", "S3-ready storage keys and role/event watermark flow", colors.orange]
  ];
  features.forEach(([head, body, accent], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    card(slide, head, body, { left: 70 + col * 390, top: 165 + row * 205, width: 340, height: 155 }, accent);
  });
  footer(slide);
}

function slideFour() {
  const slide = presentation.slides.add();
  addBackground(slide);
  title(slide, "Full-Stack Architecture", "A simple, scalable request flow that can be upgraded for production.");
  const nodes = [
    ["Web Client", 90, 250, colors.softBlue],
    ["Node API", 330, 250, colors.white],
    ["RBAC", 550, 165, colors.softOrange],
    ["Events & Media", 550, 250, colors.softTeal],
    ["Social + Alerts", 550, 335, colors.softBlue],
    ["Database", 825, 210, colors.white],
    ["S3 Storage", 825, 315, colors.white],
    ["AI Services", 1030, 250, colors.softOrange]
  ];
  nodes.forEach(([label, left, top, fill]) => {
    shape(slide, { left, top, width: 160, height: 62 }, fill, colors.line);
    text(slide, label, { left: left + 12, top: top + 20, width: 136, height: 24 }, {
      fontSize: 16,
      bold: true,
      alignment: "center"
    });
  });
  [[255, 323], [494, 543], [715, 818], [990, 1023]].forEach(([x1, x2]) => {
    slide.shapes.add({
      geometry: "rightArrow",
      position: { left: x1, top: 267, width: x2 - x1, height: 28 },
      fill: colors.teal,
      line: { style: "solid", fill: colors.teal, width: 1 }
    });
  });
  bulletList(slide, [
    "Client renders dashboard, upload panels, gallery, search, and demo role switcher",
    "API owns validation, permissions, events, media, social actions, and notifications",
    "Database schema supports production entities; JSON store keeps local demo simple",
    "Storage and AI layers are adapter-based so cloud services can replace demo logic"
  ], 120, 465, 980, { gap: 38, fontSize: 18 });
  footer(slide);
}

function slideFive() {
  const slide = presentation.slides.add();
  addBackground(slide);
  title(slide, "Tech Stack", "Chosen to be easy to run, explain, and extend.");
  card(slide, "Frontend", "HTML, CSS, JavaScript\nResponsive dashboard, upload UX, gallery actions, search, and face-match demo.", { left: 80, top: 170, width: 340, height: 210 }, colors.blue);
  card(slide, "Backend", "Node.js HTTP server\nREST-style API, role checks, media actions, notifications, watermark download response.", { left: 460, top: 170, width: 340, height: 210 }, colors.teal);
  card(slide, "Data + Cloud", "JSON demo data + SQL schema\nS3-compatible storage key pattern for production cloud integration.", { left: 840, top: 170, width: 340, height: 210 }, colors.orange);
  card(slide, "AI/ML", "Smart tag generator, metadata search, and reference-selfie face discovery workflow.", { left: 180, top: 430, width: 420, height: 130 }, colors.teal);
  card(slide, "Documentation", "README, architecture diagram, schema, demo video script, and PPT for submission.", { left: 680, top: 430, width: 420, height: 130 }, colors.blue);
  footer(slide);
}

function slideSix() {
  const slide = presentation.slides.add();
  addBackground(slide);
  title(slide, "Database Schema", "Production entities are separated for clear ownership and scalability.");
  const columns = [
    ["Users", "id, name, email, role"],
    ["Events", "id, name, category, date, access"],
    ["Media", "event_id, type, storage_key, visibility"],
    ["Tags", "media_id, tag, confidence"],
    ["Social", "likes, comments, favourites, user_tags"],
    ["Face + Alerts", "face_references, notifications"]
  ];
  columns.forEach(([head, body], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    shape(slide, { left: 90 + col * 385, top: 175 + row * 180, width: 320, height: 120 }, colors.white, colors.line);
    text(slide, head, { left: 112 + col * 385, top: 198 + row * 180, width: 260, height: 24 }, {
      typeface: "Poppins",
      fontSize: 20,
      bold: true
    });
    text(slide, body, { left: 112 + col * 385, top: 238 + row * 180, width: 270, height: 42 }, {
      fontSize: 16,
      color: colors.muted
    });
  });
  text(slide, "Schema file: required-deliverables/database/schema.sql", { left: 92, top: 575, width: 560, height: 30 }, {
    fontSize: 18,
    bold: true,
    color: colors.teal
  });
  footer(slide);
}

function slideSeven() {
  const slide = presentation.slides.add();
  addBackground(slide);
  title(slide, "AI, Cloud, Access Control, and Notifications", "High-scoring areas from the evaluation criteria are represented in the implementation.");
  card(slide, "AI search", "Tags are generated from event context and file metadata. Search works across event name, tags, upload date, and uploader.", { left: 80, top: 165, width: 520, height: 145 }, colors.blue);
  card(slide, "Face discovery", "Users can submit a selfie hint and see matching tagged or portrait media in a personalized section.", { left: 680, top: 165, width: 520, height: 145 }, colors.teal);
  card(slide, "Cloud storage", "Media records store provider and storage key fields so AWS S3 can replace local demo data cleanly.", { left: 80, top: 350, width: 520, height: 145 }, colors.orange);
  card(slide, "Security and alerts", "Roles control private access and uploads. Likes, comments, and tags create user notifications.", { left: 680, top: 350, width: 520, height: 145 }, colors.blue);
  footer(slide);
}

function slideEight() {
  const slide = presentation.slides.add();
  addBackground(slide);
  title(slide, "Demo Flow and Deliverables", "Everything needed for a clean submission is included in the workspace.");
  bulletList(slide, [
    "Run npm start and open http://localhost:3000",
    "Create an event, upload media, preview files, and switch roles",
    "Search by event, tag, date, or uploader and test the face-match flow",
    "Like, comment, favourite, and download with watermark behavior",
    "Show README, database schema, architecture diagram, PPT, and demo video script"
  ], 110, 170, 960, { gap: 54, fontSize: 23, dot: colors.orange });
  shape(slide, { left: 880, top: 505, width: 250, height: 88 }, colors.softTeal, colors.teal);
  text(slide, "Ready for GitHub, deployment, and screen-recorded demo video.", { left: 906, top: 525, width: 202, height: 46 }, {
    fontSize: 17,
    bold: true,
    alignment: "center"
  });
  footer(slide);
}

[
  slideOne,
  slideTwo,
  slideThree,
  slideFour,
  slideFive,
  slideSix,
  slideSeven,
  slideEight
].forEach(create => create());

await fs.mkdir(PREVIEW_DIR, { recursive: true });
for (const [index, slide] of presentation.slides.items.entries()) {
  const preview = await presentation.export({ slide, format: "png", scale: 1 });
  await saveBlobLike(preview, path.join(PREVIEW_DIR, `slide-${String(index + 1).padStart(2, "0")}.png`));
}

const pptx = await PresentationFile.exportPptx(presentation);
await saveBlobLike(pptx, path.join(OUT_DIR, "output.pptx"));
