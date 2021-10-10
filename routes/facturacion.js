const express = require("express");
const router = express.Router();
const pool = require("../database");

// FACTURACION

// -> /facturacion/facturaregistro

router.get("/facturaregistro", async (req, res) => {
  res.render("facturacion/factura/factura");
});

// -> /facturacion/metodopago

router.get("/metodopago/add", async (req, res) => {
  const metodopago = await pool.query("SELECT * FROM modo_pago");
  req.flash('success', 'Modo Pago agregado Correctamente');
  res.render("facturacion/metodopago/metodopago", { metodopago });
});

router.post("/metodopago/add", async (req, res) => {
  const { desc_modopago } = req.body;
  const newModoPago = {
    desc_modopago,
  };
  await pool.query("INSERT INTO modo_pago set ?", [newModoPago]);
  res.redirect("/facturacion/metodopago/add");
});

// Editar
router.get("/metodopago/edit/:id_modopago", async (req, res) => {
  const { id_modopago } = req.params;
  const modo_pago = await pool.query(
    "SELECT * FROM modo_pago WHERE id_modopago = ?",
    [id_modopago]
  );
  //req.flash('success', 'Link edited succesfully');
  res.render("facturacion/metodopago/edit", {
    modo_pago: modo_pago[0],
  });
});

router.post("/metodopago/edit/:id_modopago", async (req, res) => {
  const { id_modopago } = req.params;
  const { desc_modopago } = req.body;
  const newModoPago = {
    desc_modopago,
  };
  await pool.query("UPDATE modo_pago set ? WHERE id_modopago = ?", [
    newModoPago,
    id_modopago,
  ]);
  req.flash('success', 'Modo Pago Actualizado Correctamente');
  res.redirect("/facturacion/metodopago/add");
});

// Eliminar

router.get("/metodopago/delete/:id_modopago", async (req, res) => {
  const { id_modopago } = req.params;
  await pool.query("DELETE FROM modo_pago WHERE id_modopago = ?", [
    id_modopago,
  ]);
  req.flash('success', 'Modo Pago Eliminado Correctamente');
  res.redirect("/facturacion/metodopago/add");
});

// -> /facturacion/compra

router.get("/compra", async (req, res) => {
  res.render("facturacion/compra/compra");
});

module.exports = router;
