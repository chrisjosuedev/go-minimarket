const express = require('express')
const morgan = require('morgan')
const exphbs = require('express-handlebars')
const path = require('path')
const flash = require('connect-flash')
const sessions = require('express-session')
const MySqlStore = require('express-mysql-session')
const passport = require('passport');

// Base de Datos
const { database } = require('./keys')

// Init
require('./lib/passport');

// Configuracion de Puerto
const app = express()
const port = 3000

// View Engine Handelbars
app.set('views', path.join(__dirname, 'views'))
app.engine('.hbs', exphbs({
    defaultLayout: 'main',
    layoutsDir: path.join(app.get('views'), 'layouts'),
    partialsDir: path.join(app.get('views'), 'partials'),
    extname: '.hbs',
    helpers: require('./lib/handlebars')
}))

app.set('view engine', '.hbs')

// Middlerwars (Peticiones al Servidor)
app.use(sessions({
    secret: 'test',
    resave: false,
    saveUnitialized: false,
    store: new MySqlStore(database)
}))

app.use(flash())
app.use(morgan('dev'))
app.use(express.urlencoded({extended: false}))
app.use(express.json())
app.use(passport.initialize());
app.use(passport.session());

// Variables Globales
app.use((req, res, next) => {
    app.locals.success = req.flash('success')
    app.locals.message = req.flash('message')
    app.locals.invoice = req.flash('invoice')
    app.locals.user = req.user
    next();
});

// Rutas
app.use(require('./routes'))
app.use('/productos', require('./routes/productos'))
app.use('/persona', require('./routes/persona'))
app.use('/laboral', require('./routes/laboral'))
app.use('/facturacion', require('./routes/facturacion'))
app.use('/analiticas', require('./routes/analiticas'))
app.use(require('./routes/authentication'));

// Public
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar el Server
app.listen(port, () => {
    console.log('Server on Port', port)
})