import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { sql } from "../../lib/db";
import { getCustomerUser } from "../../lib/customerAuth";

// The admin saves items as a list; handle a list or a JSON string
function toItems(value) {
  const clean = (list) => list.map((v) => String(v).trim()).filter(Boolean);

  if (Array.isArray(value)) return clean(value);

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return clean(parsed);
    } catch {
      // not JSON, ignore
    }
  }
  return [];
}

export async function getServerSideProps({ req, res }) {
  res.setHeader("Cache-Control", "private, no-store");

  // Only logged-in customers can see this page
  const user = await getCustomerUser(req);
  if (!user) {
    return { redirect: { destination: "/Authentication/login", permanent: false } };
  }

  let packages = [];
  let loadError = false;

  // Read straight from the table the admin edits, so changes show up on the next page load
  try {
    const rows = await sql`
      SELECT id, name, price, items
        FROM catering_packages
       ORDER BY price ASC, id ASC
    `;
    packages = rows.map((p) => ({
      id: Number(p.id),
      name: String(p.name || ""),
      price: Number(p.price || 0),
      items: toItems(p.items),
    }));
  } catch (err) {
    console.error("customer packages error:", err);
    loadError = true;
  }

  return { props: { packages, loadError } };
}

const peso = (n) =>
  `₱ ${Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function Check() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function ChoosePackage({ packages, loadError }) {
  const router = useRouter();
  // The first package starts selected, as in the design
  const [selectedId, setSelectedId] = useState(packages[0]?.id ?? null);

  function onKey(e, id) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedId(id);
    }
  }

    function next() {
    if (selectedId === null) return;
    router.push(`/users/menu?package=${selectedId}`);
  }

  return (
    <main className="pk-page">
      <Head>
        <title>{`Choose a Package | Dorothy's Kitchen`}</title>
      </Head>

      <div className="pk-wrap">
        <Link href="/" className="pk-back" aria-label="Back to home">
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

        <h1 className="pk-title">CHOOSE A PACKAGE</h1>

        {loadError && (
          <p className="pk-msg" role="alert">
            Packages can&apos;t be loaded right now. Please try again in a moment.
          </p>
        )}

        {!loadError && packages.length === 0 && (
          <p className="pk-msg">No packages are available yet.</p>
        )}

        <div className="pk-grid" role="radiogroup" aria-label="Catering packages">
          {packages.map((p) => {
            const selected = p.id === selectedId;

            return (
              <div
                key={p.id}
                role="radio"
                aria-checked={selected}
                tabIndex={0}
                className={`pk-card${selected ? " selected" : ""}`}
                onClick={() => setSelectedId(p.id)}
                onKeyDown={(e) => onKey(e, p.id)}
              >
                <div className="pk-img" />

                <div className="pk-top">
                  <span className="pk-name">{p.name}</span>
                  <span className="pk-check">
                    <Check />
                  </span>
                </div>

                <div className="pk-menu">
                  <h4>Menu Selections</h4>

                  {p.items.length === 0 ? (
                    <p className="pk-none">No items listed yet.</p>
                  ) : (
                    <ul>
                      {p.items.map((item, i) => (
                        <li key={`${item}-${i}`}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="pk-foot">
                  <span>per head</span>
                  <b className="pk-price">{peso(p.price)}</b>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="pk-continue"
          onClick={next}
          disabled={selectedId === null}
        >
          Continue
        </button>
      </div>

      <style jsx global>{`
        .pk-page {
          min-height: 100vh;
          padding: 36px 20px 72px;
          background: #000;
          color: #ececec;
          font: 14px/1.4 "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif;
        }
        .pk-wrap {
          max-width: 1040px;
          margin: 0 auto;
        }
        .pk-back {
          display: inline-grid;
          place-items: center;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          color: #fff;
          transition: background-color 0.2s;
        }
        .pk-back:hover {
          background: #1f1f1f;
        }
        .pk-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 28px;
          margin: 0 0 56px;
          font-size: 24px;
          font-weight: 500;
          letter-spacing: 0.02em;
          color: #d6b335;
        }
        .pk-title::before,
        .pk-title::after {
          content: "";
          width: 72px;
          height: 1px;
          background: #666;
        }
        .pk-msg {
          margin: 0 0 24px;
          text-align: center;
          color: #9a9a9a;
        }
        .pk-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: flex-start;
          gap: 28px;
        }
        .pk-card {
          width: 270px;
          padding: 10px;
          border: 1px solid #5b5b5b;
          border-radius: 10px;
          background: #14130f;
          cursor: pointer;
          transition: border-color 0.2s, transform 0.2s;
        }
        .pk-card:hover {
          transform: translateY(-2px);
        }
        .pk-card.selected {
          border-color: #d6b335;
        }
        .pk-card:focus-visible {
          outline: 2px solid #d6b335;
          outline-offset: 3px;
        }
        .pk-img {
          height: 90px;
          border-radius: 8px;
          background: #1d1c17 url("/images/home.jpg") center / cover no-repeat;
        }
        .pk-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 10px 0 12px;
        }
        .pk-name {
          font-size: 14px;
          color: #fff;
        }
        .pk-check {
          display: grid;
          place-items: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          color: #111;
          transition: background-color 0.2s;
        }
        .pk-card.selected .pk-check {
          background: #d6b335;
        }
        .pk-menu {
          padding: 12px;
          border-radius: 8px;
          background: #1d1c17;
        }
        .pk-menu h4 {
          margin: 0 0 8px;
          font-size: 12px;
          font-weight: 400;
          color: #fff;
        }
        .pk-menu ul {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 14px;
          margin: 0;
          padding-left: 16px;
          font-size: 11px;
          color: #ddd;
        }
        .pk-none {
          margin: 0;
          font-size: 11px;
          color: #9a9a9a;
        }
        .pk-foot {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid #2d2d2d;
          font-size: 11px;
        }
        .pk-price {
          font-size: 14px;
          font-weight: 500;
          color: #d6b335;
        }
        .pk-continue {
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
        .pk-continue:hover {
          filter: brightness(1.08);
        }
        .pk-continue:active {
          transform: scale(0.98);
        }
        .pk-continue:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .pk-continue:focus-visible,
        .pk-back:focus-visible {
          outline: 2px solid #d6b335;
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .pk-card:hover { transform: none; }
        }
      `}</style>
    </main>
  );
}