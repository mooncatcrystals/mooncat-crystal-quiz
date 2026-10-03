// Receives a quiz result from index.html and tags the subscriber in Flodesk.
// The Flodesk API key lives only here (server-side env var) — never in the
// public HTML/JS — so it can't be read out of the page source.
//
// Everything that ends up in the welcome email is built HERE from fixed
// text, keyed by which answers were picked. The page only sends answer keys,
// never text, so nobody can post their own message and have Flodesk email
// it to someone under Mooncat's name.

const FLODESK_API_URL = "https://api.flodesk.com/v1/subscribers";

// Segmentation strategy: tag at the THEME level (6 groups), not one segment
// per crystal (15) — 6 nurture tracks are maintainable, 15 aren't. The exact
// crystal still gets stored as a custom field for merge-tag personalization.
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

const THEME_NAMES = {
  heart_self_love: "Self-Love & Heart",
  calm_clarity: "Calm & Clarity",
  confidence_abundance: "Confidence & Abundance",
  protection_boundaries: "Protection & Boundaries",
  motivation_action: "Motivation & Action",
  intuition_transformation: "Intuition & Transformation"
};

// Optional extra segment every quiz-taker joins, whatever their result.
// Off unless FLODESK_SEGMENT_MASTER is set. Don't point it at the old
// "find your crystal lead" segment: Flodesk's "Crystal Key Lead - MC"
// workflow fires on that one and sends the Crystal Key ebook.

// Readable values for the Crystal Experience Level field.
const EXPERIENCE_LABELS = {
  beginner: "New to crystals",
  some_experience: "Some experience",
  experienced: "Experienced"
};

