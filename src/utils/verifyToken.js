const jwt = require("jsonwebtoken");
const User = require("../models/User");

const verifyTokenAndGetUser = async (token) => {
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) return null;
        const user = await User.findById(decoded.id).select("-password");
        return user;
    } catch (err) {
        return null;
    }
};

module.exports = { verifyTokenAndGetUser };

