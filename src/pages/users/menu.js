import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { sql } from "../../lib/db";
import { getCustomerUser } from "../../lib/customerAuth";

// How many items a customer picks in each section.
// Delete a line here to remove that section from the page.
const SECTIONS = [
  { key: "main", title: "MAIN DISH", label: "main dish", limit: 1 },
  { key: "appetizer", title: "APPETIZER", label: "appetizer", limit: 1 },
  { key: "dessert", title: "DESSERT", label: "dessert", limit: 1 },
  { key: "beverage", title: "BEVERAGE", label: "beverage", limit: 1 },
];

// The Main Dish tabs, always shown in this order
const MAIN_TABS = ["Beef", "Pork", "Chicken", "Seafood"];

// Decides which section a menu category belongs to, from its name
function classify(categoryName) {
  const n = String(categoryName || "").toLowerCase();

  if (n.includes("beef")) return { group: "main", tab: "Beef" };
  if (n.includes("pork")) return { group: "main", tab: "Pork" };
  if (n.includes("chicken")) return { group: "main", tab: "Chicken" };
  if (n.includes("seafood") || n.includes("fish")) return { group: "main", tab: "Seafood" };
  if (n.includes("appetizer")) return { group: "appetizer", tab: "" };
  if (n.includes("dessert")) return { group: "dessert", tab: "" };
  if (n.includes("drink") || n.includes("beverage")) return { group: "beverage", tab: "" };

  return null; // soup, vegetables/noodles etc. are not part of this screen
}

export async function getServerSideProps({ req, res, query }) {
  res.setHeader("Cache-Control", "private, no-store");

  // Only logged-in customers can see this page
  const user = await getCustomerUser(req);
  if (!user) {
    return { redirect: { destination: "/Authentication/login", permanent: false } };
  }

  // The package chosen on the previous page must exist
  const packageId = Number(query.package);
  const toPackages = { redirect: { destination: "/users/package", permanent: false } };
  if (!Number.isInteger(packageId) || packageId < 1) return toPackages;

  try {
    const found = await sql`SELECT id FROM catering_packages WHERE id = ${packageId}`;
    if (found.length === 0) return toPackages;
  } catch (err) {
    console.error("menu page package check error:", err);
    return toPackages;
  }

  let loadError = false;
  const grouped = {};

  try {
    // mi.id keeps the order in which staff added the dishes
    const rows = await sql`
      SELECT mi.id, mi.name, mc.name AS category_name
        FROM menu_items mi
        JOIN menu_categories mc ON mc.id = mi.category_id
       ORDER BY mc.name ASC, mi.id ASC
    `;

    for (const row of rows) {
      const place = classify(row.category_name);
      if (!place) continue;

      grouped[place.group] = grouped[place.group] || {};
      grouped[place.group][place.tab] = grouped[place.group][place.tab] || [];
      grouped[place.group][place.tab].push({ id: Number(row.id), name: String(row.name) });
    }
  } catch (err) {
    console.error("customer menu error:", err);
    loadError = true;
  }

  // Only sections that have at least one item are shown and required
  const sections = SECTIONS.filter((s) => grouped[s.key]).map((s) => {
    const byTab = grouped[s.key];
    const names = s.key === "main" ? MAIN_TABS : Object.keys(byTab);

    return {
      ...s,
      tabs: names.map((name) => ({ name, items: byTab[name] || [] })),
    };
  });

  return { props: { packageId, sections, loadError } };
}

