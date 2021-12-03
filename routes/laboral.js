const express = require("express");
const router = express.Router();
const helpers = require('../lib/helpers');
const pool = require("../database");

// LABORAL

// -> /laboral/categorias

router.get("/categorias/add", async (req, res) => {
  const categorias = await pool.query("SELECT * FROM categoria_laboral");
  res.render("laboral/categorias/add", { categorias });
});

router.post("/categorias/add", async (req, res) => {
  const { descripcion_categoria, salario } = req.body;
  const newCategoriaLaboral = {
    descripcion_categoria,
    salario,
  };
  await pool.query("INSERT INTO categoria_laboral set ?", [
    newCategoriaLaboral,
  ]);
  req.flash('success', 'Categoria guardada correctamente');
  res.redirect("/laboral/categorias/add");
});

// Editar
router.get("/categorias/edit/:id_categoria", async (req, res) => {
  const { id_categoria } = req.params;
  const categoria_laboral = await pool.query(
    "SELECT * FROM categoria_laboral WHERE id_categoria = ?",
    [id_categoria]
  );
  //req.flash('success', 'Link edited succesfully');
  res.render("laboral/categorias/edit", {
    categoria_laboral: categoria_laboral[0],
  });
});

router.post("/categorias/edit/:id_categoria", async (req, res) => {
  const { id_categoria } = req.params;
  const { descripcion_categoria, salario } = req.body;
  const newCategoriaLaboral = {
    descripcion_categoria,
    salario,
  };
  await pool.query("UPDATE categoria_laboral set ? WHERE id_categoria = ?", [
    newCategoriaLaboral,
    id_categoria,
  ]);
  req.flash('success', 'Categoria Actualizada Correctamente');
  res.redirect("/laboral/categorias/add");
});

// Eliminar

router.get("/categorias/delete/:id_categoria", async (req, res) => {
  const { id_categoria } = req.params;
  await pool.query("DELETE FROM categoria_laboral WHERE id_categoria = ?", [
    id_categoria,
  ]);
  req.flash('success', 'Categoria Eliminada Correctamente');
  res.redirect("/laboral/categorias/add");
});

// USUARIOS

// -> /users/usuarios
router.get("/users", async (req, res) => {
  const usuario = await pool.query("SELECT usuario.USERNAME, rol_users.DESC_ROL FROM usuario INNER JOIN rol_users ON rol_users.ID_ROL = usuario.ID_ROL")
  res.render("laboral/users/add", { usuario });
});

router.post("/users/add", async (req, res) => {
  const { id_empleado, username, password, id_rol } = req.body;
  const newUser = {
    id_empleado,
    username,
    password,
    id_rol
  };

  // Cifrar Contraseña
  newUser.password = await helpers.encryptPassword(password);

  await pool.query("INSERT INTO usuario set ?", [
    newUser,
  ]);
  req.flash('success', 'Usuario guardado correctamente');
  res.redirect("/laboral/users");
});

// Editar
router.get("/users/edit/:username", async (req, res) => {
  const { username } = req.params;
  const users = await pool.query(
    "SELECT * FROM usuario WHERE username = ?",
    [username]
  );
  res.render("laboral/users/edit", {
    users: users[0],
  });
});

router.post("/users/edit/:username", async (req, res) => {
  const { username } = req.params;
  const { password } = req.body;
  const newUser = {
    password,
  };

  newUser.password = await helpers.encryptPassword(password);

  await pool.query("UPDATE usuario set ? WHERE username = ?", [
    newUser,
    username,
  ]);

  req.flash('success', 'Contraseña Actualizada Correctamente');
  res.redirect("/laboral/users/add");
});

// Eliminar
router.get("/users/delete/:username", async (req, res) => {
  const { username } = req.params;
  await pool.query("DELETE FROM usuario WHERE username = ?", [
    username,
  ]);
  req.flash('success', 'Usuario Eliminado Correctamente');
  res.redirect("/laboral/users/add");
});

module.exports = router;
