import verifyToken from "./authentication.js";
import handleUpload from "./cloudinaryUpload.js";

const middlewareController = {
    verifyToken,
    ...handleUpload
}

export default middlewareController;