// ---------------------------------------------------------------------
// Welcome-email content, one entry per crystal (keys match CRYSTALS in
// index.html). The Crystal Quiz Welcome workflow drops these into one
// email with Flodesk's @ personalization.
//   situation: question 2's answer, reworded to "you" for "You told us ..."
//   need:      question 3's answer, reworded the same way
//   about:     why this crystal fits
//   place:     where to keep it, for people who said "keep it in my space"
//   tip:       one thing to do this week
//   notice:    what to look for by the end of the week
//   care:      crystal-specific care
// ---------------------------------------------------------------------
const CRYSTAL_EMAIL = {
  amethyst: {
    name: "Amethyst",
    theme: "calm_clarity",
    shopUrl: "https://www.mooncatcrystals.com/collections/amethyst-collection",
    situation: "your mind won't slow down, even when you're exhausted",
    need: "to turn the volume down on your anxious thoughts",
    about: "Amethyst is associated with calm and a quieter mind, and it's one of the most popular stones to keep by the bed for exactly that reason.",
    place: "on your nightstand or wherever you wind down",
    tip: "When your thoughts start racing, hold it and take three slow breaths before you do anything else.",
    notice: "notice whether it's getting easier to switch off at night.",
    care: "Keep Amethyst out of direct sunlight, since its purple can fade over time. A rinse under water or a night on a selenite plate is all it needs to reset."
  },
  selenite: {
    name: "Selenite",
    theme: "calm_clarity",
    shopUrl: "https://www.mooncatcrystals.com/collections/selenite",
    situation: "your space or your energy feels heavy and cluttered",
    need: "to clear the heaviness stuck in your head or your space",
    about: "Selenite is associated with clearing and resetting, for your space and for your other crystals. It's the stone people use when things feel cluttered and they want a fresh start.",
    place: "near your front door or in the room that feels most cluttered",
    tip: "Once this week, set your other crystals on it overnight to reset them.",
    notice: "notice how the space feels when you walk in.",
    care: "Keep Selenite dry. It's soft and water damages it, so never rinse or soak it; wipe off dust with a dry cloth. It doesn't need cleansing itself, since it's what people use to cleanse their other crystals."
  },
  clear_quartz: {
    name: "Clear Quartz",
    theme: "calm_clarity",
    shopUrl: "https://www.mooncatcrystals.com/collections/quartz-1",
    situation: "you want one crystal that amplifies everything else you're doing",
    need: "one thing that sharpens your focus and makes your intentions stick",
    about: "Clear Quartz is known as the amplifier. It's associated with focus and intention, and it works alongside any other crystal you already own.",
    place: "on your desk or wherever you plan your day",
    tip: "Write down one intention, set the quartz on top of it, and leave it there all week.",
    notice: "check in on that intention and see what moved.",
    care: "Clear Quartz is hard and easy to care for. Rinse it under water, or reset it on a selenite plate or in moonlight."
  },
  fluorite: {
    name: "Fluorite",
    theme: "calm_clarity",
    shopUrl: "https://www.mooncatcrystals.com/collections/fluorite",
    situation: "you have too much going on and can't focus on any of it",
    need: "to sort out the mental clutter so you can think straight",
    about: "Fluorite is associated with focus and mental order. It's the stone people keep on their desk when their thinking feels scattered.",
    place: "on your desk or wherever you work and plan",
    tip: "Before you start a task, hold it for a minute and pick the one thing you're doing first.",
    notice: "look at what you actually finished.",
    care: "Fluorite is soft and can chip or fade, so keep it out of direct sun and away from water. Reset it on a selenite plate instead of rinsing it."
  },
  citrine: {
    name: "Citrine",
    theme: "confidence_abundance",
    shopUrl: "https://www.mooncatcrystals.com/collections/citrine",
    situation: "you're working toward more money or a bigger goal",
    need: "to finally say “why not me” and go for it",
    about: "Citrine is associated with confidence, optimism and abundance. It's the stone people reach for when they're ready to go after something bigger.",
    place: "on your desk, near where you work on money or goals",
    tip: "Write down the bigger thing you want to go after and keep the citrine with it.",
    notice: "notice one step you took toward it that you'd normally have put off.",
    care: "Keep Citrine out of strong direct sunlight to protect its color. A quick rinse or a night on a selenite plate resets it."
  },
  pyrite: {
    name: "Pyrite",
    theme: "confidence_abundance",
    shopUrl: "https://www.mooncatcrystals.com/collections/pyrite",
    situation: "you're building a business or a big goal, and you're taking it seriously",
    need: "to protect what you're building while you build it",
    about: "Pyrite is associated with abundance and protection together: building something real and guarding it while you do.",
    place: "on your desk or wherever money and business conversations happen",
    tip: "Keep it in sight while you work on the thing you're building.",
    notice: "note one thing you protected this week: your time, your prices, or your focus.",
    care: "Keep Pyrite dry. Water and humidity can make it rust or tarnish, so reset it on a selenite plate instead of rinsing it."
  },
  tigers_eye: {
    name: "Tiger's Eye",
    theme: "confidence_abundance",
    shopUrl: "https://www.mooncatcrystals.com/collections/tigers-eye",
    situation: "you're in the middle of something long-term and need to stay disciplined",
    need: "to keep showing up after the excitement fades",
    about: "Tiger's Eye is associated with steady confidence and follow-through. It's the stone for the long middle stretch of a goal, after the excitement wears off.",
    place: "wherever you work on your long-term goal",
    tip: "Hold it at the start of each work session and commit to showing up for just that one session.",
    notice: "count how many days you showed up.",
    care: "Tiger's Eye is durable. Rinse it under water and dry it right away, or reset it on a selenite plate."
  },
  carnelian: {
    name: "Carnelian",
    theme: "motivation_action",
    shopUrl: "https://www.mooncatcrystals.com/collections/carnelian",
    situation: "you need courage to take the next step",
    need: "to stop overthinking and start doing",
    about: "Carnelian is associated with motivation, courage and getting moving. It's the stone people reach for when they're stuck between deciding and doing.",
    place: "somewhere you'll see it first thing in the morning",
    tip: "Each morning, pick one small thing you've been putting off and do it before lunch.",
    notice: "notice how many of those small things actually got done.",
    care: "Carnelian is durable and easy to keep. Rinse it under water, or set it in the sun for a little while to reset it."
  },
  black_tourmaline: {
    name: "Black Tourmaline",
    theme: "protection_boundaries",
    shopUrl: "https://www.mooncatcrystals.com/collections/black-tourmaline",
    situation: "you keep giving your energy to people and things that drain you",
    need: "to stop absorbing everyone else's stress",
    about: "Black Tourmaline is the stone most people reach for to protect their energy. It's associated with grounding and with drawing a line between your energy and everyone else's.",
    place: "by your front door or on your desk, wherever the draining stuff tends to land",
    tip: "When you notice you've picked up someone else's mood, look at it and ask yourself whether the feeling is actually yours.",
    notice: "notice which days felt lighter.",
    care: "Black Tourmaline is tough and easy to keep. Rinse it under water or set it on a selenite plate to reset it. Raw pieces can shed small splinters, so keep them somewhere they won't get knocked around."
  },
  smoky_quartz: {
    name: "Smoky Quartz",
    theme: "protection_boundaries",
    shopUrl: "https://www.mooncatcrystals.com/collections/smoky-quartz",
    situation: "everything feels heavy and you need to release something",
    need: "to let go of what you've been carrying",
    about: "Smoky Quartz is associated with grounding and letting go. It's the stone people use when they're ready to put something heavy down.",
    place: "somewhere quiet where you can sit with it for a minute",
    tip: "Hold it and name, out loud or on paper, one thing you're ready to stop carrying.",
    notice: "notice whether that thing takes up less room in your head.",
    care: "Keep Smoky Quartz out of strong sunlight, which can lighten it over time. Rinse it under water or reset it on a selenite plate."
  },
  obsidian: {
    name: "Obsidian",
    theme: "protection_boundaries",
    shopUrl: "https://www.mooncatcrystals.com/collections/obsidian",
    situation: "there's something you keep avoiding that you know you need to face",
    need: "to see your situation clearly, even the parts you've been avoiding",
    about: "Obsidian is volcanic glass, and it's associated with protection and honesty: seeing a situation as it really is, including the parts that are easy to look away from.",
    place: "by your bed or your front door",
    tip: "Hold it while you journal for five minutes about the thing you've been putting off.",
    notice: "decide on one small step toward facing it.",
    care: "Obsidian is glass, so it can chip if it's dropped, and raw pieces can have sharp edges. Rinse it under water and dry it, or reset it on a selenite plate."
  },
  rose_quartz: {
    name: "Rose Quartz",
    theme: "heart_self_love",
    shopUrl: "https://www.mooncatcrystals.com/collections/rose-quartz",
    situation: "you're working on loving yourself again",
    need: "to be kinder to yourself",
    about: "Rose Quartz is the stone of self-love. It's associated with gentleness, compassion and a softer way of talking to yourself.",
    place: "by your mirror or on your nightstand",
    tip: "Each time you catch yourself being hard on yourself, look at it and say the kinder version instead.",
    notice: "notice whether that voice in your head sounds any different.",
    care: "Keep Rose Quartz out of direct sunlight, since its pink can fade. Rinse it under water or reset it on a selenite plate."
  },
  moonstone: {
    name: "Moonstone",
    theme: "intuition_transformation",
    shopUrl: "https://www.mooncatcrystals.com/collections/moonstone",
    situation: "you're in a big transition and want to trust the process",
    need: "to feel steady while everything around you changes",
    about: "Moonstone is associated with new beginnings, cycles and intuition. It's the stone people keep close during a change, when they want to feel steady.",
    place: "on your nightstand or near a window where it catches the light",
    tip: "When things feel uncertain, hold it and remind yourself that this is a phase, not forever.",
    notice: "notice what's felt steadier.",
    care: "Moonstone is fairly soft, so store it apart from harder crystals to avoid scratches. Reset it in moonlight or on a selenite plate, and skip long soaks."
  },
  labradorite: {
    name: "Labradorite",
    theme: "intuition_transformation",
    shopUrl: "https://www.mooncatcrystals.com/collections/labradorite",
    situation: "you're starting something new and want to trust your intuition",
    need: "to feel brave enough to become who you're changing into",
    about: "Labradorite is associated with intuition and transformation. It's the stone for the in-between, when you're becoming someone new.",
    place: "where you'll see it when you start your day",
    tip: "Before a decision, hold it for a moment and notice your first gut answer before you talk yourself out of it.",
    notice: "look back at which gut answers turned out right.",
    care: "Store Labradorite where it won't get scratched, since scratches dull its flash. Wipe it with a soft cloth, reset it on a selenite plate, and skip long soaks."
  },
  malachite: {
    name: "Malachite",
    theme: "intuition_transformation",
    shopUrl: "https://www.mooncatcrystals.com/collections/malachite",
    situation: "you're done managing the same pattern and want it gone for good",
    need: "to let go of a pattern you keep repeating, for good",
    about: "Malachite is associated with deep change. It's the stone people work with when they want to break a pattern for good, not just manage it.",
    place: "near where you journal or reflect",
    tip: "Hold it while you write down the pattern you want gone and what usually sets it off.",
    notice: "notice one moment when you caught the pattern before it ran its course.",
    care: "Keep Malachite dry. Polished pieces are safe to handle, but raw malachite can shed dust, so wash your hands after handling it and never put it in water or elixirs. Reset it on a selenite plate."
  }
};

