import handleAuthentication from "./authentication.js";
import handleUpload from "./cloudinary.js";

const middlewareController = {
    ...handleAuthentication,
    ...handleUpload
}

export default middlewareController;