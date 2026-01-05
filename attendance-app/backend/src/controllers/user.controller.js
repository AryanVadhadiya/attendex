const User = require('../models/User');

const getProfile = async (req, res) => {
  const startTime = Date.now();
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user) {
      console.log('[PERF] getProfile not-found', req.user._id.toString(), Date.now() - startTime, 'ms');
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('[PERF] getProfile', req.user._id.toString(), Date.now() - startTime, 'ms');
    res.json(user);
  } catch (err) {
    console.error('[PERF] getProfile error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  const startTime = Date.now();
  try {
    const updates = {};
    if (typeof req.body.isTimetableLocked === 'boolean') {
        updates.isTimetableLocked = req.body.isTimetableLocked;
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true }
    ).select('-passwordHash');
    console.log('[PERF] updateProfile', req.user._id.toString(), Date.now() - startTime, 'ms', {
      isTimetableLocked: updates.isTimetableLocked
    });

    res.json(user);
  } catch (err) {
    console.error('[PERF] updateProfile error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateLabUnits = async (req, res) => {
  const startTime = Date.now();
  try {
    const { strategy, labUnitValue, doubleConfirmed } = req.body;

    if (!doubleConfirmed) {
      return res.status(400).json({ message: 'Double confirmation required before locking lab units.' });
    }

    if (!['nirma', 'custom'].includes(strategy)) {
      return res.status(400).json({ message: 'Invalid lab unit strategy.' });
    }

    const user = await User.findById(req.user._id).select('labUnitLockedAt labUnitStrategy labUnitValue');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.labUnitLockedAt) {
      return res.status(409).json({ message: 'Lab unit preference already locked.' });
    }

    let nextValue = 1;
    if (strategy === 'custom') {
      const parsed = Number(labUnitValue);
      if (!parsed || parsed < 1 || parsed > 4) {
        return res.status(400).json({ message: 'Lab unit value must be between 1 and 4.' });
      }
      nextValue = parsed;
    }

    user.labUnitStrategy = strategy;
    user.labUnitValue = nextValue;
    user.labUnitLockedAt = new Date();
    await user.save();

    console.log('[PERF] updateLabUnits', req.user._id.toString(), Date.now() - startTime, 'ms', {
      strategy,
      labUnitValue: nextValue
    });

    res.json({
      labUnitStrategy: user.labUnitStrategy,
      labUnitValue: user.labUnitValue,
      labUnitLockedAt: user.labUnitLockedAt
    });
  } catch (err) {
    console.error('[PERF] updateLabUnits error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const unlockLabUnits = async (req, res) => {
  const startTime = Date.now();
  try {
    const { confirm } = req.body || {};
    if (!confirm) {
      return res.status(400).json({ message: 'Confirmation required to unlock lab units.' });
    }

    const user = await User.findById(req.user._id).select('labUnitLockedAt');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.labUnitLockedAt) {
      return res.status(400).json({ message: 'Lab units are already unlocked.' });
    }

    user.labUnitLockedAt = null;
    await user.save();

    console.log('[PERF] unlockLabUnits', req.user._id.toString(), Date.now() - startTime, 'ms');

    res.json({ labUnitLockedAt: null });
  } catch (err) {
    console.error('[PERF] unlockLabUnits error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getProfile, updateProfile, updateLabUnits, unlockLabUnits };