export default function ChooseMenu({ packageId, sections, loadError }) {
  const router = useRouter();
  const [picked, setPicked] = useState({}); // { main: [12], dessert: [40] }
  const [activeTab, setActiveTab] = useState({}); // { main: 1 }
  const [error, setError] = useState("");

  function toggle(section, id) {
    setError("");
    setPicked((prev) => {
      const current = prev[section.key] || [];

      if (current.includes(id)) {
        return { ...prev, [section.key]: current.filter((x) => x !== id) };
      }
      if (section.limit === 1) return { ...prev, [section.key]: [id] };
      if (current.length >= section.limit) return prev;

      return { ...prev, [section.key]: [...current, id] };
    });
  }

  function next() {
    const missing = sections
      .filter((s) => (picked[s.key] || []).length < s.limit)
      .map((s) => s.label);

    if (missing.length > 0) {
      setError(`Please choose your ${missing.join(", ")}.`);
      return;
    }

    const ids = sections.flatMap((s) => picked[s.key]);
    router.push(`/users/booking?package=${packageId}&items=${ids.join(",")}`);
  }

  return (
    <main className="mn-page">
      <Head>
        <title>{`Menu | Dorothy's Kitchen`}</title>
      </Head>

      <div className="mn-wrap">
        <Link href="/users/package" className="mn-back" aria-label="Back to packages">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="19" x2="5" y1="12" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>

        {loadError && (
          <p className="mn-msg" role="alert">
            The menu can&apos;t be loaded right now. Please try again in a moment.
          </p>
        )}

        {!loadError && sections.length === 0 && (
          <p className="mn-msg">The menu is empty for now. Please check back soon.</p>
        )}

        {sections.map((section) => {
          const chosen = picked[section.key] || [];

          // Open on the first tab that has dishes, unless the customer picked another
          const firstFilled = Math.max(
            0,
            section.tabs.findIndex((t) => t.items.length > 0)
          );
          const tabIndex = Math.min(
            activeTab[section.key] ?? firstFilled,
            section.tabs.length - 1
          );
          const tab = section.tabs[tabIndex];
          const done = chosen.length >= section.limit;

          return (
            <section className="mn-section" key={section.key}>
              <h2 className="mn-title">{section.title}</h2>

              <span className={`mn-count${done ? " done" : ""}`}>
                {chosen.length}/{section.limit} Selected
              </span>

              {section.tabs.length > 1 && (
                <div className="mn-tabs" role="tablist">
                  {section.tabs.map((t, i) => (
                    <button
                      key={t.name}
                      type="button"
                      role="tab"
                      aria-selected={i === tabIndex}
                      className={`mn-tab${i === tabIndex ? " on" : ""}`}
                      onClick={() => setActiveTab((prev) => ({ ...prev, [section.key]: i }))}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}

              {tab.items.length === 0 ? (
                <p className="mn-empty">No items in this tab yet.</p>
              ) : (
                <div className="mn-items">
                  {tab.items.map((item) => {
                    const on = chosen.includes(item.id);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`mn-item${on ? " on" : ""}`}
                        aria-pressed={on}
                        onClick={() => toggle(section, item.id)}
                      >
                        <span className="mn-photo" />
                        <span className="mn-name">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        {error && (
          <p className="mn-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          className="mn-continue"
          onClick={next}
          disabled={sections.length === 0}
        >
          Continue
        </button>
      </div>

      <style jsx global>{`
        .mn-page {
          min-height: 100vh;
          padding: 36px 20px 72px;
          background: #000;
          color: #ececec;
          font: 14px/1.4 "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif;
        }
        .mn-wrap {
          max-width: 760px;
          margin: 0 auto;
        }
        .mn-back {
          display: inline-grid;
          place-items: center;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          color: #fff;
          transition: background-color 0.2s;
        }
        .mn-back:hover {
          background: #1f1f1f;
        }
        .mn-msg {
          margin: 40px 0;
          text-align: center;
          color: #9a9a9a;
        }
        .mn-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 56px;
        }
        .mn-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 28px;
          margin: 0 0 14px;
          font-size: 22px;
          font-weight: 500;
          letter-spacing: 0.02em;
          color: #d6b335;
        }
        .mn-title::before,
        .mn-title::after {
          content: "";
          width: 56px;
          height: 1px;
          background: #666;
        }
        .mn-count {
          padding: 3px 12px;
          border-radius: 999px;
          background: #1c1c1c;
          font-size: 10px;
          color: #bdbdbd;
          transition: background-color 0.2s, color 0.2s;
        }
        .mn-count.done {
          background: #3b3410;
          color: #d6b335;
        }
        .mn-tabs {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin-top: 22px;
        }
        .mn-tab {
          min-width: 84px;
          padding: 7px 16px;
          border: 1px solid #2d2d2d;
          border-radius: 6px;
          background: #121212;
          color: #ececec;
          font: inherit;
          font-size: 11px;
          cursor: pointer;
          transition: background-color 0.2s, color 0.2s, border-color 0.2s;
        }
        .mn-tab:hover {
          border-color: #d6b335;
        }
        .mn-tab.on {
          border-color: #d6b335;
          background: #d6b335;
          color: #111;
          font-weight: 600;
        }
        .mn-empty {
          margin: 28px 0 0;
          font-size: 12px;
          color: #9a9a9a;
        }
        /* 4 dishes per row: 4 x 100px cards + 3 x 10px gaps */
        .mn-items {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          max-width: 440px;
          margin: 24px auto 0;
        }
        .mn-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          width: 100px;
          padding: 8px 8px 10px;
          border: 1px solid #2d2d2d;
          border-radius: 8px;
          background: #121212;
          color: #fff;
          font: inherit;
          cursor: pointer;
          transition: border-color 0.2s, transform 0.2s;
        }
        .mn-item:hover {
          transform: translateY(-2px);
        }
        .mn-item.on {
          border-color: #d6b335;
          color: #d6b335;
        }
        /* Square photo. Put the food picture at public/images/food.jpg;
           until then the restaurant photo shows instead. */
        .mn-photo {
          display: block;
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 6px;
          background:
            url("/images/food.jpg") center / cover no-repeat,
            #1d1c17 url("/images/home.jpg") center / cover no-repeat;
        }
        .mn-name {
          font-size: 10px;
          line-height: 1.25;
          text-align: center;
        }
        .mn-error {
          margin: 40px 0 0;
          text-align: center;
          color: #f08a8a;
        }
        .mn-continue {
          display: block;
          width: 100%;
          max-width: 240px;
          margin: 56px auto 0;
          padding: 14px 16px;
          border: 0;
          border-radius: 8px;
          background: #d6b335;
          color: #111;
          font: inherit;
          font-weight: 600;
          cursor: pointer;
          transition: filter 0.2s, transform 0.15s;
        }
        .mn-continue:hover {
          filter: brightness(1.08);
        }
        .mn-continue:active {
          transform: scale(0.98);
        }
        .mn-continue:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .mn-item:focus-visible,
        .mn-tab:focus-visible,
        .mn-continue:focus-visible,
        .mn-back:focus-visible {
          outline: 2px solid #d6b335;
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .mn-item:hover { transform: none; }
        }
      `}</style>
    </main>
  );
}