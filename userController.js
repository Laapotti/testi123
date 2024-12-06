const { createUser, authenticateUser } = require("./dataManager");

// User registration
const registerUser = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Bad Request" });
    }

    try {
        await createUser(username, password);
        res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        res.status(400).json({ error: "Bad Request" });
    }
};

// User login
const loginUser = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Bad Request" });
    }

    try {
        const isAuthenticated = await authenticateUser(username, password);
        if (isAuthenticated) {
            res.status(200).json({ message: "Login successful" });
        } else {
            res.status(401).json({ error: "Unauthorized" });
        }
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { registerUser, loginUser };
