const express = require("express");
const router = express.Router();
const pool = require("../database");

// FACTURACION

// -> /facturacion/facturaregistro

router.get("/facturaregistro", async (req, res) => {
  const empQuery = `SELECT ID_EMPLEADO, ID_CATEGORIA, persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA 
                    FROM empleado 
                    INNER JOIN persona ON empleado.ID_PERSONA = persona.ID_PERSONA 
                    HAVING ID_CATEGORIA = 1 OR ID_CATEGORIA = 3`;
  const empleados = await pool.query(empQuery);
  const clientes = await pool.query("SELECT * FROM persona");
  const metodopago = await pool.query("SELECT * FROM modo_pago");
  const productos = await pool.query("SELECT * FROM productos WHERE STOCK > 0");
  res.render("facturacion/factura/factura", {
    metodopago,
    empleados,
    clientes,
    productos,
  });
});

// Venta de Productos a Clientes
router.post("/facturaregistro", async (req, res) => {
  // dos INSERTS (Factura y Factura_Detalle)

  const {
    id_empleado,
    id_persona,
    id_modopago,
    id_productos,
    cantidad,
    precio_unit,
  } = req.body;
  let idprod = Object.values(id_productos);
  let amount = Object.values(cantidad);
  let price = Object.values(precio_unit);

  // Nueva Compra
  const newVenta = {
    id_empleado,
    id_persona,
    id_modopago,
  };

  // Insertar en tabla COMPRA PRODUCTO
  await pool.query("INSERT INTO factura set ?", [newVenta]);

  const idVentaQuery = `SELECT ID_FACTURA FROM factura
                        ORDER BY ID_FACTURA DESC
                        LIMIT 1`;

  // Almacenar el valor del ID de la ultima Compra
  const idVenta = await pool.query(idVentaQuery);

  // Insertar en tabla COMPRA PRODUCTO DETALLE

  const detalleCompraQuery = `INSERT INTO factura_detalle (ID_FACTURA, ID_PRODUCTOS, CANTIDAD, PRECIO_UNIT) 
                              VALUES (?, ?, ?, ?)`;

  for (index in idprod) {
    await pool.query(detalleCompraQuery, [
      idVenta[0].ID_FACTURA,
      idprod[index],
      amount[index],
      price[index],
    ]);
  }

  // Actualizar Stock

  const updateStockQuery = `UPDATE productos set STOCK = (STOCK - ?) 
                            WHERE ID_PRODUCTOS = ?;`;

  for (key in idprod) {
    await pool.query(updateStockQuery, [amount[key], idprod[key]]);
  }

  // Mensaje Final y Redireccionamiento
  req.flash("success", "Factura Agregada Correctamente");
  res.redirect("/facturacion/facturaregistro");
});

// Lista general de ventas
router.get("/ventas/transacciones", async (req, res) => {
  const ventasQuery = `SELECT factura.ID_FACTURA, factura.FECHA, persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA,  modo_pago.DESC_MODOPAGO
                      FROM factura
                      INNER JOIN modo_pago ON modo_pago.ID_MODOPAGO = factura.ID_MODOPAGO
                      INNER JOIN persona ON persona.ID_PERSONA = factura.ID_PERSONA`;
  const ventas = await pool.query(ventasQuery);
  res.render("facturacion/factura/list", { ventas });
});


// -> /facturacion/metodopago

router.get("/metodopago/add", async (req, res) => {
  const metodopago = await pool.query("SELECT * FROM modo_pago");
  req.flash("success", "Modo Pago agregado Correctamente");
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
  req.flash("success", "Modo Pago Actualizado Correctamente");
  res.redirect("/facturacion/metodopago/add");
});

// Eliminar

router.get("/metodopago/delete/:id_modopago", async (req, res) => {
  const { id_modopago } = req.params;
  await pool.query("DELETE FROM modo_pago WHERE id_modopago = ?", [
    id_modopago,
  ]);
  req.flash("success", "Modo Pago Eliminado Correctamente");
  res.redirect("/facturacion/metodopago/add");
});

// -> /facturacion/compra

router.get("/compra", async (req, res) => {
  const proveedores = await pool.query("SELECT * FROM proveedores");
  const productos = await pool.query("SELECT * FROM productos");
  res.render("facturacion/compra/compra", { proveedores, productos });
});

router.get("/compra/transacciones", async (req, res) => {
  const comprasQuery = `SELECT compra_producto.*, proveedores.NOMBRE_PROVEEDOR 
                        FROM db_go.compra_producto
                        INNER JOIN proveedores On compra_producto.ID_PROVEEDOR = proveedores.ID_PROVEEDOR`;
  const compras = await pool.query(comprasQuery);
  res.render("facturacion/compra/list", { compras });
});

// Compra de Productos a Proveedores
router.post("/compra", async (req, res) => {
  // dos INSERTS (Compra_Producto y Compra_Producto_Detalle)

  const { id_proveedor, id_productos, cantidad, precio_compra } = req.body;

  let idprod = Object.values(id_productos);
  let amount = Object.values(cantidad);
  let price = Object.values(precio_compra);
  
  // Nueva Compra
  const newCompra = {
    id_proveedor,
  };

  // Insertar en tabla COMPRA PRODUCTO
  await pool.query("INSERT INTO compra_producto set ?", [newCompra]);

  const idCompraQuery = `SELECT ID_COMPRA FROM compra_producto
                        ORDER BY ID_COMPRA DESC
                        LIMIT 1`;

  // Almacenar el valor del ID de la ultima Compra
  const idCompra = await pool.query(idCompraQuery);

  // Insertar en tabla COMPRA PRODUCTO DETALLE

  const detalleCompraQuery = `INSERT INTO compra_producto_detalle (ID_COMPRA, ID_PRODUCTOS, CANTIDAD, PRECIO_COMPRA) 
                              VALUES (?, ?, ?, ?)`;

  for (index in idprod) {
    await pool.query(detalleCompraQuery, [
      idCompra[0].ID_COMPRA,
      idprod[index],
      amount[index],
      price[index],
    ]);
  }

  
  // Actualizar StocK

  const updateStockQuery = `UPDATE productos set STOCK = (STOCK + ?) 
                            WHERE ID_PRODUCTOS = ?;`;

  for (key in id_productos) {
    await pool.query(updateStockQuery, [amount[key], idprod[key]]);
  }

  // Mensaje Final y Redireccionamiento
  req.flash("success", "Compra Agregada Correctamente");
  res.redirect("/facturacion/compra");
});

module.exports = router;
