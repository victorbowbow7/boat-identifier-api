const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const visionService = require('../services/vision');
const maritimeService = require('../services/maritime-api');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// POST /api/identify - Analyze boat image
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const imagePath = req.file.path;
    const imageUrl = `/uploads/${req.file.filename}`;

    // Step 1: Analyze image with Google Vision
    console.log('🔍 Analyzing image with Vision API...');
    const visionResult = await visionService.analyzeBoat(imagePath);

    // Step 2: Search maritime databases if we found a vessel
    let maritimeData = null;
    if (visionResult.boatType || visionResult.labels.length > 0) {
      console.log('🌊 Searching maritime databases...');
      maritimeData = await maritimeService.searchVessel({
        type: visionResult.boatType,
        labels: visionResult.labels,
        colors: visionResult.colors
      });
    }

    // Step 3: Save to database
    const db = req.app.locals.db;
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO identifications 
         (image_path, boat_type, boat_brand, boat_model, confidence, 
          vessel_name, mmsi, registration, length, tonnage, owner, location)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          imageUrl,
          visionResult.boatType,
          visionResult.brand,
          visionResult.model,
          visionResult.confidence,
          maritimeData?.name || null,
          maritimeData?.mmsi || null,
          maritimeData?.imo || null,
          maritimeData?.length || null,
          maritimeData?.tonnage || null,
          maritimeData?.owner || null,
          maritimeData?.location || null
        ],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });

    // Step 4: Return results
    res.json({
      success: true,
      id: result.id,
      imageUrl,
      identification: {
        boatType: visionResult.boatType,
        brand: visionResult.brand,
        model: visionResult.model,
        confidence: visionResult.confidence,
        labels: visionResult.labels,
        colors: visionResult.colors
      },
      vesselData: maritimeData,
      similarBoats: visionResult.similarBoats || []
    });

  } catch (error) {
    console.error('❌ Identification error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze image',
      message: error.message 
    });
  }
});

// POST /api/identify/base64 - Analyze base64 image
router.post('/base64', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Decode base64 and save to file
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `${uuidv4()}.jpg`;
    const imagePath = path.join(__dirname, '..', 'uploads', filename);
    
    fs.writeFileSync(imagePath, buffer);
    const imageUrl = `/uploads/${filename}`;

    // Analyze with Vision API
    console.log('🔍 Analyzing image with Vision API...');
    const visionResult = await visionService.analyzeBoat(imagePath);

    // Search maritime databases
    let maritimeData = null;
    if (visionResult.boatType || visionResult.labels.length > 0) {
      console.log('🌊 Searching maritime databases...');
      maritimeData = await maritimeService.searchVessel({
        type: visionResult.boatType,
        labels: visionResult.labels,
        colors: visionResult.colors
      });
    }

    // Save to database
    const db = req.app.locals.db;
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO identifications 
         (image_path, boat_type, boat_brand, boat_model, confidence, 
          vessel_name, mmsi, registration, length, tonnage, owner, location)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          imageUrl,
          visionResult.boatType,
          visionResult.brand,
          visionResult.model,
          visionResult.confidence,
          maritimeData?.name || null,
          maritimeData?.mmsi || null,
          maritimeData?.imo || null,
          maritimeData?.length || null,
          maritimeData?.tonnage || null,
          maritimeData?.owner || null,
          maritimeData?.location || null
        ],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });

    res.json({
      success: true,
      id: result.id,
      imageUrl,
      identification: {
        boatType: visionResult.boatType,
        brand: visionResult.brand,
        model: visionResult.model,
        confidence: visionResult.confidence,
        labels: visionResult.labels,
        colors: visionResult.colors
      },
      vesselData: maritimeData,
      similarBoats: visionResult.similarBoats || []
    });

  } catch (error) {
    console.error('❌ Identification error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze image',
      message: error.message 
    });
  }
});

module.exports = router;