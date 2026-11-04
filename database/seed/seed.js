import "dotenv/config";
import bcrypt from "bcrypt";
import pool from "../../src/config/db.js";

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. ROLES
    const roles = ["admin", "planner", "operator"];
    for (const role of roles) {
      await client.query(
        `INSERT INTO roles (name)
         VALUES ($1)
         ON CONFLICT (name) DO NOTHING`,
        [role],
      );
    }

    // 2. USERS
    const defaultPassword = "Password@123";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const users = [
      ["Admin User", "admin@shopfloor.com", "admin"],
      ["Planner User", "planner@shopfloor.com", "planner"],
      ["Operator User", "operator@shopfloor.com", "operator"],
    ];

    for (const [name, email, roleName] of users) {
      await client.query(
        `INSERT INTO users
            (name, email, password_hash, role_id, is_active)
         SELECT $1, $2, $3, r.id, true
         FROM roles r
         WHERE r.name = $4
         ON CONFLICT (email) DO NOTHING`,
        [name, email, passwordHash, roleName],
      );
    }

    // 3. SUPPLIERS
    const suppliers = [
      ["Timber Traders", "timber@example.com", "9876543210"],
      ["Steel Suppliers", "steel@example.com", "9876543211"],
      ["Hardware Solutions", "hardware@example.com", "9876543212"],
    ];

    for (const [name, email, phone] of suppliers) {
      await client.query(
        `INSERT INTO suppliers (name, email, phone)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO NOTHING`,
        [name, email, phone],
      );
    }

    // 4. MATERIALS
    const materials = [
      ["M001", "Wooden Plank", "kg", 100],
      ["M002", "Screws", "pcs", 500],
      ["M003", "Wood Polish", "kg", 20],
      ["M004", "Steel Rod", "kg", 50],
      ["M005", "Wood Glue", "kg", 15],
      ["M006", "Sandpaper", "pcs", 100],
      ["M007", "Wooden Sheet", "kg", 50],
      ["M008", "Nails", "pcs", 500],
      ["M009", "Paint", "kg", 20],
      ["M010", "Plastic Caps", "pcs", 200],
    ];

    for (const [code, name, unit, reorderLevel] of materials) {
      await client.query(
        `INSERT INTO materials
            (code, name, unit, reorder_level)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO NOTHING`,
        [code, name, unit, reorderLevel],
      );
    }

    // 5. PRODUCTS
    const products = [
      ["CH-001", "Wooden Chair"],
      ["TB-001", "Wooden Table"],
      ["ST-001", "Wooden Stool"],
    ];

    for (const [sku, name] of products) {
      await client.query(
        `INSERT INTO products
            (sku, name, finished_stock, is_active)
         VALUES ($1, $2, 0, true)
         ON CONFLICT (sku) DO NOTHING`,
        [sku, name],
      );
    }

    // 6. MATERIAL STOCK
    await client.query(`
      INSERT INTO material_stock
          (material_id, on_hand, reserved)
      SELECT id, 0, 0
      FROM materials
      ON CONFLICT (material_id) DO NOTHING;
    `);

    // 7. BILL OF MATERIALS
    const bom = [
      // Chair
      ["CH-001", "M001", 5],
      ["CH-001", "M002", 12],
      ["CH-001", "M003", 0.2],
      ["CH-001", "M005", 0.3],

      // Table
      ["TB-001", "M001", 10],
      ["TB-001", "M004", 2],
      ["TB-001", "M002", 20],
      ["TB-001", "M009", 0.5],

      // Stool
      ["ST-001", "M001", 3],
      ["ST-001", "M002", 8],
      ["ST-001", "M006", 2],
      ["ST-001", "M010", 4],
    ];

    for (const [sku, materialCode, quantity] of bom) {
      await client.query(
        `INSERT INTO bill_of_materials
            (product_id, material_id, quantity_per_unit)
         SELECT p.id, m.id, $3
         FROM products p
         CROSS JOIN materials m
         WHERE p.sku = $1
           AND m.code = $2
         ON CONFLICT (product_id, material_id)
         DO UPDATE SET
            quantity_per_unit = EXCLUDED.quantity_per_unit`,
        [sku, materialCode, quantity],
      );
    }

    await client.query("COMMIT");

    console.log("ShopFloor seed completed successfully!");
    console.log("Roles: 3");
    console.log("Users: 3 (default password: Password@123)");
    console.log("Suppliers: 3");
    console.log("Materials: 10");
    console.log("Products: 3");
    console.log("Material stock records initialized");
    console.log("BOM entries: 12");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => {
  process.exitCode = 1;
});