// The first sentence of "Your first week with it" depends on how they said
// they want to use the crystal (question 4 in index.html).
const FORM_OPENERS = {
  jewelry: "Since you'd like to wear it, put it on each morning and let it be a reminder every time you notice it.",
  carry: "Since you'd like to carry it, keep a small piece in your pocket or bag and hold it for a moment whenever you reach for it.",
  ritual: "Since you'd like to work with it directly, hold it for a few minutes each morning and set one simple intention for the day."
};

function firstWeekText(crystal, formPreference) {
  const opener = formPreference === "space" || !FORM_OPENERS[formPreference]
    ? "Keep it " + crystal.place + "."
    : FORM_OPENERS[formPreference];
  return opener + " " + crystal.tip + " By the end of the week, " + crystal.notice;
}

function whyText(crystal, situationKey, needKey) {
  const situation = CRYSTAL_EMAIL[situationKey] && CRYSTAL_EMAIL[situationKey].situation;
  const need = CRYSTAL_EMAIL[needKey] && CRYSTAL_EMAIL[needKey].need;
  if (!situation || !need) return crystal.about;
  return "You told us " + situation + ", and that what you need most is " + need + ". " + crystal.about;
}

// First names go into an email Flodesk sends, so only accept something that
// looks like a name (letters, spaces, hyphens, apostrophes). Anything
// else, like a URL, is dropped and the email falls back to "Hi there".
function cleanFirstName(name) {
  const trimmed = (name || "").trim();
  if (!trimmed || trimmed.length > 40) return "";
  if (!/^[\p{L}][\p{L}\p{M} '’-]*$/u.test(trimmed)) return "";
  return trimmed;
}

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
  const firstName = cleanFirstName(payload.firstName);
  const crystal = CRYSTAL_EMAIL.hasOwnProperty(payload.resultKey) ? CRYSTAL_EMAIL[payload.resultKey] : null;
  const experienceLevel = EXPERIENCE_LABELS[payload.experienceLevel] || "";

  if (!isValidEmail(email)) {
    return respond(400, { ok: false, error: "Invalid email" });
  }
  if (!crystal) {
    return respond(400, { ok: false, error: "Unknown resultKey" });
  }

  const apiKey = env.FLODESK_API_KEY;
  if (!apiKey) {
    console.error("FLODESK_API_KEY is not set in the Cloudflare Pages environment.");
    return respond(500, { ok: false, error: "Server not configured" });
  }

  const masterSegmentId = env.FLODESK_SEGMENT_MASTER;
  const themeSegmentId = env[THEME_SEGMENT_ENV_KEYS[crystal.theme]];

  const segmentIds = [masterSegmentId, themeSegmentId].filter(Boolean);

  const body = {
    email: email,
    segment_ids: segmentIds,
    // Keys are the field keys Flodesk gave the custom fields Kristen created
    // in a draft form (Flodesk only creates fields in the form builder).
    // Unregistered keys get stored but never show up in the email editor's
    // @ personalization menu.
    custom_fields: {
      crystalMatch: crystal.name,
      crystalTheme: THEME_NAMES[crystal.theme],
      crystalExperienceLevel: experienceLevel,
      crystalWhy: whyText(crystal, payload.situationKey, payload.needKey),
      crystalFirstWeek: firstWeekText(crystal, payload.formPreference),
      crystalCare: crystal.care,
      crystalShopLink: crystal.shopUrl
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
        `No Flodesk segment id configured for theme "${crystal.theme}" yet (set ${THEME_SEGMENT_ENV_KEYS[crystal.theme]} in Cloudflare Pages env vars). Subscriber was still created in Flodesk.`
      );
    }

    return respond(200, { ok: true });
  } catch (err) {
    console.error("Error calling Flodesk API", err);
    return respond(500, { ok: false, error: "Unexpected error" });
  }
}
