const loginRequired = (req, res, next) => {
    if (!req.session.user) {
        res.send("Please log in to access this page.")
        return;
    }
    next()
}

const loggedOut = (req, res, next) => {
    if (req.session.user) {
        res.send("You're currently logged in, you must be logged out to view this route.")
        return;
    }
    next()
}


module.exports = {
    loginRequired, loggedOut
}