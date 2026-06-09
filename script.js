const rawSlides = Array.isArray(window.pptSlides) ? window.pptSlides : [];
const appConfig =
  typeof window.teamAppConfig === "object" && window.teamAppConfig !== null
    ? window.teamAppConfig
    : {};

const palettes = [
  "linear-gradient(160deg, #d96c5f 0%, #efb08a 55%, #f7dbc7 100%)",
  "linear-gradient(160deg, #4f7c82 0%, #85b3ab 52%, #d9eee5 100%)",
  "linear-gradient(160deg, #c5863a 0%, #e6b96f 55%, #f5ead4 100%)",
  "linear-gradient(160deg, #5a6fa1 0%, #9ab7d5 55%, #e3edf7 100%)",
  "linear-gradient(160deg, #c85b76 0%, #efa7b9 54%, #fde3e9 100%)",
  "linear-gradient(160deg, #617a55 0%, #a7c191 54%, #edf5e4 100%)"
];

const fieldDefinitions = [
  { key: "role", pattern: /^Your Role\s*:?\s*/i },
  { key: "location", pattern: /^Location\s*:?\s*/i },
  { key: "journey", pattern: /^Lenovo Journey\s*:?\s*/i },
  { key: "customerTeam", pattern: /^Your customer\/biz team\s*:?\s*/i },
  { key: "previousWorkExperience", pattern: /^Previous Work Experience\s*:?\s*/i },
  { key: "hobbies", pattern: /^Hobbies\s*:?\s*/i },
  { key: "familyLife", pattern: /^Family \/ Life\s*:?\s*/i },
  { key: "support", pattern: /^I'd like to support if you need\.\.\.\s*:?\s*/i },
  { key: "support", pattern: /^I'd like to support if you need\s*:?\s*/i },
  { key: "other", pattern: /^Other things you'd like to share\??\s*:?\s*/i }
];

const splitLabels = [
  "Your Role",
  "Location",
  "Lenovo Journey",
  "Your customer/biz team",
  "Previous Work Experience",
  "Hobbies",
  "Family / Life",
  "I'd like to support if you need",
  "Other things you'd like to share"
];

const memberGrid = document.querySelector("#memberGrid");
const spotlightPanel = document.querySelector("#spotlightPanel");
const shuffleButton = document.querySelector("#shuffleButton");
const memberCardTemplate = document.querySelector("#memberCardTemplate");
const introText = document.querySelector(".intro-strip p");
const memberModal = document.querySelector("#memberModal");
const memberModalBody = document.querySelector("#memberModalBody");
const memberModalClose = document.querySelector("#memberModalClose");

const configuredAssetBasePath = String(appConfig.assetBasePath ?? "").trim().replace(/\/+$/, "");
const preferredOrder = [
  "Lilian Liao",
  "Xin Zhang",
  "Amy Zhang",
  "Peter Francis",
  "Alison Hollander",
  "Cassidy Zhang"
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeText(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\/a:t/gi, " ")
    .replace(/锛\?/g, ": ")
    .replace(/锛/g, ": ")
    .replace(/聽/g, " ")
    .replace(/鈥檇|鈥榙/g, "'d")
    .replace(/鈥檚/g, "'s")
    .replace(/鈥檙e/g, "'re")
    .replace(/鈥檛/g, "n't")
    .replace(/鈥檒l/g, "'ll")
    .replace(/鈥檝e/g, "'ve")
    .replace(/I鈥檓/g, "I'm")
    .replace(/I鈥檝e/g, "I've")
    .replace(/I鈥檒l/g, "I'll")
    .replace(/I鈥檇/g, "I'd")
    .replace(/鈥揵ody鈥搒pirit/g, "mind-body-spirit")
    .replace(/鈥\?/g, "-")
    .replace(/[馃飦][\p{L}\p{N}]*/gu, " ")
    .replace(/[^\p{L}\p{N}\p{P}\p{Zs}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSegments(paragraph) {
  let normalized = sanitizeText(paragraph);

  splitLabels.forEach((label) => {
    const pattern = new RegExp(`\\s+(${escapeRegExp(label)}\\s*:?)`, "gi");
    normalized = normalized.replace(pattern, "|||$1");
    const tightPattern = new RegExp(`([^\\s])(${escapeRegExp(label)}\\s*:?)`, "gi");
    normalized = normalized.replace(tightPattern, "$1|||$2");
  });

  return normalized
    .split("|||")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function isFieldSegment(segment) {
  return fieldDefinitions.some(({ pattern }) => pattern.test(segment));
}

function looksLikeName(segment) {
  if (!segment || isFieldSegment(segment)) {
    return false;
  }

  if (/^Your Lifestyle Photo$/i.test(segment) || /^Name$/i.test(segment)) {
    return false;
  }

  if (segment.length > 60 || /\d/.test(segment)) {
    return false;
  }

  const words = segment.split(/\s+/);
  return words.length >= 2 && words.length <= 5 && /^[\p{L}.' -]+$/u.test(segment);
}

function appendField(fields, key, value) {
  if (!value) {
    return;
  }

  fields[key] = fields[key] ? `${fields[key]} ${value}` : value;
}

function buildAssetPath(path) {
  const normalizedPath = String(path ?? "").replace(/^\.\//, "");

  if (!configuredAssetBasePath) {
    return `./${normalizedPath}`;
  }

  return `${configuredAssetBasePath}/${normalizedPath}`;
}

function toMediaPath(fileName) {
  return fileName ? buildAssetPath(`temp_pptx/ppt/media/${fileName}`) : "";
}

function toThumbnailPath(fileName) {
  if (!fileName) {
    return "";
  }

  const baseName = String(fileName).replace(/\.[^.]+$/, "");
  return buildAssetPath(`thumbnails/${baseName}.jpg`);
}

function resolveMemberMedia(name, images) {
  const candidates = Array.isArray(images)
    ? images
    : typeof images === "string"
      ? [images]
      : [];

  if (name === "Helen Gu") {
    return {
      primaryImage: toThumbnailPath("image11.png") || toMediaPath("image11.png"),
      detailImage: toThumbnailPath("image10.jpeg") || toMediaPath("image10.jpeg"),
      accentImage: toThumbnailPath("image11.png") || toMediaPath("image11.png"),
      detailImageClass: "detail-portrait__main--contain",
      fallbackImage: toMediaPath("image10.jpeg"),
      cardFrameClass: "",
      cardImageClass: "",
      detailPortraitClass: ""
    };
  }

  if (name === "Sabyasachi Acharya") {
    const landscapeImage = buildAssetPath("thumbnails/image31-landscape.jpg");

    return {
      primaryImage: landscapeImage,
      detailImage: landscapeImage,
      accentImage: "",
      detailImageClass: "detail-portrait__main--landscape",
      fallbackImage: toMediaPath("image31.jpeg"),
      cardFrameClass: "",
      cardImageClass: "portrait-image--landscape-focus",
      detailPortraitClass: "detail-portrait--landscape"
    };
  }

  const preferred = candidates.find((image) => /\.(png|jpe?g|webp|gif)$/i.test(image));
  const thumbnailImage = toThumbnailPath(preferred);
  const mediaImage = toMediaPath(preferred);

  return {
    primaryImage: thumbnailImage || mediaImage,
    detailImage: thumbnailImage || mediaImage,
    accentImage: "",
    detailImageClass: "",
    fallbackImage: mediaImage,
    cardFrameClass: "",
    cardImageClass: "",
    detailPortraitClass: ""
  };
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function shorten(value, maxLength = 180) {
  if (!value || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseSlide(slide, id) {
  const paragraphs = (slide.paragraphs ?? []).map(sanitizeText).filter(Boolean);
  const segments = paragraphs.flatMap(splitSegments).filter(Boolean);
  const name = paragraphs.find((paragraph) => {
    if (
      /^Your Lifestyle Photo$/i.test(paragraph) ||
      /^Name$/i.test(paragraph) ||
      /^Lenovo Journey/i.test(paragraph) ||
      /^Your customer\/biz team/i.test(paragraph) ||
      /^Previous Work Experience/i.test(paragraph) ||
      /^Hobbies/i.test(paragraph) ||
      /^Family \/ Life/i.test(paragraph) ||
      /^I'd like to support if you need/i.test(paragraph) ||
      /^Other things you'd like to share/i.test(paragraph) ||
      isFieldSegment(paragraph)
    ) {
      return false;
    }

    return looksLikeName(paragraph);
  });

  if (!name || /^Name$/i.test(name)) {
    return null;
  }

  const fields = {};
  const extras = [];
  let currentField = "";

  segments.forEach((segment) => {
    if (segment === name || /^Your Lifestyle Photo$/i.test(segment)) {
      return;
    }

    const match = fieldDefinitions.find(({ pattern }) => pattern.test(segment));

    if (match) {
      const value = segment.replace(match.pattern, "").trim();
      currentField = match.key;
      appendField(fields, match.key, value);
      return;
    }

    if (currentField) {
      appendField(fields, currentField, segment);
    } else {
      extras.push(segment);
    }
  });

  const fallbackRole = extras.find((segment) => /HR|Partner|Director|PMO|Learning/i.test(segment)) || "TSD HR";
  const fallbackLocation = extras.find((segment) => /China|USA|India|Brazil|Malaysia|England|Slovakia|Beijing|Bangalore|Tianjin/i.test(segment)) || "Global";
  const role = fields.role || fallbackRole;
  const location = fields.location || fallbackLocation;
  const journey = fields.journey || "Shared in the team deck";
  const customerTeam = fields.customerTeam || "See spotlight for business coverage.";
  const previousWorkExperience = fields.previousWorkExperience || "Shared in the team deck.";
  const hobbies = fields.hobbies || "See spotlight for personal interests.";
  const familyLife = fields.familyLife || "Shared where comfortable.";
  const support = fields.support || "Happy to connect and support across the team.";
  const other = fields.other || extras.join(" ");
  const media = resolveMemberMedia(name, slide.images);

  return {
    id,
    name,
    role,
    location,
    tagline: shorten(support || customerTeam, 110),
    bio: `${journey}. ${customerTeam}. ${previousWorkExperience}`,
    details: [
      { title: "Lenovo Journey", content: journey },
      { title: "Business Team", content: customerTeam },
      { title: "Previous Work Experience", content: previousWorkExperience },
      { title: "Hobbies", content: hobbies },
      { title: "Family / Life", content: familyLife },
      { title: "I'd Like To Support", content: support },
      { title: "Other Things To Share", content: other || "No extra notes shared in the deck." }
    ],
    facts: [
      `Business Team: ${shorten(customerTeam, 180)}`,
      `Lenovo Journey: ${shorten(journey, 120)}`,
      `Previous Work: ${shorten(previousWorkExperience, 180)}`,
      `Hobbies: ${shorten(hobbies, 140)}`,
      `Family / Life: ${shorten(familyLife, 140)}`,
      `Support: ${shorten(support, 160)}`,
      other ? `More: ${shorten(other, 160)}` : ""
    ].filter(Boolean),
    image: media.primaryImage,
    detailImage: media.detailImage,
    accentImage: media.accentImage,
    detailImageClass: media.detailImageClass,
    fallbackImage: media.fallbackImage,
    cardFrameClass: media.cardFrameClass,
    cardImageClass: media.cardImageClass,
    detailPortraitClass: media.detailPortraitClass,
    palette: palettes[(id - 1) % palettes.length],
    initials: getInitials(name)
  };
}

function sortMembersByPreferredOrder(items) {
  const rank = new Map(preferredOrder.map((name, index) => [name, index]));

  return [...items].sort((left, right) => {
    const leftRank = rank.has(left.name) ? rank.get(left.name) : Number.POSITIVE_INFINITY;
    const rightRank = rank.has(right.name) ? rank.get(right.name) : Number.POSITIVE_INFINITY;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.id - right.id;
  });
}

const members = sortMembersByPreferredOrder(
  rawSlides
  .filter((slide) => slide)
  .map((slide, index) => parseSlide(slide, index + 1))
  .filter(Boolean)
).map((member, index) => ({
  ...member,
  id: index + 1,
  palette: palettes[index % palettes.length]
}));

let activeMemberId = members[0]?.id ?? null;
let openMemberId = null;

if (introText) {
  introText.textContent = "Click to shuffle and change the spotlight member.";
}

if (shuffleButton) {
  shuffleButton.disabled = members.length < 2;
}

function attachImageFallback(image, fallbackImage) {
  if (!(image instanceof HTMLImageElement)) {
    return;
  }

  image.addEventListener("error", () => {
    if (fallbackImage && image.dataset.fallbackApplied !== "true" && image.src !== fallbackImage) {
      image.dataset.fallbackApplied = "true";
      image.src = fallbackImage;
      return;
    }

    image.hidden = true;
    const frame = image.closest(".portrait-frame, .spotlight-photo, .detail-portrait");
    frame?.classList.remove("has-image");
    frame?.querySelector(".portrait-fill, .image-fallback")?.removeAttribute("hidden");
  });
}

function renderSpotlight(member) {
  const visual = `
    ${member.image ? `<img class="spotlight-image" src="${member.image}" alt="${member.name}" />` : ""}
    <div class="spotlight-portrait image-fallback" ${member.image ? "hidden" : ""}>${member.initials}</div>
  `;

  const photoStyle = `style="background: ${member.palette};"`;

  spotlightPanel.innerHTML = `
    <div class="spotlight-photo" ${photoStyle}>
      ${visual}
    </div>
    <p class="spotlight-role">${member.role}</p>
    <h2 class="spotlight-name">${member.name}</h2>
    <p class="spotlight-location">${member.location}</p>
    <ul class="fact-list">
      ${member.facts.map((fact) => `<li>${fact}</li>`).join("")}
    </ul>
  `;

  attachImageFallback(spotlightPanel.querySelector(".spotlight-image"), member.fallbackImage);
}

function renderMembers() {
  memberGrid.innerHTML = "";

  members.forEach((member) => {
    const card = memberCardTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.memberId = String(member.id);
    card.classList.toggle("is-active", member.id === activeMemberId);

    const portraitFrame = card.querySelector(".portrait-frame");
    const portraitImage = card.querySelector(".portrait-image");
    const portraitFill = card.querySelector(".portrait-fill");

    portraitFrame.className = `portrait-frame ${member.cardFrameClass || ""}`.trim();
    portraitImage.className = `portrait-image ${member.cardImageClass || ""}`.trim();
    portraitFrame.classList.toggle("has-image", Boolean(member.image));
    portraitImage.hidden = !member.image;
    portraitImage.src = member.image || "";
    portraitImage.alt = member.name;
    portraitFill.style.background = member.palette;
    portraitFill.hidden = Boolean(member.image);
    attachImageFallback(portraitImage, member.fallbackImage);

    card.querySelector(".portrait-initials").textContent = member.initials;
    card.querySelector(".member-role").textContent = member.role;
    card.querySelector(".member-name").textContent = member.name;

    card.addEventListener("click", () => {
      activeMemberId = member.id;
      renderSpotlight(member);
      renderMembers();
      openMemberDetail(member.id);
    });

    memberGrid.appendChild(card);
  });
}

function renderMemberModal(member) {
  const detailSections = member.details
    .filter((section) => section.content)
    .map(
      (section) => `
        <article class="detail-section">
          <h3>${escapeHtml(section.title)}</h3>
          <p>${escapeHtml(section.content)}</p>
        </article>
      `
    )
    .join("");

  memberModalBody.innerHTML = `
    <div class="detail-hero">
      <div class="detail-portrait ${member.accentImage ? "detail-portrait--stacked" : ""} ${member.detailPortraitClass || ""}" style="background: ${member.palette};">
        ${member.detailImage ? `<img class="${member.detailImageClass || ""}" src="${member.detailImage}" alt="${escapeHtml(member.name)}" />` : ""}
        <div class="spotlight-portrait image-fallback" ${member.detailImage ? "hidden" : ""}>${escapeHtml(member.initials)}</div>
        ${member.accentImage ? `<img class="detail-portrait__accent" src="${member.accentImage}" alt="" />` : ""}
      </div>
      <div class="detail-summary">
        <p class="detail-role">${escapeHtml(member.role)}</p>
        <h2 id="memberModalTitle">${escapeHtml(member.name)}</h2>
        <p class="detail-location">${escapeHtml(member.location)}</p>
      </div>
    </div>
    <div class="detail-sections">
      ${detailSections}
    </div>
  `;

  attachImageFallback(memberModalBody.querySelector(".detail-portrait img:not(.detail-portrait__accent)"), member.fallbackImage);
}

function openMemberDetail(memberId) {
  const member = members.find((entry) => entry.id === memberId);

  if (!member) {
    return;
  }

  openMemberId = memberId;
  renderMemberModal(member);
  memberModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeMemberDetail() {
  openMemberId = null;
  memberModal.hidden = true;
  document.body.style.overflow = "";
}

function shuffleSpotlight() {
  if (members.length < 2) {
    return;
  }

  const otherMembers = members.filter((member) => member.id !== activeMemberId);
  const randomIndex = Math.floor(Math.random() * otherMembers.length);
  const nextMember = otherMembers[randomIndex];

  activeMemberId = nextMember.id;
  renderSpotlight(nextMember);
  renderMembers();
}

shuffleButton?.addEventListener("click", shuffleSpotlight);

memberModal?.addEventListener("click", (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && target.dataset.closeModal === "true") {
    closeMemberDetail();
  }
});

memberModalClose?.addEventListener("click", closeMemberDetail);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && openMemberId !== null) {
    closeMemberDetail();
  }
});

if (members.length > 0) {
  renderSpotlight(members[0]);
  renderMembers();
} else {
  spotlightPanel.innerHTML = "<p class=\"spotlight-bio\">No team member data was imported from the presentation.</p>";
}
