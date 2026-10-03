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
// pieces get put first, by matching against the product title. A ring
// bubbles to the top for someone who said "wear it", a tower for someone
// who said "keep it in my space", etc. Products that don't match any
// keyword just sort after the matches — nothing is ever excluded, so a
// thin OOAK collection still fills up to RESULT_COUNT.
const FORM_KEYWORDS = {
  jewelry: /ring|necklace|bracelet|pendant|earring|anklet/i,
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

exports.handler = async function (event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const params = event.queryStringParameters || {};
  const handle = params.handle;
  if (!handle || !/^[a-z0-9-]+$/.test(handle)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid collection handle" }) };
  }
  const formPreference = FORM_KEYWORDS.hasOwnProperty(params.form) ? params.form : null;

  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  if (!token) {
    console.error("SHOPIFY_STOREFRONT_TOKEN is not set in the Netlify environment.");
    // Fail open with an empty list — the frontend falls back to the
    // collection link so a missing token never breaks the quiz.
    return { statusCode: 200, body: JSON.stringify({ products: [] }) };
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
      return { statusCode: 200, body: JSON.stringify({ products: [] }) };
    }

    const json = await res.json();
    if (json.errors) {
      console.error("Shopify Storefront API errors", json.errors);
      return { statusCode: 200, body: JSON.stringify({ products: [] }) };
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

    return {
      statusCode: 200,
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify({ products: products })
    };
  } catch (err) {
    console.error("Error calling Shopify Storefront API", err);
    return { statusCode: 200, body: JSON.stringify({ products: [] }) };
  }
};
