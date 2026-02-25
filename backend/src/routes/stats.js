import express from 'express';
import { 
  getSnapshots, 
  getSnapshotWithStats, 
  getComparisonData, 
  getTopHeroes,
  getHealthCheck 
} from '../db-mock.js';

const router = express.Router();

/**
 * GET /api/snapshots
 * Returns available snapshots with optional filters
 */
router.get('/snapshots', (req, res) => {
  try {
    const { mode, input, region, tier, limit } = req.query;
    
    const snapshots = getSnapshots({
      mode,
      input,
      region,
      tier,
      limit: limit ? parseInt(limit) : 30
    });

    res.json({ snapshots });
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    res.status(500).json({ error: 'Failed to fetch snapshots' });
  }
});

/**
 * GET /api/stats/:snapshotId
 * Returns hero stats for a specific snapshot
 */
router.get('/stats/:snapshotId', (req, res) => {
  try {
    const snapshotId = parseInt(req.params.snapshotId);
    
    if (isNaN(snapshotId)) {
      return res.status(400).json({ error: 'Invalid snapshot ID' });
    }

    const data = getSnapshotWithStats(snapshotId);
    
    if (!data) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching snapshot stats:', error);
    res.status(500).json({ error: 'Failed to fetch snapshot stats' });
  }
});

/**
 * GET /api/compare
 * Returns comparison data for dumbbell chart
 */
router.get('/compare', (req, res) => {
  try {
    const { mode, input, region, tier, startDate, endDate } = req.query;

    // Validate required parameters
    if (!mode || !input || !region || !tier) {
      return res.status(400).json({ 
        error: 'Missing required parameters: mode, input, region, tier' 
      });
    }

    const comparison = getComparisonData({
      mode,
      input,
      region,
      tier,
      startDate,
      endDate
    });

    res.json({ comparison });
  } catch (error) {
    console.error('Error fetching comparison data:', error);
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
});

/**
 * GET /api/top
 * Returns top X heroes by metric
 */
router.get('/top', (req, res) => {
  try {
    const { mode, input, region, tier, metric, limit, date } = req.query;

    // Validate required parameters
    if (!mode || !input || !region || !tier || !metric) {
      return res.status(400).json({ 
        error: 'Missing required parameters: mode, input, region, tier, metric' 
      });
    }

    // Validate metric
    if (metric !== 'pick_rate' && metric !== 'win_rate') {
      return res.status(400).json({ 
        error: 'Invalid metric. Must be pick_rate or win_rate' 
      });
    }

    const data = getTopHeroes({
      mode,
      input,
      region,
      tier,
      metric,
      limit: limit ? parseInt(limit) : 10,
      date
    });

    res.json(data);
  } catch (error) {
    console.error('Error fetching top heroes:', error);
    res.status(500).json({ error: 'Failed to fetch top heroes' });
  }
});

/**
 * GET /api/health
 * Returns health check data
 */
router.get('/health', (req, res) => {
  try {
    const health = getHealthCheck();
    res.json(health);
  } catch (error) {
    console.error('Error fetching health data:', error);
    res.status(500).json({ error: 'Failed to fetch health data' });
  }
});

export default router;
