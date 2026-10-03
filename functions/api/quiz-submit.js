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
// Paste each new segment's id into the matching Cloudflare Pages env var below.
// Until a given one is set, that theme's subscribers still get created in
// Flodesk (and the master segment, if set) — they just won't get the theme tag yet.
const THEME_SEGMENT_ENV_KEYS = {
  heart_self_love: "FLODESK_SEGMENT_HEART_SELF_LOVE",
  calm_clarity: "FLODESK_SEGMENT_CALM_CLARITY",
  confidence_abundance: "FLODESK_SEGMENT_CONFIDENCE_ABUNDANCE",
  protection_boundaries: "FLODESK_SEGMENT_PROTECTION_BOUNDARIES",
  motivation_action: "FLODESK_SEGMENT_MOTIVATION_ACTION",
  intuition_transformation: "FLODESK_SEGMENT_INTUITION_TRANSFORMATION"
};

// Optional extra segment every quiz-taker joins, whatever their result.
// Off unless FLODESK_SEGMENT_MASTER is set. Don't point it at the old
// "find your crystal lead" segment: Flodesk's "Crystal Key Lead - MC"
// workflow fires on that one and sends the Crystal Key ebook.

// Readable values for the Crystal Experience Level field, so it reads well
// if it's ever dropped into an email.
const EXPERIENCE_LABELS = {
  beginner: "New to crystals",
  some_experience: "Some experience",
  experienced: "Experienced"
};

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function respond(status, data) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { "Content-Type": "application/json" }
  });
}

// Cloudflare Pages Function: served at /api/quiz-submit. Only POST is
// handled here; Cloudflare answers other methods with 405 on its own.
export async function onRequestPost(context) {
  const env = context.env;

  let payload;
  try {
    payload = await context.request.json();
  } catch (err) {
    return respond(400, { ok: false, error: "Invalid JSON" });
  }

  const email = (payload.email || "").trim();
  const firstName = (payload.firstName || "").trim();
  const resultKey = payload.resultKey;
  const themeKey = payload.themeKey;
  const crystalName = (payload.crystalName || "").trim();
  const themeName = (payload.themeName || "").trim();
  const experienceLevel = (payload.experienceLevel || "").trim();

  if (!isValidEmail(email)) {
    return respond(400, { ok: false, error: "Invalid email" });
  }
  if (!THEME_SEGMENT_ENV_KEYS.hasOwnProperty(themeKey)) {
    return respond(400, { ok: false, error: "Unknown themeKey" });
  }

  const apiKey = env.FLODESK_API_KEY;
  if (!apiKey) {
    console.error("FLODESK_API_KEY is not set in the Cloudflare Pages environment.");
    return respond(500, { ok: false, error: "Server not configured" });
  }

  const masterSegmentId = env.FLODESK_SEGMENT_MASTER;
  const themeSegmentId = env[THEME_SEGMENT_ENV_KEYS[themeKey]];

  const segmentIds = [masterSegmentId, themeSegmentId].filter(Boolean);

  const body = {
    email: email,
    segment_ids: segmentIds,
    // Keys are the field keys Flodesk gave the "Crystal Match", "Crystal
    // Theme" and "Crystal Experience Level" custom fields (created in a
    // draft form, since Flodesk only creates fields in the form builder).
    // Unregistered keys get stored but never show up in the email editor's
    // @ personalization menu.
    custom_fields: {
      crystalMatch: crystalName,
      crystalTheme: themeName,
      crystalExperienceLevel: EXPERIENCE_LABELS[experienceLevel] || experienceLevel
    }
  };
  if (firstName) body.first_name = firstName;

  try {
    const authHeader = "Basic " + btoa(apiKey + ":");
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
      return respond(502, { ok: false, error: "Flodesk API error" });
    }

    if (!themeSegmentId) {
      console.warn(
        `No Flodesk segment id configured for theme "${themeKey}" yet (set ${THEME_SEGMENT_ENV_KEYS[themeKey]} in Cloudflare Pages env vars). Subscriber was still created in Flodesk.`
      );
    }

    return respond(200, { ok: true });
  } catch (err) {
    console.error("Error calling Flodesk API", err);
    return respond(500, { ok: false, error: "Unexpected error" });
  }
}
