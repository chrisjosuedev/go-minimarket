const express = require('express')
const router = express.Router()
const pool = require("../database");
const passport = require('passport');

router.get('/signin', (req, res) => {
    res.render('auth/signin');
})

router.post('/signin', (req, res, next) => {
    passport.authenticate('local.signin', {
        successRedirect: '/home',
        failureRedirect: '/signin',
        failureFlash: true
    }) (req, res, next);
})

router.get("/signup", async (req, res) => {
    const roles = await pool.query("SELECT * FROM rol_users");
    res.render("auth/signup", { roles });
})

router.get('/logout', (req, res) => {
    req.logOut();
    res.redirect('/signin')
})

module.exports = router