const db = require('../config/db');

const getSettings = async (req, res) => {
  try {
    const r = await db.query("SELECT * FROM business_settings WHERE id=1");
    if (r.rows.length > 0) {
      res.json(r.rows[0]);
    } else {
      res.json({ business_name: 'Bankers' });
    }
  } catch (err) {
    res.status(500).send("Error");
  }
};

const updateSettings = async (req, res) => {
  try {
    const { business_name, address, phone_number, license_number, navbar_display_mode } = req.body;
    let logoUrl = req.body.existingLogoUrl;

    if (req.file) {
      const b64 = req.file.buffer.toString('base64');
      logoUrl = `data:${req.file.mimetype};base64,${b64}`;
    }

    const q = `
      INSERT INTO business_settings (id, business_name, address, phone_number, license_number, logo_url, navbar_display_mode, updated_at) 
      VALUES (1, $1, $2, $3, $4, $5, $6, NOW()) 
      ON CONFLICT (id) DO UPDATE 
      SET business_name=$1, address=$2, phone_number=$3, license_number=$4, logo_url=$5, navbar_display_mode=$6, updated_at=NOW() 
      RETURNING *
    `;

    const r = await db.query(q, [
      business_name,
      address,
      phone_number,
      license_number,
      logoUrl,
      navbar_display_mode || 'both'
    ]);

    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).send("Error");
  }
};

module.exports = {
  getSettings,
  updateSettings
};