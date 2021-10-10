const express = require('express')
const router = express.Router()

// Home
router.get('/', (req, res) => {
    res.render('home/homepage')
})

module.exports = router