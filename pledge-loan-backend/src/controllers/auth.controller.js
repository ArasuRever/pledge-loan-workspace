const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../config/constants');

const checkHealth = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT NOW()');
    res.status(200).json({
      message: "Welcome to Pledge Loan API",
      db_status: "Connected",
      db_time: rows[0].now
    });
  } catch (err) {
    res.status(500).json({ message: "DB Error" });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).send('Required');

    const query = `
      SELECT u.*, b.branch_name 
      FROM users u 
      LEFT JOIN branches b ON u.branch_id = b.id 
      WHERE u.username = $1
    `;
    const userResult = await db.query(query, [username]);
    if (userResult.rows.length === 0) return res.status(401).send('Invalid');

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).send('Invalid');

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role, branchId: user.branch_id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        branchId: user.branch_id,
        branchName: user.branch_name || 'Main'
      }
    });
  } catch (err) {
    res.status(500).send('Error');
  }
};

const listUsers = async (req, res) => {
  try {
    const users = await db.query(`
      SELECT u.id, u.username, u.role, u.branch_id, b.branch_name 
      FROM users u 
      LEFT JOIN branches b ON u.branch_id = b.id 
      ORDER BY u.id ASC
    `);
    res.json(users.rows);
  } catch (err) {
    res.status(500).send("Server Error");
  }
};

const createUser = async (req, res) => {
  try {
    const { username, password, role, branchId } = req.body;
    if (!username || !password) return res.status(400).send('Required');

    const validRoles = ['admin', 'manager', 'staff'];
    const assignedRole = validRoles.includes(role) ? role : 'staff';
    const assignedBranch = branchId || 1;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await db.query(
      "INSERT INTO users (username, password, role, branch_id) VALUES ($1, $2, $3, $4) RETURNING id, username, role, branch_id",
      [username, hashedPassword, assignedRole, assignedBranch]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).send('Username exists.');
    res.status(500).send('Error');
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, role, branchId } = req.body;

    const check = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: "Not found" });

    const oldUser = check.rows[0];
    const newUsername = username || oldUser.username;
    const newRole = role || oldUser.role;
    const newBranchId = (branchId !== undefined) ? branchId : oldUser.branch_id;

    const result = await db.query(
      "UPDATE users SET username = $1, role = $2, branch_id = $3 WHERE id = $4 RETURNING id, username, role, branch_id",
      [newUsername, newRole, newBranchId, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send("Error");
  }
};

const changePassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) return res.status(400).send('Required');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const result = await db.query(
      "UPDATE users SET password = $1 WHERE id = $2 RETURNING id, username",
      [hashedPassword, userId]
    );

    if (result.rows.length === 0) return res.status(404).send('Not found.');
    res.status(200).json({ message: `Password updated.` });
  } catch (err) {
    res.status(500).send('Error');
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    if (userId === req.user.userId) return res.status(400).send('Cannot delete self.');

    const result = await db.query("DELETE FROM users WHERE id = $1 RETURNING id, username", [userId]);
    if (result.rows.length === 0) return res.status(404).send('Not found.');
    res.status(200).json({ message: `User deleted.` });
  } catch (err) {
    res.status(500).send('Error');
  }
};

module.exports = {
  checkHealth,
  login,
  listUsers,
  createUser,
  updateUser,
  changePassword,
  deleteUser
};