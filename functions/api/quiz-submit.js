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
//   care:      crystal-specific care. Water is ONLY for washing off dust, and
//              only for quartz-family stones; never as a way to cleanse
//              (Kristen doesn't support that). Cleansing = selenite plate,
//              moonlight, sound or smoke.
//   keywords:  three-word association, also shown on the result page
// ---------------------------------------------------------------------
const CRYSTAL_EMAIL = {
  amethyst: {
    name: "Amethyst",
    keywords: "Calm · Sleep · Intuition",
    theme: "calm_clarity",
    shopUrl: "https://www.mooncatcrystals.com/collections/amethyst-collection",
    situation: "your mind won't slow down, even when you're exhausted",
    need: "to turn the volume down on your anxious thoughts",
    about: "Amethyst is associated with calm and a quieter mind, and it's one of the most popular stones to keep by the bed for exactly that reason.",
    place: "on your nightstand or wherever you wind down",
    tip: "When your thoughts start racing, hold it and take three slow breaths before you do anything else.",
    notice: "notice whether it's getting easier to switch off at night.",
    care: "Keep Amethyst out of direct sunlight, since its purple can fade over time. If it gets dusty, a quick rinse under cool water is fine. To cleanse it, set it on a selenite plate or in moonlight."
  },
  selenite: {
    name: "Selenite",
    keywords: "Cleansing · Clarity · Peace",
    theme: "calm_clarity",
    shopUrl: "https://www.mooncatcrystals.com/collections/selenite",
    situation: "your space or your energy feels heavy and cluttered",
    need: "to clear the heaviness stuck in your head or your space",
    about: "Selenite is associated with clearing and cleansing, for your space and for your other crystals. It's the stone people use when things feel cluttered and they want a fresh start.",
    place: "near your front door or in the room that feels most cluttered",
    tip: "Once this week, set your other crystals on it overnight to cleanse them.",
    notice: "notice how the space feels when you walk in.",
    care: "Keep Selenite completely dry. It's very soft and water damages it, so never rinse or soak it; just dust it with a dry cloth. To cleanse it, use moonlight or sound, like a singing bowl."
  },
  clear_quartz: {
    name: "Clear Quartz",
    keywords: "Amplifying · Focus · Intention",
    theme: "calm_clarity",
    shopUrl: "https://www.mooncatcrystals.com/collections/quartz-1",
    situation: "you want one crystal that amplifies everything else you're doing",
    need: "one thing that sharpens your focus and makes your intentions stick",
    about: "Clear Quartz is known as the amplifier. It's associated with focus and intention, and it works alongside any other crystal you already own.",
    place: "on your desk or wherever you plan your day",
    tip: "Write down one intention, set the quartz on top of it, and leave it there all week.",
    notice: "check in on that intention and see what moved.",
    care: "Clear Quartz is easy to care for. If it gets dusty, a quick rinse under cool water is fine. Keep spheres out of sunny windows, since they can focus light. To cleanse it, use a selenite plate or moonlight."
  },
  fluorite: {
    name: "Fluorite",
    keywords: "Focus · Clarity · Organization",
    theme: "calm_clarity",
    shopUrl: "https://www.mooncatcrystals.com/collections/fluorite",
    situation: "you have too much going on and can't focus on any of it",
    need: "to sort out the mental clutter so you can think straight",
    about: "Fluorite is associated with focus and mental order. It's the stone people keep on their desk when their thinking feels scattered.",
    place: "on your desk or wherever you work and plan",
    tip: "Before you start a task, hold it for a minute and pick the one thing you're doing first.",
    notice: "look at what you actually finished.",
    care: "Fluorite is soft and chips easily, and its color can fade in direct sun. Keep it dry and out of sunlight, and dust it with a soft cloth. To cleanse it, set it on a selenite plate."
  },
  citrine: {
    name: "Citrine",
    keywords: "Abundance · Confidence · Optimism",
    theme: "confidence_abundance",
    shopUrl: "https://www.mooncatcrystals.com/collections/citrine",
    situation: "you're working toward more money or a bigger goal",
    need: "to finally say “why not me” and go for it",
    about: "Citrine is associated with confidence, optimism and abundance. It's the stone people reach for when they're ready to go after something bigger.",
    place: "on your desk, near where you work on money or goals",
    tip: "Write down the bigger thing you want to go after and keep the citrine with it.",
    notice: "notice one step you took toward it that you'd normally have put off.",
    care: "Keep Citrine out of strong direct sunlight to protect its color. If it gets dusty, a quick rinse under cool water is fine. To cleanse it, set it on a selenite plate or in moonlight."
  },
  pyrite: {
    name: "Pyrite",
    keywords: "Abundance · Protection · Willpower",
    theme: "confidence_abundance",
    shopUrl: "https://www.mooncatcrystals.com/collections/pyrite",
    situation: "you're building a business or a big goal, and you're taking it seriously",
    need: "to protect what you're building while you build it",
    about: "Pyrite is associated with abundance and protection together: building something real and guarding it while you do.",
    place: "on your desk or wherever money and business conversations happen",
    tip: "Keep it in sight while you work on the thing you're building.",
    notice: "note one thing you protected this week: your time, your prices, or your focus.",
    care: "Keep Pyrite dry. Water and humidity can make it rust or tarnish, so dust it with a dry cloth instead. It's brittle, so avoid drops. To cleanse it, set it on a selenite plate."
  },
  tigers_eye: {
    name: "Tiger's Eye",
    keywords: "Confidence · Courage · Follow-through",
    theme: "confidence_abundance",
    shopUrl: "https://www.mooncatcrystals.com/collections/tigers-eye",
    situation: "you're in the middle of something long-term and need to stay disciplined",
    need: "to keep showing up after the excitement fades",
    about: "Tiger's Eye is associated with steady confidence and follow-through. It's the stone for the long middle stretch of a goal, after the excitement wears off.",
    place: "wherever you work on your long-term goal",
    tip: "Hold it at the start of each work session and commit to showing up for just that one session.",
    notice: "count how many days you showed up.",
    care: "Tiger's Eye is durable. If it gets dusty, a quick rinse under cool water is fine; dry it right away. To cleanse it, set it on a selenite plate or in moonlight."
  },
  carnelian: {
    name: "Carnelian",
    keywords: "Motivation · Courage · Creativity",
    theme: "motivation_action",
    shopUrl: "https://www.mooncatcrystals.com/collections/carnelian",
    situation: "you need courage to take the next step",
    need: "to stop overthinking and start doing",
    about: "Carnelian is associated with motivation, courage and getting moving. It's the stone people reach for when they're stuck between deciding and doing.",
    place: "somewhere you'll see it first thing in the morning",
    tip: "Each morning, pick one small thing you've been putting off and do it before lunch.",
    notice: "notice how many of those small things actually got done.",
    care: "Carnelian is durable and easy to keep. If it gets dusty, a quick rinse under cool water is fine. To cleanse it, set it on a selenite plate or in moonlight."
  },
  black_tourmaline: {
    name: "Black Tourmaline",
    keywords: "Protection · Grounding · Boundaries",
    theme: "protection_boundaries",
    shopUrl: "https://www.mooncatcrystals.com/collections/black-tourmaline",
    situation: "you keep giving your energy to people and things that drain you",
    need: "to stop absorbing everyone else's stress",
    about: "Black Tourmaline is the stone most people reach for to protect their energy. It's associated with grounding and with drawing a line between your energy and everyone else's.",
    place: "by your front door or on your desk, wherever the draining stuff tends to land",
    tip: "When you notice you've picked up someone else's mood, look at it and ask yourself whether the feeling is actually yours.",
    notice: "notice which days felt lighter.",
    care: "Black Tourmaline is more delicate than it looks. It can split and shed splinters, especially raw pieces, so handle it gently. Keep it dry. To cleanse it, set it on a selenite plate."
  },
  smoky_quartz: {
    name: "Smoky Quartz",
    keywords: "Grounding · Release · Protection",
    theme: "protection_boundaries",
    shopUrl: "https://www.mooncatcrystals.com/collections/smoky-quartz",
    situation: "everything feels heavy and you need to release something",
    need: "to let go of what you've been carrying",
    about: "Smoky Quartz is associated with grounding and letting go. It's the stone people use when they're ready to put something heavy down.",
    place: "somewhere quiet where you can sit with it for a minute",
    tip: "Hold it and name, out loud or on paper, one thing you're ready to stop carrying.",
    notice: "notice whether that thing takes up less room in your head.",
    care: "Keep Smoky Quartz out of strong sunlight, which can lighten its color over time. If it gets dusty, a quick rinse under cool water is fine. To cleanse it, use a selenite plate or moonlight."
  },
  obsidian: {
    name: "Obsidian",
    keywords: "Protection · Truth · Grounding",
    theme: "protection_boundaries",
    shopUrl: "https://www.mooncatcrystals.com/collections/obsidian",
    situation: "there's something you keep avoiding that you know you need to face",
    need: "to see your situation clearly, even the parts you've been avoiding",
    about: "Obsidian is volcanic glass, and it's associated with protection and honesty: seeing a situation as it really is, including the parts that are easy to look away from.",
    place: "by your bed or your front door",
    tip: "Hold it while you journal for five minutes about the thing you've been putting off.",
    notice: "decide on one small step toward facing it.",
    care: "Obsidian is volcanic glass, so it can chip if it's dropped, and raw pieces can have sharp edges. Keep it dry. To cleanse it, set it on a selenite plate or in moonlight."
  },
  rose_quartz: {
    name: "Rose Quartz",
    keywords: "Self-love · Compassion · Gentleness",
    theme: "heart_self_love",
    shopUrl: "https://www.mooncatcrystals.com/collections/rose-quartz",
    situation: "you're working on loving yourself again",
    need: "to be kinder to yourself",
    about: "Rose Quartz is the stone of self-love. It's associated with gentleness, compassion and a softer way of talking to yourself.",
    place: "by your mirror or on your nightstand",
    tip: "Each time you catch yourself being hard on yourself, look at it and say the kinder version instead.",
    notice: "notice whether that voice in your head sounds any different.",
    care: "Keep Rose Quartz out of direct sunlight, since its pink can fade. If it gets dusty, a quick rinse under cool water is fine. To cleanse it, set it on a selenite plate or in moonlight."
  },
  moonstone: {
    name: "Moonstone",
    keywords: "New beginnings · Intuition · Balance",
    theme: "intuition_transformation",
    shopUrl: "https://www.mooncatcrystals.com/collections/moonstone",
    situation: "you're in a big transition and want to trust the process",
    need: "to feel steady while everything around you changes",
    about: "Moonstone is associated with new beginnings, cycles and intuition. It's the stone people keep close during a change, when they want to feel steady.",
    place: "on your nightstand or near a window where it catches the light",
    tip: "When things feel uncertain, hold it and remind yourself that this is a phase, not forever.",
    notice: "notice what's felt steadier.",
    care: "Moonstone is fairly soft, so store it apart from harder crystals to avoid scratches. Keep it dry. To cleanse it, set it in moonlight or on a selenite plate."
  },
  labradorite: {
    name: "Labradorite",
    keywords: "Intuition · Transformation · Protection",
    theme: "intuition_transformation",
    shopUrl: "https://www.mooncatcrystals.com/collections/labradorite",
    situation: "you're starting something new and want to trust your intuition",
    need: "to feel brave enough to become who you're changing into",
    about: "Labradorite is associated with intuition and transformation. It's the stone for the in-between, when you're becoming someone new.",
    place: "where you'll see it when you start your day",
    tip: "Before a decision, hold it for a moment and notice your first gut answer before you talk yourself out of it.",
    notice: "look back at which gut answers turned out right.",
    care: "Labradorite scratches more easily than it looks, and scratches dull its flash, so store it on its own. Keep it dry and wipe it with a soft cloth. To cleanse it, use a selenite plate."
  },
  malachite: {
    name: "Malachite",
    keywords: "Transformation · Growth · Protection",
    theme: "intuition_transformation",
    shopUrl: "https://www.mooncatcrystals.com/collections/malachite",
    situation: "you're done managing the same pattern and want it gone for good",
    need: "to let go of a pattern you keep repeating, for good",
    about: "Malachite is associated with deep change. It's the stone people work with when they want to break a pattern for good, not just manage it.",
    place: "near where you journal or reflect",
    tip: "Hold it while you write down the pattern you want gone and what usually sets it off.",
    notice: "notice one moment when you caught the pattern before it ran its course.",
    care: "Keep Malachite dry. Raw malachite can shed dust, so wash your hands after handling it and never put it in water or elixirs. To cleanse it, set it on a selenite plate."
  }
};

