const db = require('../config/db');

const listBranches = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const r = await db.query("SELECT * FROM branches ORDER BY id ASC");
      res.json(r.rows);
    } else {
      const r = await db.query("SELECT * FROM branches WHERE id = $1", [req.user.branchId]);
      res.json(r.rows);
    }
  } catch (err) {
    res.status(500).send("Error");
  }
};

const getBranchById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (req.user.role !== 'admin' && req.user.branchId !== id) {
      return res.status(403).send("Denied");
    }
    const r = await db.query("SELECT * FROM branches WHERE id = $1", [id]);
    if (r.rows.length === 0) return res.status(404).send("Not found");
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).send("Error");
  }
};

const createBranch = async (req, res) => {
  try {
    const { branch_name, branch_code, address, phone_number } = req.body;
    if (!branch_name || !branch_code) {
      return res.status(400).json({ error: "Name/Code required." });
    }
    const r = await db.query(
      "INSERT INTO branches (branch_name, branch_code, address, phone_number) VALUES ($1, $2, $3, $4) RETURNING *",
      [branch_name, branch_code, address, phone_number]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).send("Error");
  }
};

const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch_name, branch_code, address, phone_number, license_number, is_active } = req.body;
    const ex = await db.query("SELECT * FROM branches WHERE id = $1", [id]);
    if (ex.rows.length === 0) return res.status(404).send("Not found");

    const old = ex.rows[0];
    const r = await db.query(
      `UPDATE branches SET branch_name=$1, branch_code=$2, address=$3, phone_number=$4, license_number=$5, is_active=$6 WHERE id=$7 RETURNING *`,
      [
        branch_name || old.branch_name,
        branch_code || old.branch_code,
        address || old.address,
        phone_number || old.phone_number,
        license_number || old.license_number,
        is_active !== undefined ? is_active : old.is_active,
        id
      ]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).send("Error");
  }
};

module.exports = {
  listBranches,
  getBranchById,
  createBranch,
  updateBranch
};