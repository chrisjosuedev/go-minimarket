const format = require("date-format");

const helpers = {};

helpers.format = (fechaContrato) => {
  return format("dd/MM/yyyy", fechaContrato);
};

helpers.hourFormat = (fecha) => {
  var time = new Date(fecha);
  return time.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: "numeric", hour12: true })
};

module.exports = helpers;
