const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../db');
const path = require('path');

//Get Main Services api
router.get('/services', async (req, res) => { 
    try {
        const result = await pool.query('SELECT * FROM services WHERE is_deleted IS NULL OR is_deleted = false')
        const services = result.rows[0];
        if (!services) {
            return res.status(404).json({ message: 'No services found'});

        }
        res.status(200).json({message: 'Services fetched successfully',data: services})
    }catch (error){
        console.error('Error fetching services:', error)
        res.status(500).json({ error: 'Failed to fetch services' });
    }
})

// Add Main Services api
router.post('/services', async (req, res) => {
    const { title, description, sub_services } = req.body;
    try {
        const query = `
            INSERT INTO services (title, description, sub_services)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const values = [title, description, sub_services];
        const result = await pool.query(query, values);
        res.status(201).json({ message: 'Service added successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Error adding service:', error);
        res.status(500).json({ error: 'Failed to add service' });
    }
})

// API to update a service 
router.put('/services/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, sub_services } = req.body;
    try {
        const query = `
            UPDATE services
            SET title = $1, description = $2, sub_services = $3
            WHERE id = $4
            RETURNING *;
        `;
        const values = [title, description, sub_services, id];
        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Service not found' });
        }
        res.status(200).json({ message: 'Service updated successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({ error: 'Failed to update service' });
    }
});

// API to Add a sub services into a service


