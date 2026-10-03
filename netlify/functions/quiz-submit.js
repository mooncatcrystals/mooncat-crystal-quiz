// Receives a quiz result from index.html and tags the subscriber in Flodesk.
// The Flodesk API key lives only here (server-side env var) — never in the
// public HTML/JS — so it can't be read out of the page source.

const FLODESK_API_URL = "https://api.flodesk.com/v1/subscribers";

// Segmentation strategy: tag at the THEME level (6 groups), not one segment
// per crystal (14) — 6 nurture tracks are maintainable, 14 aren't. The exact
// crystal still gets stored as a custom field for merge-tag personalization
// inside whichever theme sequence the subscriber lands in.
//
// One-time setup in Flodesk (Audience > Segments > New Segment, no rules):
//   Quiz: Self-Love & Heart          -> FLODESK_SEGMENT_HEART_SELF_LOVE
//   Quiz: Calm & Clarity             -> FLODESK_SEGMENT_CALM_CLARITY
//   Quiz: Confidence & Abundance     -> FLODESK_SEGMENT_CONFIDENCE_ABUNDANCE
//   Quiz: Protection & Boundaries    -> FLODESK_SEGMENT_PROTECTION_BOUNDARIES
//   Quiz: Motivation & Action        -> FLODESK_SEGMENT_MOTIVATION_ACTION
//   Quiz: Intuition & Transformation -> FLODESK_SEGMENT_INTUITION_TRANSFORMATION
// Paste each new segment's id into the matching Netlify env var below.
// Until a given one is set, that theme's subscribers still get created and
// tagged into the master list — they just won't get the theme tag yet.
const THEME_SEGMENT_ENV_KEYS = {
  heart_self_love: "FLODESK_SEGMENT_HEART_SELF_LOVE",
  calm_clarity: "FLODESK_SEGMENT_CALM_CLARITY",
  confidence_abundance: "FLODESK_SEGMENT_CONFIDENCE_ABUNDANCE",
  protection_boundaries: "FLODESK_SEGMENT_PROTECTION_BOUNDARIES",
  motivation_action: "FLODESK_SEGMENT_MOTIVATION_ACTION",
  intuition_transformation: "FLODESK_SEGMENT_INTUITION_TRANSFORMATION"
};

// "find your crystal lead" — the existing master segment for everyone who
// takes the quiz, regardless of result. Override with FLODESK_SEGMENT_MASTER
// if you'd rather use a different one.
const DEFAULT_MASTER_SEGMENT_ID = "6446e192d63ae7706486daaa";

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Invalid JSON" }) };
  }

  const email = (payload.email || "").trim();
  const firstName = (payload.firstName || "").trim();
  const resultKey = payload.resultKey;
  const themeKey = payload.themeKey;
  const crystalName = (payload.crystalName || "").trim();
  const themeName = (payload.themeName || "").trim();
  const experienceLevel = (payload.experienceLevel || "").trim();

  if (!isValidEmail(email)) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Invalid email" }) };
  }
  if (!THEME_SEGMENT_ENV_KEYS.hasOwnProperty(themeKey)) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Unknown themeKey" }) };
  }

  const apiKey = process.env.FLODESK_API_KEY;
  if (!apiKey) {
    console.error("FLODESK_API_KEY is not set in the Netlify environment.");
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Server not configured" }) };
  }

  const masterSegmentId = process.env.FLODESK_SEGMENT_MASTER || DEFAULT_MASTER_SEGMENT_ID;
  const themeSegmentId = process.env[THEME_SEGMENT_ENV_KEYS[themeKey]];

  const segmentIds = [masterSegmentId, themeSegmentId].filter(Boolean);

  const body = {
    email: email,
    segment_ids: segmentIds,
    custom_fields: {
      "Crystal Match": crystalName,
      "Crystal Theme": themeName,
      "Crystal Experience Level": experienceLevel
    }
  };
  if (firstName) body.first_name = firstName;

  try {
    const authHeader = "Basic " + Buffer.from(apiKey + ":").toString("base64");
    const response = await fetch(FLODESK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Flodesk API error", response.status, errText);
      return { statusCode: 502, body: JSON.stringify({ ok: false, error: "Flodesk API error" }) };
    }

    if (!themeSegmentId) {
      console.warn(
        `No Flodesk segment id configured for theme "${themeKey}" yet (set ${THEME_SEGMENT_ENV_KEYS[themeKey]} in Netlify env vars). Subscriber was still added to the master list.`
      );
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("Error calling Flodesk API", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Unexpected error" }) };
  }
};
