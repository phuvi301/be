import authRoutes from "./auth.js";
import trackRoutes from "./track.js";
import searchRoutes from "./search.js";
import playlistRoutes from "./playlist.js";
import userRoutes from "./user.js";
import commentRoutes from "./comments.js";
import notificationRoutes from "./notification.js";
import followRoutes from "./follow.js";

const routes = {
    auth: authRoutes,
    tracks: trackRoutes,
    search: searchRoutes,
    playlists: playlistRoutes,
    users: userRoutes,
    comments: commentRoutes,
    notifications: notificationRoutes,
    follow: followRoutes,
    use: function (app) {
        Object.entries(this).forEach(([key, value]) => {
            if (key !== "use") {
                app.use(`/api/${key}`, value);
            }
        });
    },
};

export default routes;
