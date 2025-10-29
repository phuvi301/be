const verifyOwner = (Model, options = {}) => {
    const { allowBypass = false, field = "owner", paramsField = "id" } = options;
    return async (req, res, next) => {
        try {
            const resourceId = req.params[paramsField];
            const userId = req.user.id;

            const resource = await Model.findById(resourceId);
            if (!resource) return res.status(404).json({ message: `${Model.modelname} not found` });

            if (userId !== resource[field].toString() && !allowBypass)
                return res.status(403).json({ message: "Permission deny" });

            req.resource = resource;
            req.isOwner = userId !== resource[field].toString();

            next();
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    };
};

export default verifyOwner;
