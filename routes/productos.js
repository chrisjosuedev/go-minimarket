const express = require("express");
const router = express.Router();
const pool = require("../database");

// PRODUCTOS

// -> /productos

router.get("/add", async (req, res) => {
  const productosQuery = `SELECT productos.*, marca.NOMBRE_MARCA, tipos_producto.NOMBRE_TIPOPRODUCTO 
                          FROM PRODUCTOS 
                          INNER JOIN marca ON marca.ID_MARCA = productos.ID_MARCA 
                          INNER JOIN tipos_producto ON tipos_producto.ID_TIPOPRODUCTO = productos.ID_TIPOPRODUCTO`;

  const productos = await pool.query(productosQuery);
  const tipos_producto = await pool.query("SELECT * FROM tipos_producto");
  const marca = await pool.query("SELECT * FROM marca");

  res.render("productos/items/add", { productos, tipos_producto, marca });
});

router.post("/add", async (req, res) => {
  const { nombre_productos, precio_unit, id_marca, id_tipoproducto } = req.body;
  const newProducto = {
    nombre_productos,
    precio_unit,
    id_marca,
    id_tipoproducto,
  };
  await pool.query("INSERT INTO productos set ?", [newProducto]);
  req.flash("success", "Producto Agregado Correctamente");
  res.redirect("/productos/add");
});

// Editar Productos
router.get("/edit/:id_productos", async (req, res) => {
  const { id_productos } = req.params;
  const tipos_producto = await pool.query("SELECT * FROM tipos_producto");
  const marca = await pool.query("SELECT * FROM marca");
  const productos = await pool.query(
    "SELECT * FROM productos WHERE id_productos = ?",
    [id_productos]
  );
  //req.flash('success', 'Link edited succesfully');
  res.render("productos/items/edit", {
    productos: productos[0],
    tipos_producto,
    marca,
  });
});

router.post("/edit/:id_productos", async (req, res) => {
  const { id_productos } = req.params;
  const { nombre_productos, precio_unit, id_marca, id_tipoproducto } = req.body;
  const newProducto = {
    nombre_productos,
    precio_unit,
    id_marca,
    id_tipoproducto,
  };
  await pool.query("UPDATE productos set ? WHERE id_productos = ?", [
    newProducto,
    id_productos,
  ]);
  req.flash("success", "Producto Actualizado Correctamente");
  res.redirect("/productos/add");
});

// Eliminar Producto
router.get("/delete/:id_productos", async (req, res) => {
  const { id_productos } = req.params;
  await pool.query("DELETE FROM productos WHERE id_productos = ?", [
    id_productos,
  ]);
  req.flash("success", "Producto Eliminado Correctamente");
  res.redirect("/productos/add");
});

// PROVEEDORES

// -> /productos/proveedor

router.get("/proveedores/add", async (req, res) => {
  const proveedores = await pool.query("SELECT * FROM proveedores");
  res.render("productos/proveedores/add", { proveedores });
});

router.post("/proveedores/add", async (req, res) => {
  const { id_proveedor, nombre_proveedor, email_proveedor, cel_proveedor } =
    req.body;
  const newProveedor = {
    id_proveedor,
    nombre_proveedor,
    email_proveedor,
    cel_proveedor,
  };
  await pool.query("INSERT INTO proveedores set ?", [newProveedor]);
  req.flash("success", "Proveedor Agregado Correctamente");
  res.redirect("/productos/proveedores/add");
});

// Editar
router.get("/proveedores/edit/:id_proveedor", async (req, res) => {
  const { id_proveedor } = req.params;
  const proveedores = await pool.query(
    "SELECT * FROM proveedores WHERE id_proveedor = ?",
    [id_proveedor]
  );
  res.render("productos/proveedores/edit", { proveedores: proveedores[0] });
});

router.post("/proveedores/edit/:id_proveedor", async (req, res) => {
  const { id_proveedor } = req.params;
  const { nombre_proveedor, email_proveedor, cel_proveedor } = req.body;
  const newProveedor = {
    nombre_proveedor,
    email_proveedor,
    cel_proveedor,
  };
  await pool.query("UPDATE proveedores set ? WHERE id_proveedor = ?", [
    newProveedor,
    id_proveedor,
  ]);
  req.flash("success", "Proveedor Editado Correctamente");
  res.redirect("/productos/proveedores/add");
});

