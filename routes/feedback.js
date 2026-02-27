const express = require('express');
const router = express.Router();

// POST /api/feedback - Submit feedback for an identification
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { identification_id, is_correct, feedback_text } = req.body;

  if (!identification_id) {
    return res.status(400).json({ error: 'identification_id is required' });
  }

  db.run(
    `INSERT INTO feedback (identification_id, is_correct, feedback_text)
     VALUES (?, ?, ?)`,
    [identification_id, is_correct || false, feedback_text || null],
    function(err) {
      if (err) {
        console.error('❌ Feedback save error:', err);
        return res.status(500).json({ error: 'Failed to save feedback' });
      }
      
      res.json({
        success: true,
        id: this.lastID,
        message: 'Thank you for your feedback!'
      });
    }
  );
});

// GET /api/feedback/stats - Get feedback statistics
router.get('/stats', (req, res) => {
  const db = req.app.locals.db;

  db.get(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
      SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect_count
     FROM feedback`,
    [],
    (err, row) => {
      if (err) {
        console.error('❌ Stats fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch stats' });
      }
      
      res.json({
        success: true,
        stats: row
      });
    }
  );
});

module.exports = router;