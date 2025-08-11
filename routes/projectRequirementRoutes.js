const express = require("express");
const router = express.Router();
const pool = require("../db"); // PostgreSQL pool

// POST /api/project/save → Submit project requirement
router.post("/save", async (req, res) => {
  try {
    const {
      username,
      email,
      phone,
      address,
      selectedServices,
      selectedSubServices,
      projectTimeline,
      additionalRequirements,
      keepUpdated,
      budgetRange
    } = req.body;

    if (!username || !phone || !selectedServices || !Array.isArray(selectedServices)) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const query = `
      INSERT INTO project_requirements (
        username, email, phone, address,
        selectedServices, selectedSubServices,
        projectTimeline, additionalRequirements,
        keepUpdated, budgetRange
      )
      VALUES (
        $1, $2, $3, $4,
        $5, $6,
        $7, $8,
        $9, $10
      )
      RETURNING *;
    `;

    const values = [
      username,
      email,
      phone,
      address,
      selectedServices,
      selectedSubServices || {}, // JSONB
      projectTimeline,
      additionalRequirements,
      keepUpdated,
      budgetRange
    ];

    const result = await pool.query(query, values);
    res.status(201).json({ message: "Form submitted successfully!", data: result.rows[0] });
  } catch (error) {
    console.error("Submission Error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// GET /api/project/get-all → Fetch all submissions
router.get("/get-all", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM project_requirements ORDER BY submittedAt DESC`);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ message: "Failed to fetch project requirements." });
  }
});

module.exports = router;
