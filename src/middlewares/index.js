import handleAuthentication from "./authentication.js";
import verifyOwner from "./authorization.js";
import handleUpload from "./cloudinary.js";

const middlewareController = {
    ...handleAuthentication,
    ...handleUpload,
    verifyOwner
}

export default middlewareController;