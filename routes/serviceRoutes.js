const express = require("express");
const router = express.Router();
const pool = require("../db"); // PostgreSQL pool setup

// POST /api/services/save → Add new service
router.post("/save", async (req, res) => {
  try {
    const { title, subServices } = req.body;

    if (!title || !subServices || !Array.isArray(subServices)) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const insertQuery = `
      INSERT INTO services (title, sub_services)
      VALUES ($1, $2)
      RETURNING *;
    `;

    const result = await pool.query(insertQuery, [title, subServices]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error saving service:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET /api/services/get-all → Fetch all services
router.get("/get-all", async (req, res) => {
  try {
    const fetchQuery = `SELECT * FROM services ORDER BY created_at DESC;`;
    const result = await pool.query(fetchQuery);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching services:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
