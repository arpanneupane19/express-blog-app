// Import necessary libraries/frameworks for app config
const express = require('express')
const session = require('express-session')
const bcrypt = require("bcrypt")
const mongoose = require("mongoose")
const { loginRequired, loggedOut } = require('./middlewares/middlewares')
const User = require('./models/User.js')
const Post = require('./models/Post.js')


// App config & Middlewares
const app = express()
const dotenv = require("dotenv")
dotenv.config()
const PORT = process.env.PORT || 5000
app.set('view engine', 'ejs');
app.use(express.static(__dirname + "/public"))
app.use(session({
    secret: "fjasdlfjasld",
    cookie: { maxAge: 2629800000 },
    resave: false,
    saveUninitialized: false
}))
app.use(express.urlencoded({ extended: false }))
app.use(express.json())


// Database connection to MongoDB
mongoose.connect(`mongodb+srv://${process.env.USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.pdvbx.mongodb.net/Express-Blog-App?retryWrites=true&w=majority`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
}).then((res) => {
    console.log("Connected to MongoDB")
}).catch((err) => {
    console.log('An error occurred...', err)
})

app.use(function (req, res, next) {
    res.locals.currentUser = req.session.user
    next();
})

app.get("/", loggedOut, (req, res) => {
    res.render("index", { title: "Home" })
})

app.get("/register", loggedOut, (req, res) => {
    res.render("register", { title: "Register" })
})

app.post("/register", async (req, res) => {
    const username = req.body.username
    const password = req.body.password
    const user = await User.exists({ username: username })
    if (user) {
        res.send("User already exists")
        return;
    }

    bcrypt.genSalt(12, (err, salt) => {
        if (err) console.log(err)
        bcrypt.hash(password, salt, (err, hash) => {
            if (err) console.log(err)
            newUser = new User({ username: username, password: hash })
            newUser.save().then((res) => { console.log("New account created successfully") }).catch((err) => {
                console.log(err)
            })
            res.redirect('/login')
        })
    })

})

app.get("/login", loggedOut, (req, res) => {
    res.render("login", { title: "Login" })
})

app.post("/login", async (req, res) => {
    const username = req.body.username
    const password = req.body.password
    const user = await User.findOne({ username: username })
    if (!user) {
        res.send("This account does not exist.")
        return;
    }
    const pwMatch = await bcrypt.compare(password, user.password)
    if (!pwMatch) {
        res.send("This password is incorrect.")
        return;
    }

    if (pwMatch) {
        req.session.user = user
        res.redirect("/dashboard")
    }
})

app.get('/logout', loginRequired, (req, res) => {
    req.session.user = null;
    res.redirect("/login")
})

app.get("/dashboard", loginRequired, async (req, res) => {
    const posts = await Post.find().lean()
    res.render("dashboard", { title: "Dashboard", username: req.session.user.username, posts: posts })
})

app.get("/post", loginRequired, (req, res) => {
    res.render("post", { title: "New Post" })
})

app.post("/post", async (req, res) => {
    const title = req.body.title
    const description = req.body.description
    newPost = new Post({ title: title, description: description, author: req.session.user, authorUsername: req.session.user.username })
    newPost.save().then((res) => { console.log("New post created successfully") }).catch((err) => {
        console.log(err)
    })


    const user = await User.findById(newPost.author)
    user.posts.push(newPost)
    user.save()
    res.redirect("/dashboard")
})

app.get("/edit-post/:id", async (req, res) => {
    const post = await Post.findById(req.params.id).catch((err) => res.redirect("/dashboard"))

    if (post) {
        if (req.session.user._id !== post.author.toString()) {
            res.send("you do not have permission to do that!")
            return;
        }
        if (req.session.user._id === post.author.toString()) {
            res.render("editPost", { title: "Edit Post" })
        }
    }
})


app.post("/edit-post/:id", async (req, res) => {
    const post = await Post.findById(req.params.id).catch((err) => res.redirect("/dashboard"))

    if (post) {
        if (req.session.user._id !== post.author.toString()) {
            res.send("you do not have permission to do that!")
            return;
        }
        if (req.session.user._id === post.author.toString()) {
            post.title = req.body.title
            post.description = req.body.description
            post.save()
            res.redirect('/dashboard')
        }
    }
})


app.post("/delete/:id", async (req, res) => {
    const post = await Post.findById(req.params.id).catch((err) => res.redirect("/dashboard"))
    const user = await User.findById(req.session.user._id)

    if (post) {
        if (req.session.user._id !== post.author.toString()) {
            res.send("you do not have permission to do that!")
            return;
        }
        if (req.session.user._id === post.author.toString()) {
            let index = user.posts.indexOf(post)
            user.posts.splice(index, 1)
            user.save()
            Post.deleteOne(post, (err, result) => {
                if (err) {
                    console.log(err)
                    res.redirect("/")
                    return;
                }

                if (result) {
                    res.redirect("/dashboard")

                }
            })
        }
    }


})

app.listen(PORT, () => { console.log(`Listening on port ${PORT}`) })