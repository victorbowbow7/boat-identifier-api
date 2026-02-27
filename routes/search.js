const express = require('express');
const router = express.Router();
const maritimeService = require('../services/maritime-api');

// GET /api/search - Search vessels by query
router.get('/', async (req, res) => {
  try {
    const { q, type, mmsi, imo } = req.query;
    
    const searchParams = {
      query: q,
      type: type,
      mmsi: mmsi,
      imo: imo
    };

    const results = await maritimeService.searchVessel(searchParams);
    
    res.json({
      success: true,
      results: Array.isArray(results) ? results : [results].filter(Boolean)
    });

  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ 
      error: 'Search failed',
      message: error.message 
    });
  }
});

// GET /api/search/vessel/:mmsi - Get vessel by MMSI
router.get('/vessel/:mmsi', async (req, res) => {
  try {
    const { mmsi } = req.params;
    const vessel = await maritimeService.getVesselByMMSI(mmsi);
    
    if (!vessel) {
      return res.status(404).json({ error: 'Vessel not found' });
    }
    
    res.json({
      success: true,
      vessel
    });

  } catch (error) {
    console.error('❌ Vessel lookup error:', error);
    res.status(500).json({ 
      error: 'Vessel lookup failed',
      message: error.message 
    });
  }
});

module.exports = router;