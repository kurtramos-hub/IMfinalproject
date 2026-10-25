
import { useCallback, useEffect, useState } from "react";
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
        throw new Error(
          "Failed to load menu data from the database."
        );
      }

      const [packageData, categoryData, menuData] =
        await Promise.all([
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
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save the package.");
    } finally {
      setSaving(false);
    }
  }

  function startEditPackage(pkg) {
    setEditingPackage(pkg);

    setPackageForm({
      name: pkg.name,
      price: String(pkg.price),
      items: Array.isArray(pkg.items)
        ? pkg.items.join("\n")
        : "",
    });

    setError("");
    setNotice("");
  }

  function cancelPackageEdit() {
    setEditingPackage(null);
    setPackageForm(emptyPackage);
  }

  async function deletePackage(pkg) {
    if (
      !window.confirm(
        `Delete catering package "${pkg.name}"?`
      )
    ) {
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
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save category.");
    } finally {
      setSaving(false);
    }
  }

  function startEditCategory(category) {
    setEditingCategory(category);
    setCategoryName(category.name);
    setError("");
    setNotice("");
  }

  function cancelCategoryEdit() {
    setEditingCategory(null);
    setCategoryName("");
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
    setItemCategoryId(
      selectedCategory ? String(selectedCategory.id) : ""
    );
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
    setItemCategoryId(
      item.category_id ? String(item.category_id) : ""
    );

    setError("");
    setNotice("");
  }

  async function deleteMenuItem(item) {
    if (
      !window.confirm(`Delete menu item "${item.name}"?`)
    ) {
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

  const visibleItems = selectedCategory
    ? menuItems.filter(
        (item) =>
          Number(item.category_id) ===
          Number(selectedCategory.id)
      )
    : [];

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
          {/* CATERING PACKAGES */}

          <div className={s.menuHeader}>
            <h2 className={s.section}>Catering Packages</h2>
            <span className={s.muted}>
              {packages.length} package(s)
            </span>
          </div>

          <form className={s.menuForm} onSubmit={savePackage}>
            <h3>
              {editingPackage
                ? "Edit Catering Package"
                : "Add Catering Package"}
            </h3>

            <label className={s.formLabel} htmlFor="packageName">
              Package Name
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

            <label className={s.formLabel} htmlFor="packagePrice">
              Price per Head (₱)
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

            <label className={s.formLabel} htmlFor="packageItems">
              Included Items (one item per line)
            </label>

            <textarea
              id="packageItems"
              className={s.menuTextarea}
              placeholder={"Main course\nSoup\nDessert"}
              rows={4}
              value={packageForm.items}
              onChange={(e) =>
                setPackageForm({
                  ...packageForm,
                  items: e.target.value,
                })
              }
            />

            <div className={s.actionRow}>
              <button
                className={s.btn}
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingPackage
                    ? "Save Changes"
                    : "Add Package"}
              </button>

              {editingPackage && (
                <button
                  className={s.secondaryBtn}
                  type="button"
                  onClick={cancelPackageEdit}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className={s.grid3}>
            {packages.map((pkg) => (
              <div key={pkg.id} className={s.packageCard}>
                <h3>{pkg.name}</h3>
                <p>
                  <span>{money(pkg.price)}</span> per head
                </p>
                <hr />

                <details>
                  <summary>View Details</summary>
                  <ul>
                    {(pkg.items || []).map((item, index) => (
                      <li key={`${pkg.id}-${index}`}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </details>

                <div className={s.actionRow}>
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
              </div>
            ))}
          </div>

          {packages.length === 0 && (
            <p className={s.empty}>
              No catering packages yet. Add one above.
            </p>
          )}

          {/* MENU CATEGORIES */}

          <div className={s.menuHeader}>
            <h2 className={s.section}>Menu Categories</h2>
            <span className={s.muted}>
              {categories.length} categor
              {categories.length === 1 ? "y" : "ies"}
            </span>
          </div>

          <form className={s.menuForm} onSubmit={saveCategory}>
            <h3>
              {editingCategory ? "Edit Category" : "Add Category"}
            </h3>

            <label className={s.formLabel} htmlFor="categoryName">
              Category Name
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

            <div className={s.actionRow}>
              <button
                className={s.btn}
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingCategory
                    ? "Save Changes"
                    : "Add Category"}
              </button>

              {editingCategory && (
                <button
                  className={s.secondaryBtn}
                  type="button"
                  onClick={cancelCategoryEdit}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {!selectedCategory ? (
            <>
              <div className={s.grid3}>
                {categories.map((category) => {
                  const count = menuItems.filter(
                    (item) =>
                      Number(item.category_id) ===
                      Number(category.id)
                  ).length;

                  return (
                    <div key={category.id} className={s.pkg}>
                      <button
                        type="button"
                        className={s.categoryOpenBtn}
                        onClick={() => {
                          setSelectedCategory(category);
                          setItemCategoryId(
                            String(category.id)
                          );
                          setEditingItem(null);
                          setItemName("");
                          setError("");
                          setNotice("");
                        }}
                      >
                        <span className={s.categoryCardTitle}>
                          {category.name}
                        </span>

                        <span className={s.categoryCardCount}>
                          {count} item{count === 1 ? "" : "s"}
                        </span>

                        <span className={s.categoryCardHint}>
                          Click to view items →
                        </span>
                      </button>

                      <div className={s.actionRow}>
                        <button
                          type="button"
                          className={s.smallBtn}
                          onClick={() =>
                            startEditCategory(category)
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className={s.deleteBtn}
                          onClick={() =>
                            deleteCategory(category)
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {categories.length === 0 && (
                <p className={s.empty}>
                  No categories yet. Add a category above.
                </p>
              )}
            </>
          ) : (
            <section className={s.categoryDetail}>
              <div className={s.menuHeader}>
                <div>
                  <button
                    type="button"
                    className={s.secondaryBtn}
                    onClick={() => {
                      setSelectedCategory(null);
                      resetItemForm();
                      setError("");
                      setNotice("");
                    }}
                  >
                    ← Back to Categories
                  </button>

                  <h2 className={s.section}>
                    {selectedCategory.name}
                  </h2>

                  <p className={s.muted}>
                    {visibleItems.length} item
                    {visibleItems.length === 1 ? "" : "s"} in this
                    category
                  </p>
                </div>
              </div>

              <form className={s.menuForm} onSubmit={saveMenuItem}>
                <h3>
                  {editingItem ? "Edit Menu Item" : "Add Menu Item"}
                </h3>

                <label
                  className={s.formLabel}
                  htmlFor="itemCategory"
                >
                  Category
                </label>

                <select
                  id="itemCategory"
                  className={s.input}
                  value={itemCategoryId}
                  onChange={(e) =>
                    setItemCategoryId(e.target.value)
                  }
                  required
                >
                  <option value="">Select a category</option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>

                <label
                  className={s.formLabel}
                  htmlFor="menuItemName"
                >
                  Menu Item Name
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

                <div className={s.actionRow}>
                  <button
                    className={s.btn}
                    type="submit"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingItem
                        ? "Save Changes"
                        : "Add Menu Item"}
                  </button>

                  {editingItem && (
                    <button
                      className={s.secondaryBtn}
                      type="button"
                      onClick={resetItemForm}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className={s.grid3}>
                {visibleItems.map((item) => (
                  <div key={item.id} className={s.tileCard}>
                    <div className={s.tile}>{item.name}</div>

                    <div className={s.actionRow}>
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
                  </div>
                ))}
              </div>

              {visibleItems.length === 0 && (
                <p className={s.empty}>
                  No menu items in this category yet. Add one above.
                </p>
              )}
            </section>
          )}
        </>
      )}
    </StaffLayout>
  );
}
