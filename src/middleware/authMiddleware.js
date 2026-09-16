const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(" ")[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            req.user = await User.findById(decoded.id).select("-password");

            if (!req.user) {
                console.error(`Protect Middleware: User not found in DB for ID ${decoded.id}`);
                return res.status(401).json({ message: "Not authorized - User not found" });
            }

            return next();
        } catch (error) {
            console.error("Protect Middleware Error:", error.message);
            if (error.name === "TokenExpiredError") {
                return res.status(401).json({ message: "Session expired, please login again" });
            }
            return res.status(401).json({ message: `Not authorized - ${error.message}` });
        }
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }
};

module.exports = { protect };
