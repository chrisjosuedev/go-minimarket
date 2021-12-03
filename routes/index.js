const express = require('express')
const router = express.Router()
const { isLoggedIn } = require('../lib/auth')

// Home
router.get('/home', isLoggedIn, (req, res) => {
    res.render('home/homepage')
})

module.exports = router