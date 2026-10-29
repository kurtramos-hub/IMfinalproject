import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StaffLayout from "../../components/StaffLayout";
import s from "../../styles/StaffLayout.module.css";

const money = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const emptyPackage = { name: "", price: "", items: "" };

export default function Menu() {
  const [packages, setPackages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);

  const [packageForm, setPackageForm] = useState(emptyPackage);
  const [categoryName, setCategoryName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");

  const [editingPackage, setEditingPackage] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // UI-only state
  const [tab, setTab] = useState("packages");
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const packageFormRef = useRef(null);
  const categoryFormRef = useRef(null);
  const itemFormRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [packageResponse, categoryResponse, menuResponse] =
        await Promise.all([
          fetch("/api/staff/packages"),
          fetch("/api/staff/categories"),
          fetch("/api/staff/menu"),
        ]);

      if (
        !packageResponse.ok ||
        !categoryResponse.ok ||
        !menuResponse.ok
      ) {
        throw new Error("Failed to load menu data from the database.");
      }

      const [packageData, categoryData, menuData] = await Promise.all([
        packageResponse.json(),
        categoryResponse.json(),
        menuResponse.json(),
      ]);

      setPackages(packageData);
      setCategories(categoryData);
      setMenuItems(menuData);
    } catch (err) {
      setError(err.message || "Unable to load menu data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Success messages disappear on their own
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  function scrollTo(ref) {
    setTimeout(
      () =>
        ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      50
    );
  }

  async function requestApi(url, method, body) {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "The request failed.");
    }

    return data;
  }

  // CATERING PACKAGES

  function packagePayload(form) {
    return {
      name: form.name.trim(),
      price: Number(form.price),
      items: form.items
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    };
  }

  async function savePackage(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!packageForm.name.trim() || packageForm.price === "") {
      setError("Please enter a package name and price.");
      return;
    }

    if (
      !Number.isFinite(Number(packageForm.price)) ||
      Number(packageForm.price) < 0
    ) {
      setError("Please enter a valid, non-negative price.");
      return;
    }

    setSaving(true);

    try {
      if (editingPackage) {
        await requestApi("/api/staff/packages", "PUT", {
          id: editingPackage.id,
          ...packagePayload(packageForm),
        });

        setNotice("Catering package updated successfully!");
      } else {
        await requestApi(
          "/api/staff/packages",
          "POST",
          packagePayload(packageForm)
        );

        setNotice("Catering package added successfully!");
      }

      setPackageForm(emptyPackage);
      setEditingPackage(null);
      setShowPackageForm(false);
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save the package.");
    } finally {
      setSaving(false);
    }
  }

  function startAddPackage() {
    setEditingPackage(null);
    setPackageForm(emptyPackage);
    setShowPackageForm(true);
    setError("");
    setNotice("");
    scrollTo(packageFormRef);
  }

  function startEditPackage(pkg) {
    setEditingPackage(pkg);

    setPackageForm({
      name: pkg.name,
      price: String(pkg.price),
      items: Array.isArray(pkg.items) ? pkg.items.join("\n") : "",
    });

    setShowPackageForm(true);
    setError("");
    setNotice("");
    scrollTo(packageFormRef);
  }

  function cancelPackageEdit() {
    setEditingPackage(null);
    setPackageForm(emptyPackage);
    setShowPackageForm(false);
  }

  async function deletePackage(pkg) {
    if (!window.confirm(`Delete catering package "${pkg.name}"?`)) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await requestApi(
        `/api/staff/packages?id=${encodeURIComponent(pkg.id)}`,
        "DELETE"
      );

      setNotice("Catering package deleted.");

      if (editingPackage?.id === pkg.id) {
        cancelPackageEdit();
      }

      await loadData();
    } catch (err) {
      setError(err.message || "Unable to delete the package.");
    }
  }

  // CATEGORIES

  async function saveCategory(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!categoryName.trim()) {
      setError("Please enter a category name.");
      return;
    }

    setSaving(true);

    try {
      if (editingCategory) {
        await requestApi("/api/staff/categories", "PUT", {
          id: editingCategory.id,
          name: categoryName.trim(),
        });

        setNotice("Category updated successfully!");
      } else {
        await requestApi("/api/staff/categories", "POST", {
          name: categoryName.trim(),
        });

        setNotice("Category added successfully!");
      }

      setCategoryName("");
      setEditingCategory(null);
      setShowCategoryForm(false);
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save category.");
    } finally {
      setSaving(false);
    }
  }

  function startAddCategory() {
    setEditingCategory(null);
    setCategoryName("");
    setShowCategoryForm(true);
    setError("");
    setNotice("");
    scrollTo(categoryFormRef);
  }

  function startEditCategory(category) {
    setEditingCategory(category);
    setCategoryName(category.name);
    setShowCategoryForm(true);
    setError("");
    setNotice("");
    scrollTo(categoryFormRef);
  }

  function cancelCategoryEdit() {
    setEditingCategory(null);
    setCategoryName("");
    setShowCategoryForm(false);
  }

  async function deleteCategory(category) {
    if (
      !window.confirm(
        `Delete category "${category.name}"? The category must be empty first.`
      )
    ) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await requestApi(
        `/api/staff/categories?id=${encodeURIComponent(category.id)}`,
        "DELETE"
      );

      setNotice("Category deleted.");

      if (selectedCategory?.id === category.id) {
        setSelectedCategory(null);
      }

      if (editingCategory?.id === category.id) {
        cancelCategoryEdit();
      }

      await loadData();
    } catch (err) {
      setError(err.message || "Unable to delete category.");
    }
  }

  // MENU ITEMS

  function resetItemForm() {
    setEditingItem(null);
    setItemName("");
    setItemCategoryId(selectedCategory ? String(selectedCategory.id) : "");
  }

  async function saveMenuItem(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!itemName.trim()) {
      setError("Please enter a menu item name.");
      return;
    }

    if (!itemCategoryId) {
      setError("Please select a category for this menu item.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: itemName.trim(),
        category_id: Number(itemCategoryId),
      };

      if (editingItem) {
        await requestApi("/api/staff/menu", "PUT", {
          id: editingItem.id,
          ...payload,
        });

        setNotice("Menu item updated successfully!");
      } else {
        await requestApi("/api/staff/menu", "POST", payload);

        setNotice("Menu item added successfully!");
      }

      resetItemForm();
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save the menu item.");
    } finally {
      setSaving(false);
    }
  }

  function startEditItem(item) {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategoryId(item.category_id ? String(item.category_id) : "");

    setError("");
    setNotice("");
    scrollTo(itemFormRef);
  }

  async function deleteMenuItem(item) {
    if (!window.confirm(`Delete menu item "${item.name}"?`)) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await requestApi(
        `/api/staff/menu?id=${encodeURIComponent(item.id)}`,
        "DELETE"
      );

      setNotice("Menu item deleted.");

      if (editingItem?.id === item.id) {
        resetItemForm();
      }

      await loadData();
    } catch (err) {
      setError(err.message || "Unable to delete the menu item.");
    }
  }

  function openCategory(category) {
    setSelectedCategory(category);
    setItemCategoryId(String(category.id));
    setEditingItem(null);
    setItemName("");
    setItemSearch("");
    setError("");
    setNotice("");
  }

  function closeCategory() {
    setSelectedCategory(null);
    resetItemForm();
    setItemSearch("");
    setError("");
    setNotice("");
  }

  const itemCounts = useMemo(() => {
    const counts = {};
    menuItems.forEach((item) => {
      const key = Number(item.category_id);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [menuItems]);

  const visibleItems = useMemo(() => {
    if (!selectedCategory) return [];
    const term = itemSearch.trim().toLowerCase();

    return menuItems.filter(
      (item) =>
        Number(item.category_id) === Number(selectedCategory.id) &&
        (!term || item.name.toLowerCase().includes(term))
    );
  }, [menuItems, selectedCategory, itemSearch]);

  const categoryItemTotal = selectedCategory
    ? itemCounts[Number(selectedCategory.id)] || 0
    : 0;

      return (
    <StaffLayout
      active="menu"
      title="Menu"
      subtitle="Manage our delicious menu items and packages"
    >
      {error && (
        <div className={s.messageError} role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className={s.messageSuccess} role="status">
          {notice}
        </div>
      )}

      {loading ? (
        <p className={s.empty}>Loading menu data...</p>
      ) : (
        <>
          {/* SUMMARY */}
          <div className={s.menuSummary}>
            <div className={s.menuSummaryItem}>
              <b>{packages.length}</b>
              <small>Packages</small>
            </div>

            <div className={s.menuSummaryItem}>
              <b>{categories.length}</b>
              <small>Categories</small>
            </div>

            <div className={s.menuSummaryItem}>
              <b>{menuItems.length}</b>
              <small>Menu items</small>
            </div>
          </div>

          {/* TABS */}
          <div className={s.menuTabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "packages"}
              className={`${s.menuTab} ${
                tab === "packages" ? s.menuTabActive : ""
              }`}
              onClick={() => setTab("packages")}
            >
              Catering packages
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={tab === "menu"}
              className={`${s.menuTab} ${
                tab === "menu" ? s.menuTabActive : ""
              }`}
              onClick={() => setTab("menu")}
            >
              Menu items
            </button>
          </div>

          {/* CATERING PACKAGES */}
          {tab === "packages" && (
            <section>
              <div className={s.menuToolbar}>
                <p className={s.muted}>
                  Prices are per head. Click a package to see what is
                  included.
                </p>

                {!showPackageForm && (
                  <button
                    type="button"
                    className={s.btn}
                    onClick={startAddPackage}
                  >
                    + Add package
                  </button>
                )}
              </div>

              {showPackageForm && (
                <form
                  ref={packageFormRef}
                  className={s.formCard}
                  onSubmit={savePackage}
                >
                  <h3>
                    {editingPackage
                      ? `Edit ${editingPackage.name}`
                      : "Add catering package"}
                  </h3>

                  <div className={s.formGrid}>
                    <div className={s.formField}>
                      <label className={s.formLabel} htmlFor="packageName">
                        Package name
                      </label>

                      <input
                        id="packageName"
                        className={s.input}
                        placeholder="e.g. SET A"
                        value={packageForm.name}
                        onChange={(e) =>
                          setPackageForm({
                            ...packageForm,
                            name: e.target.value,
                          })
                        }
                        maxLength={100}
                        required
                      />
                    </div>

                    <div className={s.formField}>
                      <label className={s.formLabel} htmlFor="packagePrice">
                        Price per head (₱)
                      </label>

                      <input
                        id="packagePrice"
                        className={s.input}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="380"
                        value={packageForm.price}
                        onChange={(e) =>
                          setPackageForm({
                            ...packageForm,
                            price: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <label className={s.formLabel} htmlFor="packageItems">
                    Included items (one per line)
                  </label>

                  <textarea
                    id="packageItems"
                    className={s.menuTextarea}
                    placeholder={"Main course\nSoup\nDessert"}
                    rows={5}
                    value={packageForm.items}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        items: e.target.value,
                      })
                    }
                  />

                  <div className={s.formActions}>
                    <button
                      className={s.secondaryBtn}
                      type="button"
                      onClick={cancelPackageEdit}
                    >
                      Cancel
                    </button>

                    <button className={s.btn} type="submit" disabled={saving}>
                      {saving
                        ? "Saving..."
                        : editingPackage
                          ? "Save changes"
                          : "Add package"}
                    </button>
                  </div>
                </form>
              )}

              {packages.length > 0 ? (
                <div className={s.pkgGrid}>
                  {packages.map((pkg) => {
                    const items = Array.isArray(pkg.items) ? pkg.items : [];

                    return (
                      <article key={pkg.id} className={s.pkgCard}>
                        <header className={s.pkgCardHead}>
                          <h3>{pkg.name}</h3>

                          <span className={s.pkgCount}>
                            {items.length} item{items.length === 1 ? "" : "s"}
                          </span>
                        </header>

                        <p className={s.pkgPrice}>
                          <strong>{money(pkg.price)}</strong>
                          <span> per head</span>
                        </p>

                                                
                        <details className={s.pkgDetails}>
                          <summary>View details</summary>

                          {items.length > 0 ? (
                            <ul>
                              {items.map((item, index) => (
                                <li key={`${pkg.id}-${index}`}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className={s.muted}>No items listed.</p>
                          )}
                        </details>


                        <div className={s.cardActions}>
                          <button
                            type="button"
                            className={s.smallBtn}
                            onClick={() => startEditPackage(pkg)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className={s.deleteBtn}
                            onClick={() => deletePackage(pkg)}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className={s.emptyCard}>
                  <p>No catering packages yet.</p>

                  {!showPackageForm && (
                    <button
                      type="button"
                      className={s.btn}
                      onClick={startAddPackage}
                    >
                      Add your first package
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {/* MENU CATEGORIES */}
          {tab === "menu" && !selectedCategory && (
            <section>
              <div className={s.menuToolbar}>
                <p className={s.muted}>
                  Open a category to see and manage its items.
                </p>

                {!showCategoryForm && (
                  <button
                    type="button"
                    className={s.btn}
                    onClick={startAddCategory}
                  >
                    + Add category
                  </button>
                )}
              </div>

              {showCategoryForm && (
                <form
                  ref={categoryFormRef}
                  className={s.formCard}
                  onSubmit={saveCategory}
                >
                  <h3>
                    {editingCategory
                      ? `Edit ${editingCategory.name}`
                      : "Add category"}
                  </h3>

                  <label className={s.formLabel} htmlFor="categoryName">
                    Category name
                  </label>

                  <input
                    id="categoryName"
                    className={s.input}
                    placeholder="e.g. Main Course"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    maxLength={100}
                    required
                  />

                  <div className={s.formActions}>
                    <button
                      className={s.secondaryBtn}
                      type="button"
                      onClick={cancelCategoryEdit}
                    >
                      Cancel
                    </button>

                    <button className={s.btn} type="submit" disabled={saving}>
                      {saving
                        ? "Saving..."
                        : editingCategory
                          ? "Save changes"
                          : "Add category"}
                    </button>
                  </div>
                </form>
              )}

              {categories.length > 0 ? (
                
<div className={s.catGrid}>
  {categories.map((category) => {
    const categoryItems = menuItems.filter(
      (item) => Number(item.category_id) === Number(category.id)
    );
    const count = categoryItems.length;
    const previewItems = categoryItems.slice(0, 3);

    return (
      <div key={category.id} className={s.catCard}>
        <button
          type="button"
          className={s.catOpen}
          onClick={() => openCategory(category)}
          aria-label={`View all items in ${category.name} category`}
        >
          <span className={s.catName}>{category.name}</span>

          <span className={s.catDivider} aria-hidden="true">
            <span />
          </span>

          <span className={s.catCount}>
            {count} menu item{count === 1 ? "" : "s"}
          </span>

          {previewItems.length > 0 ? (
            <span className={s.catPreview}>
              {previewItems.map((item) => (
                <span className={s.catPreviewItem} key={item.id}>
                  {item.name}
                </span>
              ))}

              {count > 3 && (
                <span className={s.catMoreItems}>
                  +{count - 3} more
                </span>
              )}
            </span>
          ) : (
            <span className={s.catHint}>No menu items yet</span>
          )}

          <span className={s.catHint}>View all items →</span>
        </button>

        <div className={s.cardActions}>
          <button
            type="button"
            className={s.smallBtn}
            onClick={() => startEditCategory(category)}
          >
            Edit
          </button>

          <button
            type="button"
            className={s.deleteBtn}
            onClick={() => deleteCategory(category)}
          >
            Delete
          </button>
        </div>
      </div>
    );
  })}
</div>

              ) : (
                <div className={s.emptyCard}>
                  <p>No categories yet.</p>

                  {!showCategoryForm && (
                    <button
                      type="button"
                      className={s.btn}
                      onClick={startAddCategory}
                    >
                      Add your first category
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {/* CATEGORY DETAIL AND MENU ITEMS */}
          {tab === "menu" && selectedCategory && (
            <section>
              <button
                type="button"
                className={s.crumb}
                onClick={closeCategory}
              >
                ← All categories
              </button>

              <div className={s.detailHead}>
                <h2 className={s.section}>{selectedCategory.name}</h2>

                <span className={s.muted}>
                  {categoryItemTotal} item{categoryItemTotal === 1 ? "" : "s"}
                </span>
              </div>

              <form
                ref={itemFormRef}
                className={s.formCard}
                onSubmit={saveMenuItem}
              >
                <h3>{editingItem ? "Edit menu item" : "Add menu item"}</h3>

                <div className={s.formGrid}>
                  <div className={s.formField}>
                    <label className={s.formLabel} htmlFor="menuItemName">
                      Menu item name
                    </label>

                    <input
                      id="menuItemName"
                      className={s.input}
                      placeholder="e.g. Chicken Adobo"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      maxLength={150}
                      required
                    />
                  </div>

                  <div className={s.formField}>
                    <label className={s.formLabel} htmlFor="itemCategory">
                      Category
                    </label>

                    <select
                      id="itemCategory"
                      className={s.input}
                      value={itemCategoryId}
                      onChange={(e) => setItemCategoryId(e.target.value)}
                      required
                    >
                      <option value="">Select a category</option>

                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={s.formActions}>
                  {editingItem && (
                    <button
                      className={s.secondaryBtn}
                      type="button"
                      onClick={resetItemForm}
                    >
                      Cancel
                    </button>
                  )}

                  <button className={s.btn} type="submit" disabled={saving}>
                    {saving
                      ? "Saving..."
                      : editingItem
                        ? "Save changes"
                        : "Add menu item"}
                  </button>
                </div>
              </form>

              {categoryItemTotal > 3 && (
                <input
                  type="search"
                  className={`${s.input} ${s.itemSearch}`}
                  placeholder="Search items in this category"
                  aria-label="Search items in this category"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
              )}

              {visibleItems.length > 0 ? (
                <div className={s.itemGrid}>
                  {visibleItems.map((item) => (
                    <article key={item.id} className={s.menuItemCard}>
                      <div className={s.menuItemCardBody}>
                        <h3 className={s.menuItemName}>{item.name}</h3>

                        <span
                          className={s.itemDivider}
                          aria-hidden="true"
                        >
                          <span />
                        </span>

                        <p className={s.menuItemCategory}>
                          {selectedCategory.name}
                        </p>
                      </div>

                      <div className={s.cardActions}>
                        <button
                          type="button"
                          className={s.smallBtn}
                          onClick={() => startEditItem(item)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className={s.deleteBtn}
                          onClick={() => deleteMenuItem(item)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={s.emptyCard}>
                  <p>
                    {itemSearch
                      ? `No items match "${itemSearch}".`
                      : "No menu items in this category yet. Add one above."}
                  </p>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </StaffLayout>
  );
}