// The first sentence of "Your first week with it" depends on how they said
// they want to use the crystal (question 4 in index.html).
const FORM_OPENERS = {
  carry: "Since you'd like to carry it, keep a small piece in your pocket or bag and hold it for a moment whenever you reach for it.",
  ritual: "Since you'd like to work with it directly, hold it for a few minutes each morning and set one simple intention for the day."
};

// Flodesk rejects any custom field value over 256 characters, so the longer
// email paragraphs are split across two fields that sit side by side in the
// same paragraph of the email: Crystal Why + Crystal About, and Crystal First
// Week + Crystal Week Tip.
const FIELD_LIMIT = 256;

function firstWeekText(crystal, formPreference) {
  return formPreference === "space" || !FORM_OPENERS[formPreference]
    ? "Keep it " + crystal.place + "."
    : FORM_OPENERS[formPreference];
}

function weekTipText(crystal) {
  return crystal.tip + " By the end of the week, " + crystal.notice;
}

function whyText(situationKey, needKey) {
  const situation = CRYSTAL_EMAIL[situationKey] && CRYSTAL_EMAIL[situationKey].situation;
  const need = CRYSTAL_EMAIL[needKey] && CRYSTAL_EMAIL[needKey].need;
  if (!situation || !need) return "";
  return "You told us " + situation + ", and that what you need most is " + need + ".";
}

