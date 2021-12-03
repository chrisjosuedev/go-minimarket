const passport = require('passport');
const localStrategy = require('passport-local').Strategy;

const pool = require('../database')
const helpers = require('../lib/helpers');


// SING IN
passport.use('local.signin', new localStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
}, async (req, username, password, done) => {
    const queryUser = `SELECT persona.NOMBRE_PERSONA as NOMBRE, usuario.*
                        FROM persona
                        left join empleado on persona.ID_PERSONA = empleado.ID_PERSONA
                        inner join usuario on usuario.ID_EMPLEADO = empleado.ID_EMPLEADO
                        inner join rol_users on usuario.ID_ROL = rol_users.ID_ROL
                        WHERE (persona.ID_PERSONA IN (SELECT empleado.ID_PERSONA FROM empleado)) AND usuario.USERNAME = ?`
    const rows = await pool.query(queryUser, [username]);
    // Validacion de Contraseña
    if (rows.length > 0) {
        const user = rows[0];
        console.log(user)
        const validPassword = await helpers.matchPassword(password, user.PASSWORD);
        if (validPassword) {
            done(null, user, req.flash('success', 'Bienvenid@ a Go! Market Online'));
        }
        else {
            done(null, false, req.flash('message', 'Contraseña Incorrecta'));
        }
    }
    else {
        return done(null, false, req.flash('message', 'Usuario no existe'));
    }
}))

passport.serializeUser((user, done) => {
    done(null, user.ID_EMPLEADO);
});

passport.deserializeUser(async (id, done) => {
    const serQuery = `SELECT persona.NOMBRE_PERSONA as NOMBRE, usuario.*, rol_users.DESC_ROL as ROL
                        FROM persona
                        left join empleado on persona.ID_PERSONA = empleado.ID_PERSONA
                        inner join usuario on usuario.ID_EMPLEADO = empleado.ID_EMPLEADO
                        inner join rol_users on usuario.ID_ROL = rol_users.ID_ROL
                        WHERE (persona.ID_PERSONA IN (SELECT empleado.ID_PERSONA FROM empleado)) AND usuario.ID_EMPLEADO = ?`
    const rows = await pool.query(serQuery, [id]);
    done(null, rows[0]);
});