// Eliminar

router.get("/proveedores/delete/:id_proveedor", async (req, res) => {
  const { id_proveedor } = req.params;
  await pool.query("DELETE FROM proveedores WHERE id_proveedor = ?", [
    id_proveedor,
  ]);
  req.flash("success", "Proveedor Eliminado Correctamente");
  res.redirect("/productos/proveedores/add");
});

// TIPO PRODUCTOS

// -> /productos/tipo

router.get("/tipo/add", async (req, res) => {
  const tipos_producto = await pool.query("SELECT * FROM tipos_producto");
  res.render("productos/tipo/add", { tipos_producto });
});

router.post("/tipo/add", async (req, res) => {
  const { nombre_tipoproducto } = req.body;
  const newTipoProducto = {
    nombre_tipoproducto,
  };
  await pool.query("INSERT INTO tipos_producto set ?", [newTipoProducto]);
  req.flash("success", "Tipo Producto Agregado Correctamente");
  res.redirect("/productos/tipo/add");
});

// Editar
router.get("/tipo/edit/:id_tipoproducto", async (req, res) => {
  const { id_tipoproducto } = req.params;
  const tiposproductos = await pool.query(
    "SELECT * FROM tipos_producto WHERE id_tipoproducto = ?",
    [id_tipoproducto]
  );
  res.render("productos/tipo/edit", { tiposproductos: tiposproductos[0] });
});

router.post("/tipo/edit/:id_tipoproducto", async (req, res) => {
  const { id_tipoproducto } = req.params;
  const { nombre_tipoproducto } = req.body;
  const newTipoProducto = {
    nombre_tipoproducto,
  };
  await pool.query("UPDATE tipos_producto set ? WHERE id_tipoproducto = ?", [
    newTipoProducto,
    id_tipoproducto,
  ]);
  req.flash("success", "Tipo Producto Editado Correctamente");
  res.redirect("/productos/tipo/add");
});

// Eliminar

router.get("/tipo/delete/:id_tipoproducto", async (req, res) => {
  const { id_tipoproducto } = req.params;
  await pool.query("DELETE FROM tipos_producto WHERE id_tipoproducto = ?", [
    id_tipoproducto,
  ]);
  req.flash("success", "Tipo Producto Eliminado Correctamente");
  res.redirect("/productos/tipo/add");
});

// MARCA

// -> /productos/marca

router.get("/marca/add", async (req, res) => {
  const marca = await pool.query("SELECT * FROM marca");
  res.render("productos/marca/add", { marca });
});

router.post("/marca/add", async (req, res) => {
  const { nombre_marca } = req.body;
  const newTipoMarca = {
    nombre_marca,
  };
  await pool.query("INSERT INTO marca set ?", [newTipoMarca]);
  req.flash("success", "Marca Agregada Correctamente");
  res.redirect("/productos/marca/add");
});

// Editar
router.get("/marca/edit/:id_marca", async (req, res) => {
  const { id_marca } = req.params;
  const marca = await pool.query("SELECT * FROM marca WHERE id_marca = ?", [
    id_marca,
  ]);
  res.render("productos/marca/edit", { marca: marca[0] });
});

router.post("/marca/edit/:id_marca", async (req, res) => {
  const { id_marca } = req.params;
  const { nombre_marca } = req.body;
  const newTipoMarca = {
    nombre_marca,
  };
  await pool.query("UPDATE marca set ? WHERE id_marca = ?", [
    newTipoMarca,
    id_marca,
  ]);
  req.flash("success", "Marca Actualizada Correctamente");
  res.redirect("/productos/marca/add");
});

// Eliminar

router.get("/marca/delete/:id_marca", async (req, res) => {
  const { id_marca } = req.params;
  await pool.query("DELETE FROM marca WHERE id_marca = ?", [id_marca]);
  req.flash("success", "Marca Eliminada Correctamente");
  res.redirect("/productos/marca/add");
});

module.exports = router;
