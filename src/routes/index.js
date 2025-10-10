import authRoutes from "./auth.js";
import trackRoutes from "./track.js";
import searchRoutes from "./search.js";
import playlistRoutes from "./playlist.js";
import userRoutes from "./user.js";

const routes = {
    auth: authRoutes,
    tracks: trackRoutes,
    searchs: searchRoutes,
    playlists: playlistRoutes,
    users: userRoutes,
    use: function (app) {
        Object.entries(this).forEach(([key, value]) => {
            if (key !== "use") {
                app.use(`/api/${key}`, value);
            }
        });
    },
};

export default routes;
