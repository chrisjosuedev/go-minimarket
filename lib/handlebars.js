const format = require("date-format");

const helpers = {};

helpers.format = (fechaContrato) => {
  return format("dd/MM/yyyy", fechaContrato);
};

module.exports = helpers;
