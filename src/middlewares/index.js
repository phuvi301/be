import verifyToken from "./authentication.js";
import handleUpload from "./cloudinary.js";

const middlewareController = {
    verifyToken,
    ...handleUpload
}

export default middlewareController;