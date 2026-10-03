// Looks up real, currently-purchasable products for a crystal's Shopify
// collection via the Storefront API — same token/pattern as
// crystal-skool-dashboard/netlify/functions/shop-products.js, so the
// existing SHOPIFY_STOREFRONT_TOKEN can be reused here rather than
// creating a new credential. Kept server-side by convention (matches the
// sibling project) even though Storefront tokens are safe for client use.
const SHOP_DOMAIN = "mooncat-crystals.myshopify.com";
const API_VERSION = "2026-07";

// How many product cards the result screen shows. 4 rather than 3 or 5+:
// enough that a single lonely card never reads as "is that really all
// they have" (real risk with OOAK stock), but the result screen — which
// is a payoff/reveal moment, not a browse session — doesn't turn into a
// scroll before someone reaches the CTA. Bump if you want to test 5.
const RESULT_COUNT = 4;

// Someone's answer to "how do you actually want to use this crystal?"
// (see META_QUESTIONS.formPreference in index.html) doesn't change which
// crystal they match — it changes which of THAT crystal's real in-stock
// pieces get put first, by matching against the product title. A tumble
// bubbles to the top for someone who said "carry it", a tower for someone
// who said "keep it in my space", etc. Products that don't match any
// keyword just sort after the matches — nothing is ever excluded, so a
// thin OOAK collection still fills up to RESULT_COUNT.
const FORM_KEYWORDS = {
  carry: /tumble|tumbled|palm stone|pocket|worry stone/i,
  space: /tower|cluster|sphere|geode|obelisk|slab|freeform|cauldron|candelabra|flame|heart|generator/i,
  ritual: /raw|rough|wand|point|specimen/i
};

const QUERY = `
  query CollectionProducts($handle: String!) {
    collectionByHandle(handle: $handle) {
      products(first: 24, sortKey: BEST_SELLING) {
        edges {
          node {
            title
            handle
            availableForSale
            onlineStoreUrl
            featuredImage { url altText }
            priceRange { minVariantPrice { amount currencyCode } }
          }
        }
      }
    }
  }
`;

function respond(status, data) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

// Cloudflare Pages Function: served at /api/crystal-products. Only GET is
// handled here; Cloudflare answers other methods with 405 on its own.
export async function onRequestGet(context) {
  const params = new URL(context.request.url).searchParams;
  const handle = params.get("handle");
  if (!handle || !/^[a-z0-9-]+$/.test(handle)) {
    return respond(400, { error: "Invalid collection handle" });
  }
  const form = params.get("form");
  const formPreference = FORM_KEYWORDS.hasOwnProperty(form) ? form : null;

  const token = context.env.SHOPIFY_STOREFRONT_TOKEN;
  if (!token) {
    console.error("SHOPIFY_STOREFRONT_TOKEN is not set in the Cloudflare Pages environment.");
    // Fail open with an empty list — the frontend falls back to the
    // collection link so a missing token never breaks the quiz.
    return respond(200, { products: [] });
  }

  try {
    const res = await fetch(`https://${SHOP_DOMAIN}/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": token
      },
      body: JSON.stringify({ query: QUERY, variables: { handle: handle } })
    });

    if (!res.ok) {
      console.error("Shopify Storefront API error", res.status, await res.text());
      return respond(200, { products: [] });
    }

    const json = await res.json();
    if (json.errors) {
      console.error("Shopify Storefront API errors", json.errors);
      return respond(200, { products: [] });
    }

    const edges = (json.data.collectionByHandle && json.data.collectionByHandle.products.edges) || [];

    let available = edges
      .map(function (edge) { return edge.node; })
      .filter(function (node) { return node.availableForSale && node.onlineStoreUrl; });

    if (formPreference) {
      const keywordRe = FORM_KEYWORDS[formPreference];
      const matches = available.filter(function (node) { return keywordRe.test(node.title); });
      const rest = available.filter(function (node) { return !keywordRe.test(node.title); });
      available = matches.concat(rest);
    }

    const products = available
      .slice(0, RESULT_COUNT)
      .map(function (node) {
        const price = node.priceRange.minVariantPrice;
        return {
          title: node.title,
          url: node.onlineStoreUrl,
          image: node.featuredImage ? node.featuredImage.url : null,
          imageAlt: node.featuredImage ? (node.featuredImage.altText || node.title) : node.title,
          price: price.amount,
          currency: price.currencyCode
        };
      });

    return respond(200, { products: products });
  } catch (err) {
    console.error("Error calling Shopify Storefront API", err);
    return respond(200, { products: [] });
  }
}
