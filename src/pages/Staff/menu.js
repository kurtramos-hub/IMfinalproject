import StaffLayout from "../../components/StaffLayout";
import s from "../../styles/StaffLayout.module.css";
import { packages, menuItems, money } from "../../lib/sampleData";

export default function Menu() {
  return (
    <StaffLayout active="menu" title="Menu" subtitle="Manage our delicious menu items and packages">
      <h2 className={s.section}>Catering Packages</h2>
      <div className={s.grid3}>
        {packages.map((p) => (
          <div key={p.name} className={s.pkg}>
            <h3>{p.name}</h3>
            <p><span>{money(p.price)}</span> per head</p>
            <hr />
            <details>
              <summary>View Details</summary>
              <ul>{p.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </details>
          </div>
        ))}
      </div>

      <h2 className={s.section}>Menu Items</h2>
      <div className={s.grid3}>
        {menuItems.map((name) => <div key={name} className={s.tile}>{name}</div>)}
      </div>
    </StaffLayout>
  );
}