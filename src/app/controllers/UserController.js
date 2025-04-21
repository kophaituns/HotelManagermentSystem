const User = require("../model/User");

const UserController = {
    getUser: (req, res) => {
        User.find({})
            .then((user) => {
                if (!user) {
                    return res.status(404).json({ message: "User not found" });
                }
                return res.status(200).json(user);
            })
            .catch((error) => {
                return res.status(500).json({ message: "Internal server error" });
            });

    },
}

module.exports = UserController;    