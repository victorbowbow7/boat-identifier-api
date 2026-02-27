const express = require('express');
const router = express.Router();

// GET /api/history - Get all identifications
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  db.all(
    `SELECT * FROM identifications 
     ORDER BY identified_at DESC 
     LIMIT ? OFFSET ?`,
    [limit, offset],
    (err, rows) => {
      if (err) {
        console.error('❌ History fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch history' });
      }
      
      res.json({
        success: true,
        count: rows.length,
        identifications: rows
      });
    }
  );
});

// GET /api/history/:id - Get specific identification
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;

  db.get(
    `SELECT * FROM identifications WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        console.error('❌ Identification fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch identification' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Identification not found' });
      }
      
      res.json({
        success: true,
        identification: row
      });
    }
  );
});

// DELETE /api/history/:id - Delete identification
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;

  db.run(
    `DELETE FROM identifications WHERE id = ?`,
    [id],
    function(err) {
      if (err) {
        console.error('❌ Delete error:', err);
        return res.status(500).json({ error: 'Failed to delete identification' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Identification not found' });
      }
      
      res.json({
        success: true,
        message: 'Identification deleted'
      });
    }
  );
});

module.exports = router;