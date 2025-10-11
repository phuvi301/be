import User from '../models/User.js';

const UserController = {
    getUser: async (req, res) => {
        try {
            const user = await User.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            user = user.populate(['likedTracks', 'playlists', 'tracks']);
            res.json(user);
            
        } catch (error) {
            res.status(500).json({ message: 'Server error', error });
        }
    },
    updateUser: async (req, res) => {
        try {
            const updatedUser = await User.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true }
            );
            if (!updatedUser) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(updatedUser);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error });
        }
    }
};

export default UserController;