// Safety net: never send a value Flodesk will reject. Cuts at the last full
// sentence that fits (or the last word, if there isn't one).
function fitField(text) {
  if (text.length <= FIELD_LIMIT) return text;
  const cut = text.slice(0, FIELD_LIMIT);
  const lastStop = cut.lastIndexOf(". ");
  if (lastStop > 0) return cut.slice(0, lastStop + 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "") + "…";
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
      crystalKeywords: crystal.keywords,
      crystalTheme: THEME_NAMES[crystal.theme],
      crystalExperienceLevel: experienceLevel,
      crystalWhy: whyText(payload.situationKey, payload.needKey),
      crystalAbout: crystal.about,
      crystalFirstWeek: firstWeekText(crystal, payload.formPreference),
      crystalWeekTip: weekTipText(crystal),
      crystalCare: crystal.care,
      crystalShopLink: crystal.shopUrl
    }
  };
  Object.keys(body.custom_fields).forEach(function (k) {
    body.custom_fields[k] = fitField(body.custom_fields[k]);
  });
  if (firstName) body.first_name = firstName;

  try {
    const authHeader = "Basic " + btoa(apiKey + ":");
    const send = function (payloadBody) {
      return fetch(FLODESK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader
        },
        body: JSON.stringify(payloadBody)
      });
    };

    let response = await send(body);
    let flodeskError = null;

    // If Flodesk rejects the full sign-up, try again with just the short
    // fields so the person still lands on the list (the welcome email then
    // shows its fallback text for the missing parts). Flodesk's own error
    // message comes back in the response so the cause is visible.
    if (!response.ok) {
      flodeskError = (response.status + " " + (await response.text())).slice(0, 400);
      console.error("Flodesk API error (full sign-up)", flodeskError);
      const basic = Object.assign({}, body, {
        custom_fields: {
          crystalMatch: body.custom_fields.crystalMatch,
          crystalTheme: body.custom_fields.crystalTheme,
          crystalExperienceLevel: body.custom_fields.crystalExperienceLevel
        }
      });
      response = await send(basic);
      if (!response.ok) {
        const retryError = (response.status + " " + (await response.text())).slice(0, 400);
        console.error("Flodesk API error (basic sign-up)", retryError);
        return respond(502, { ok: false, error: "Flodesk API error", flodeskError: flodeskError, retryError: retryError });
      }
    }

    // Retakes: Flodesk only ADDS segments on a sign-up, so someone who retakes
    // the quiz would collect every theme they've ever matched. The sign-up
    // response lists the segments they're in now, so remove any OTHER quiz
    // theme segments, by subscriber id (Flodesk 404s when the email is used
    // in this path). Quiz: All Takers is cleared by the Crystal Quiz Welcome
    // workflow itself after the email goes out, which is what lets a retake
    // start the workflow again. A failure here is logged; the sign-up stands.
    let removal = "none needed";
    try {
      const subscriber = await response.json();
      const themeIds = Object.keys(THEME_SEGMENT_ENV_KEYS)
        .map(function (k) { return env[THEME_SEGMENT_ENV_KEYS[k]]; })
        .filter(Boolean);
      const stale = (subscriber.segments || [])
        .map(function (seg) { return seg.id; })
        .filter(function (id) { return id && id !== themeSegmentId && themeIds.indexOf(id) !== -1; });
      if (stale.length && subscriber.id) {
        const res = await fetch(FLODESK_API_URL + "/" + subscriber.id + "/segments", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader
          },
          body: JSON.stringify({ segment_ids: stale })
        });
        removal = res.status + (res.ok ? "" : " " + (await res.text()).slice(0, 300)) + " (" + stale.length + " old theme)";
        if (!res.ok) console.warn("Flodesk old-theme removal failed", removal);
      }
    } catch (err) {
      removal = "error " + String(err).slice(0, 200);
      console.warn("Flodesk old-theme removal errored", err);
    }

    if (!themeSegmentId) {
      console.warn(
        `No Flodesk segment id configured for theme "${crystal.theme}" yet (set ${THEME_SEGMENT_ENV_KEYS[crystal.theme]} in Cloudflare Pages env vars). Subscriber was still created in Flodesk.`
      );
    }

    // removal: how the old-theme cleanup went, so a test sign-up shows it.
    return respond(200, flodeskError
      ? { ok: true, partial: true, flodeskError: flodeskError, removal: removal }
      : { ok: true, removal: removal });
  } catch (err) {
    console.error("Error calling Flodesk API", err);
    return respond(500, { ok: false, error: "Unexpected error" });
  }
}
