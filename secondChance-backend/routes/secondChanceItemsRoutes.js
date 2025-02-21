const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');

// Define the upload directory path
const directoryPath = 'public/images';

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, directoryPath); // Specify the upload directory
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Use the original file name
    },
});

const upload = multer({ storage: storage });


// Get all secondChanceItems
router.get("/", async (req, res, next) => {
    logger.info("/ called");
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");

        const secondChanceItems = await collection.find({}).toArray();
        res.json(secondChanceItems);
    } catch (error) {
        logger.error("Error retrieving items:", error);
        next(error);
    }
});

// Add a new item
router.post("/", upload.single("image"), async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");

        let secondChanceItem = req.body;

        // Get last ID and increment it
        const lastItem = await collection.find().sort({ id: -1 }).limit(1).toArray();
        secondChanceItem.id = lastItem.length > 0 ? (parseInt(lastItem[0].id) + 1).toString() : "1";

        // Set current date
        secondChanceItem.date_added = Math.floor(Date.now() / 1000);
        secondChanceItem.image = req.file ? `/images/${req.file.filename}` : null;

        await collection.insertOne(secondChanceItem);
        res.status(201).json(secondChanceItem);
    } catch (error) {
        logger.error("Error adding item:", error);
        next(error);
    }
});

// Get a single secondChanceItem by ID
router.get("/:id", async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");

        const secondChanceItem = await collection.findOne({ id: req.params.id });

        if (!secondChanceItem) {
            return res.status(404).json({ message: "Item not found" });
        }

        res.json(secondChanceItem);
    } catch (error) {
        logger.error("Error fetching item:", error);
        next(error);
    }
});

// Update and existing item
router.put("/:id", async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");

        const updatedItem = {
            category: req.body.category,
            condition: req.body.condition,
            age_days: req.body.age_days,
            description: req.body.description,
            age_years: (req.body.age_days / 365).toFixed(1),
            updatedAt: Date.now(),
        };

        const result = await collection.updateOne(
            { id: req.params.id },
            { $set: updatedItem }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Item not found" });
        }

        res.json({ message: "Item updated successfully" });
    } catch (error) {
        logger.error("Error updating item:", error);
        next(error);
    }
});


// Delete an existing item
router.delete("/:id", async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");

        const result = await collection.deleteOne({ id: req.params.id });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Item not found" });
        }

        res.json({ message: "Item deleted successfully" });
    } catch (error) {
        logger.error("Error deleting item:", error);
        next(error);
    }
});

module.exports = router;
