import Link from "next/link";

const menuCategories = [
  {
    title: "APPETIZER",
    items: ["Caesar Salad", "Chef's Salad", "Mixed Garden Salad"],
  },
  {
    title: "SOUP",
    items: [
      "Crab and Corn Soup",
      "Cream of Chicken Soup",
      "Cream of Asparagus Soup",
      "Creamy Mushroom Soup",
    ],
  },
  {
    title: "VEGETABLE/NOODLES",
    items: [
      "Stir Fried Vegetables",
      "Buttered Vegetables",
      "Cantonese-Style Noodles",
      "Stir-fried Noodles",
    ],
  },
  {
    title: "BEEF",
    items: [
      "Beef Steak",
      "Beef Broccoli",
      "Beef Caldereta",
      "Beef in Oyster Sauce",
      "Creamy Beef in Mushroom",
      "Beef Stroganoff",
    ],
  },
  {
    title: "PORK",
    items: [
      "Braised Pork",
      "Pork Afritada",
      "Spicy Pork Spareribs",
      "Sweet & Sour Pork",
      "Pork in Shrimp Paste",
      "Baby Back Ribs",
    ],
  },
  {
    title: "CHICKEN",
    items: [
      "Garlic Chicken",
      "Battered Chicken",
      "Chicken Cordon Bleu",
      "Teriyaki Chicken",
      "Spicy Chicken",
    ],
  },
  {
    title: "SEAFOOD",
    items: [
      "Filet-o-Fish Sweet & Sour",
      "Filet-o-Fish with Tartar Dip",
      "Garlic Shrimp",
      "Cajun Seafood Boil",
      "Fish-o-Fish",
      "w/Mango Pomelo Salad",
    ],
  },
  {
    title: "DESSERT",
    items: [
      "Mango Tapioca",
      "Fruit Salad",
      "Buko Pandan",
      "Creamy Cheese",
      "Macaroon",
      "Fruit Platter",
    ],
  },
  {
    title: "DRINKS",
    items: [
      "Softdrinks of Choice",
      "Red Iced Tea",
      "Four Seasons Juice",
      "Cucumber Lemonade",
    ],
  },
];

const packages = [
  { name: "SET A", price: 380 },
  { name: "SET B", price: 420 },
  { name: "SET C", price: 460 },
];

export default function Home() {
  return (
    <main className="landing-page">
      <nav className="navbar">
        <div className="nav-left">
          <a href="#home">HOME</a>
          <a href="#packages">PACKAGES</a>
        </div>

        <a href="#home" className="brand">
          <span className="brand-icon">♨</span>
          <span className="brand-script">Dorothy&apos;s</span>
          <span className="brand-subtitle">K I T C H E N</span>
        </a>

        <div className="nav-right">
          <a href="#menu">MENU</a>
          <a href="#about">ABOUT US</a>
          <Link href="/Authentication/login" className="nav-login">LOG IN</Link>
          <Link href="/Authentication/signup" className="nav-signup">SIGN UP</Link>
        </div>
      </nav>

      <section
        id="home"
        className="hero"
        style={{ backgroundImage: "url('/images/home.jpg')" }}
      >
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="eyebrow">ELEGANT CATERING FOR EVERY OCCASION</p>
          <h1>Dorothy&apos;s Kitchen</h1>
          <h2>
            Your Event, Perfectly
            <br />
            Catered.
          </h2>
          <p className="hero-description">
            Making your special moments more memorable,
            one delicious dish at a time.
          </p>
          <a href="/Authentication/login" className="book-button">
            Book Now <span>↗</span>
          </a>
        </div>
      </section>

      {/* MENU SECTION */}
      <section id="menu" className="menu-section">
        <div className="section-heading">
          <span />
          <h2>MENU</h2>
          <span />
        </div>

        <div className="menu-grid">
          {menuCategories.map((category) => (
            <article className="menu-card" key={category.title}>
              <h3>{category.title}</h3>
              <div className="gold-diamond">
                <span />
              </div>
              <ul>
                {category.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* PACKAGES SECTION */}
      <section id="packages" className="packages-section">
        <div className="section-heading">
          <span />
          <h2>PACKAGES</h2>
          <span />
        </div>

        <div className="package-list">
          {packages.map((pkg) => (
            <article className="package-card" key={pkg.name}>
              <div className="package-header">
                <h3>{pkg.name}</h3>
                <p>
                  ₱{pkg.price}
                  <span> head</span>
                </p>
              </div>

              <div className="gold-diamond">
                <span />
              </div>

              <p className="package-label">CHOICE OF MENU</p>

              <div className="package-options">
                <ol>
                  <li>Appetizer</li>
                  <li>Main Dish</li>
                  <li>Soup</li>
                  <li>Vegetable/Noodles</li>
                </ol>
                <ol>
                  <li>Dessert</li>
                  <li>Round softdrinks or juice</li>
                  <li>With steamed rice</li>
                  <li>Fruits</li>
                </ol>
              </div>
            </article>
          ))}
        </div>

        <div className="catering-notes">
          <p>
            <strong>Outside Catering (Client Venue)</strong>
            <br />
            Inclusions: 4 hours of service, buffet table set-up with warmers,
            lamps, utensils and buffet staff.
          </p>

          <p>
            <strong>Other</strong>
            <br />
            Additional transportation charges will apply and will vary
            depending on the location. Transportation is provided at no cost
            within a 10km radius from our location.
          </p>

          <p>
            <strong>In-house Venue</strong>
            <br />
            Seminar: free flowing coffee.
          </p>
        </div>
      </section>

      {/* CONTACT FOOTER */}
      <footer id="contact" className="footer contact-footer">
        <div>
          <h3>Contact Details</h3>
          <p>0910 556 0400&nbsp; | &nbsp;0915 532 9298</p>
        </div>

        <div>
          <h3>Located at</h3>
          <p>No. 28 Bangus St., Brgy. Wilfredo Aquino.</p>
        </div>
      </footer>
    </main>
  );
}