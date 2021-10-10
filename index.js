const express = require('express')
const morgan = require('morgan')
const exphbs = require('express-handlebars')
const path = require('path')
const flash = require('connect-flash')
const sessions = require('express-session')
const MySqlStore = require('express-mysql-session')
//const passport = require('passport');

// Base de Datos
const { database } = require('./keys')

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

// Variables Globales
app.use((req, res, next) => {
    app.locals.success = req.flash('success')
    app.locals.message = req.flash('message')
    next();
});

// Rutas
app.use(require('./routes'))
app.use('/productos', require('./routes/productos'))
app.use('/persona', require('./routes/persona'))
app.use('/laboral', require('./routes/laboral'))
app.use('/facturacion', require('./routes/facturacion'))

// Public
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar el Server
app.listen(port, () => {
    console.log('Server on Port', port)
})