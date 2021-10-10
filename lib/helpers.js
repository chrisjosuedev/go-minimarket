const bcrypt = require('bcryptjs');
const helpers = {};

// Registro
helpers.encryptPassword = async (password) => {
    // Hash para Password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    return hash;
};

// Login (Desencriptar)
helpers.matchPassword = async (password, savedPassword) => {
    try {
        return await bcrypt.compare(password, savedPassword);
    }
    catch(e) {
        console.log(e);
    }
};

module.exports = helpers;