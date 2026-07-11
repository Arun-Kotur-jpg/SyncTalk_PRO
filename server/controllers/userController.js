import User from '../models/User.js';

// GET /api/users/me
export const getMe = async (req, res) => {
  res.json(req.user);
};

// PUT /api/users/me
export const updateProfile = async (req, res) => {
  try {
    const { username, status, avatar } = req.body;
    const updates = {};
    if (username) updates.username = username;
    if (status !== undefined) updates.status = status;
    if (avatar !== undefined) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-password -refreshTokens');

    res.json(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Username already taken' });
    }
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

// GET /api/users?search=keyword
export const getUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = { _id: { $ne: req.user._id } };

    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('username email avatar status lastSeen')
      .limit(50)
      .sort({ username: 1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// GET /api/users/search?q=keyword
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    })
      .select('username email avatar status')
      .limit(20);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Search failed' });
  }
};
