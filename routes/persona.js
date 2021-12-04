const express = require("express");
const router = express.Router();
const pool = require("../database");
const { isLoggedIn } = require("../lib/auth");
// Generacion de PDF

const PDF = require("pdfkit-construct");

// Generacion Informe Simple PDF
router.get("/informe-general-empleados", async (req, res) => {
  // Generacion PDF
  const doc = new PDF({ bufferPages: true });

  const filename = `Empleados-Listado-General.pdf`;

  const stream = res.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-disposition": `attachment;filename=${filename}`,
  });

  doc.on("data", (data) => {
    stream.write(data);
  });
  doc.on("data", () => {
    stream.end();
  });

  // Header
  doc.setDocumentHeader(
    {
      height: "12",
    },
    () => {
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("LISTADO GENERAL DE EMPLEADOS", { align: "center" });

      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .text(
          "Go! Store",
          {
            align: "left",
          },
          doc.header.y + 8
        );
    }
  );

  // Query de Empleados
  const empleadosQuery = `SELECT persona.ID_PERSONA, 
                          concat_ws(' ', persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA) as NOMBRE, 
                          (if(persona.SEXO = 1, 'F', 'M')) as SEXO, 
                          persona.CELULAR, 
                          upper(concat_ws(', ', ciudad.NOMBRE_CIUDAD, departamentos.NOMBRE_DEPTO)) as RESIDENCIA, 
                          empleado.ID_EMPLEADO, 
                          categoria_laboral.DESCRIPCION_CATEGORIA, categoria_laboral.SALARIO, 
                          concat_ws('/', day(empleado.FECHA_CONTRATACION), month(empleado.FECHA_CONTRATACION), year(empleado.FECHA_CONTRATACION)) as CONTRATO
                          FROM persona 
                          INNER JOIN empleado on persona.ID_PERSONA = empleado.ID_PERSONA
                          INNER JOIN categoria_laboral on empleado.ID_CATEGORIA = categoria_laboral.ID_CATEGORIA
                          INNER JOIN ciudad on persona.ID_CIUDAD = ciudad.ID_CIUDAD and ciudad.ID_DEPTO = persona.ID_DEPTO
                          INNER JOIN departamentos on persona.ID_DEPTO = departamentos.ID_DEPTO`;

  const empleados = await pool.query(empleadosQuery);

  const employee = empleados.map((emp) => {
    const item = {
      id: emp.ID_PERSONA,
      name: emp.NOMBRE,
      sexo: emp.SEXO,
      contratacion: emp.CONTRATO,
      puesto: emp.DESCRIPCION_CATEGORIA,
      salario: emp.SALARIO,
      residencia: emp.RESIDENCIA,
    };

    return item;
  });

  doc.addTable(
    [
      { key: "id", label: "ID", align: "left" },
      { key: "name", label: "Nombre", align: "center" },
      { key: "sexo", label: "Sexo", align: "center" },
      { key: "puesto", label: "Puesto", align: "center" },
      { key: "contratacion", label: "Contratado", align: "center" },
      { key: "salario", label: "Salario L.", align: "left" },
      { key: "residencia", label: "Residencia", align: "center" },
    ],
    employee,
    {
      border: null,
      width: "fill_body",
      striped: true,
      headBackground: "#23282A",
      headColor: "#FFFFFF",
      headFont: "Helvetica-Bold",
      headFontSize: 9,
      stripedColors: ["#FFFFFF", "#B2CBD3"],
      cellsFont: "Helvetica",
      cellsFontSize: 9,
      headAlign: "center",
    }
  );

  // render tables
  doc.render();
  doc.end();
});

// PERSONA

// -> /persona/empleados

router.get("/empleados/add", isLoggedIn, async (req, res) => {
  const empleadosQuery = `SELECT persona.ID_PERSONA, persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA, (if(persona.SEXO = 1, 'F', 'M')) as SEXO, persona.CELULAR, ciudad.NOMBRE_CIUDAD, departamentos.NOMBRE_DEPTO, empleado.ID_EMPLEADO, categoria_laboral.DESCRIPCION_CATEGORIA, categoria_laboral.SALARIO, empleado.FECHA_CONTRATACION 
                          FROM persona 
                          INNER JOIN empleado on persona.ID_PERSONA = empleado.ID_PERSONA
                          INNER JOIN categoria_laboral on empleado.ID_CATEGORIA = categoria_laboral.ID_CATEGORIA
                          INNER JOIN ciudad on persona.ID_CIUDAD = ciudad.ID_CIUDAD and ciudad.ID_DEPTO = persona.ID_DEPTO
                          INNER JOIN departamentos on persona.ID_DEPTO = departamentos.ID_DEPTO`;
  const empleados = await pool.query(empleadosQuery);
  const ciudad = await pool.query("SELECT * FROM ciudad");
  const departamentos = await pool.query("SELECT * FROM departamentos");
  const categorialaboral = await pool.query("SELECT * FROM categoria_laboral");
  res.render("personas/empleados/add", {
    categorialaboral,
    departamentos,
    ciudad,
    empleados,
  });
});

// Listar Empleados

router.post("/empleados/add", async (req, res) => {
  // Add person/Empleado
  const {
    id_persona,
    nombre_persona,
    apellido_persona,
    sexo,
    celular,
    fecha_contratacion,
    id_categoria,
    direccion_residencia,
    id_ciudad,
    id_depto,
  } = req.body;
  const newPersona = {
    id_persona,
    nombre_persona,
    apellido_persona,
    sexo,
    celular,
    direccion_residencia,
    id_ciudad,
    id_depto,
  };
  // Empleado
  //const year = fecha_contratacion.getMonth()
  const newEmpleado = {
    id_persona,
    id_categoria,
    fecha_contratacion,
  };
  await pool.query("INSERT INTO persona set ?", [newPersona]);
  await pool.query("INSERT INTO empleado set ?", [newEmpleado]);
  req.flash("success", "Empleado Agregado Correctamente");
  res.redirect("/persona/empleados/add");
});

// Editar
router.get("/empleados/edit/:id_persona", async (req, res) => {
  const { id_persona } = req.params;
  const ciudad = await pool.query("SELECT * FROM ciudad");
  const departamentos = await pool.query("SELECT * FROM departamentos");
  const categorialaboral = await pool.query("SELECT * FROM categoria_laboral");
  const persona = await pool.query(
    "SELECT persona.*, empleado.ID_CATEGORIA as PUESTO FROM persona INNER JOIN empleado ON empleado.ID_PERSONA = persona.ID_PERSONA HAVING id_persona = ?",
    [id_persona]
  );

  res.render("personas/empleados/edit", {
    persona: persona[0],
    ciudad,
    departamentos,
    categorialaboral,
  });
});

router.post("/empleados/edit/:id_persona", async (req, res) => {
  const { id_persona } = req.params;
  const {
    nombre_persona,
    apellido_persona,
    sexo,
    celular,
    direccion_residencia,
    id_ciudad,
    id_depto,
    id_categoria,
  } = req.body;
  const newPersona = {
    nombre_persona,
    apellido_persona,
    sexo,
    celular,
    direccion_residencia,
    id_ciudad,
    id_depto,
  };
  const newEmpleado = {
    id_categoria,
  };
  await pool.query("UPDATE persona set ? WHERE id_persona = ?", [
    newPersona,
    id_persona,
  ]);
  await pool.query("UPDATE empleado set ? WHERE id_persona = ?", [
    newEmpleado,
    id_persona,
  ]);
  req.flash("success", "Empleado Actualizado Correctamente");
  res.redirect("/persona/empleados/add");
});

// Eliminar

router.get("/empleados/delete/:id_persona", async (req, res) => {
  const { id_persona } = req.params;
  await pool.query("DELETE FROM empleado WHERE id_persona = ?", [id_persona]);
  await pool.query("DELETE FROM persona WHERE id_persona = ?", [id_persona]);
  req.flash("success", "Empleado Eliminado Correctamente");
  res.redirect("/persona/empleados/add");
});

// -> /persona/clientes

router.get("/clientes/add", isLoggedIn, async (req, res) => {
  const clienteQuery = `SELECT persona.ID_PERSONA, persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA, (if(persona.SEXO = 1, 'F', 'M')) as SEXO, persona.CELULAR, persona.DIRECCION_RESIDENCIA, ciudad.NOMBRE_CIUDAD, departamentos.NOMBRE_DEPTO
                        FROM persona
                        left join empleado on persona.ID_PERSONA = empleado.ID_PERSONA 
                        INNER JOIN ciudad on persona.ID_CIUDAD = ciudad.ID_CIUDAD and ciudad.ID_DEPTO = persona.ID_DEPTO
                        INNER JOIN departamentos on persona.ID_DEPTO = departamentos.ID_DEPTO
                        WHERE (persona.ID_PERSONA NOT IN (SELECT empleado.ID_PERSONA FROM empleado));`;
  const cliente = await pool.query(clienteQuery);
  const ciudad = await pool.query("SELECT * FROM ciudad");
  const departamentos = await pool.query("SELECT * FROM departamentos");
  res.render("personas/clientes/add", { departamentos, ciudad, cliente });
});

// Consulta General
router.get("/consultas", isLoggedIn, async (req, res) => {
  const personaQuery = `SELECT persona.ID_PERSONA, persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA, (if(persona.SEXO = 1, 'F', 'M')) as SEXO, 
                        persona.CELULAR, persona.DIRECCION_RESIDENCIA, ciudad.NOMBRE_CIUDAD, departamentos.NOMBRE_DEPTO, 
                          CASE WHEN empleado.ID_PERSONA is null then 'Cliente' else 'Empleado' end as TIPO
                        from persona
                        left join empleado on persona.ID_PERSONA = empleado.ID_PERSONA
                        INNER JOIN ciudad on persona.ID_CIUDAD = ciudad.ID_CIUDAD and ciudad.ID_DEPTO = persona.ID_DEPTO
                        INNER JOIN departamentos on persona.ID_DEPTO = departamentos.ID_DEPTO;`;
  const persona = await pool.query(personaQuery);
  res.render("personas/list", { persona });
});

// JSON General
router.get("/consultas/general", async (req, res) => {
  const personaQuery = `SELECT persona.ID_PERSONA, concat_ws(' ', persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA) as Nombre, (if(persona.SEXO = 1, 'F', 'M')) as SEXO, 
                        persona.CELULAR, persona.DIRECCION_RESIDENCIA, ciudad.NOMBRE_CIUDAD, departamentos.NOMBRE_DEPTO, 
                        CASE WHEN empleado.ID_PERSONA is null then 'Cliente' else 'Empleado' end as TIPO
                        from persona
                        left join empleado on persona.ID_PERSONA = empleado.ID_PERSONA
                        INNER JOIN ciudad on persona.ID_CIUDAD = ciudad.ID_CIUDAD and ciudad.ID_DEPTO = persona.ID_DEPTO
                        INNER JOIN departamentos on persona.ID_DEPTO = departamentos.ID_DEPTO;`;
  const persona = await pool.query(personaQuery);
  const jsonPersona = Object.values(JSON.parse(JSON.stringify(persona)));
  res.json(jsonPersona);
});

// JSON Clientes
router.get("/consultas/clientes", async (req, res) => {
  const clienteQuery = `select persona.ID_PERSONA, persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA, (if(persona.SEXO = 1, 'F', 'M')) as SEXO, 
                        	persona.CELULAR, persona.DIRECCION_RESIDENCIA, ciudad.NOMBRE_CIUDAD, departamentos.NOMBRE_DEPTO, 
                            case when empleado.ID_PERSONA is null then true else false end as TIPO
                        from persona
                        left join empleado on persona.ID_PERSONA = empleado.ID_PERSONA
                        INNER JOIN ciudad on persona.ID_CIUDAD = ciudad.ID_CIUDAD and ciudad.ID_DEPTO = persona.ID_DEPTO
                        INNER JOIN departamentos on persona.ID_DEPTO = departamentos.ID_DEPTO
                        HAVING TIPO = true;`;
  const cliente = await pool.query(clienteQuery);
  const jsonClientes = Object.values(JSON.parse(JSON.stringify(cliente)));
  res.json(jsonClientes);
});

// JSON Solo Clientes
router.get("/consultas/clienteslist", async (req, res) => {
  const clienteQuery = `SELECT persona.ID_PERSONA, concat_ws(' ', persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA) as Nombre, (if(persona.SEXO = 1, 'F', 'M')) as SEXO, 
                         persona.CELULAR, persona.DIRECCION_RESIDENCIA, ciudad.NOMBRE_CIUDAD, departamentos.NOMBRE_DEPTO 
                        FROM persona
                        left join empleado on persona.ID_PERSONA = empleado.ID_PERSONA
                        INNER JOIN ciudad on persona.ID_CIUDAD = ciudad.ID_CIUDAD and ciudad.ID_DEPTO = persona.ID_DEPTO
                        INNER JOIN departamentos on persona.ID_DEPTO = departamentos.ID_DEPTO
                        WHERE (persona.ID_PERSONA NOT IN (SELECT empleado.ID_PERSONA FROM empleado));`;
  const cliente = await pool.query(clienteQuery);
  const jsonClientes = Object.values(JSON.parse(JSON.stringify(cliente)));
  res.json(jsonClientes);
});

// JSON Solo Empleados
router.get("/consultas/empleadoslist", async (req, res) => {
  const empQuery = `SELECT persona.ID_PERSONA, empleado.ID_EMPLEADO, concat_ws(' ', persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA) as Nombre, (if(persona.SEXO = 1, 'F', 'M')) as SEXO, 
                      categoria_laboral.DESCRIPCION_CATEGORIA, persona.CELULAR, persona.DIRECCION_RESIDENCIA, ciudad.NOMBRE_CIUDAD, departamentos.NOMBRE_DEPTO 
                     FROM persona
                     left join empleado on persona.ID_PERSONA = empleado.ID_PERSONA
                     INNER JOIN ciudad on persona.ID_CIUDAD = ciudad.ID_CIUDAD and ciudad.ID_DEPTO = persona.ID_DEPTO
                     INNER JOIN categoria_laboral on empleado.ID_CATEGORIA = categoria_laboral.ID_CATEGORIA
                     INNER JOIN departamentos on persona.ID_DEPTO = departamentos.ID_DEPTO
                     WHERE (persona.ID_PERSONA IN (SELECT empleado.ID_PERSONA FROM empleado));`;
  const emp = await pool.query(empQuery);
  const jsonEmp = Object.values(JSON.parse(JSON.stringify(emp)));
  res.json(jsonEmp);
});

// No Empleado Seguridad
router.get("/consultas/empleados/:id", async (req, res) => {
  const { id } = req.params;
  const queryEmp = `SELECT empleado.*, 
                    concat_ws(' ', persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA) as NOMBRE_EMPLEADO
                    FROM empleado
                    INNER JOIN persona ON persona.ID_PERSONA = empleado.ID_PERSONA
                    WHERE empleado.ID_PERSONA = ?`;
  const emp = await pool.query(queryEmp, [id]);
  const jsonEmp = Object.values(JSON.parse(JSON.stringify(emp)));
  res.json(jsonEmp);
});

// JSON persona String
router.get("/consultas/:name", async (req, res) => {
  const { name } = req.params;
  const like = " LIKE '%";
  const personaQuery =
    `SELECT persona.ID_PERSONA, concat_ws(' ', persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA) as Nombre, (if(persona.SEXO = 1, 'F', 'M')) as SEXO, 
                        	persona.CELULAR, upper(concat_ws(', ', persona.DIRECCION_RESIDENCIA, ciudad.NOMBRE_CIUDAD, departamentos.NOMBRE_DEPTO)) as Residencia, 
                            case when empleado.ID_PERSONA is null then 'CLIENTE' else 'EMPLEADO' end as TIPO
                        from persona
                        left join empleado on persona.ID_PERSONA = empleado.ID_PERSONA
                        INNER JOIN ciudad on persona.ID_CIUDAD = ciudad.ID_CIUDAD and ciudad.ID_DEPTO = persona.ID_DEPTO
                        INNER JOIN departamentos on persona.ID_DEPTO = departamentos.ID_DEPTO
                        WHERE persona.NOMBRE_PERSONA` +
    like +
    name +
    "%'";
  const persona = await pool.query(personaQuery);
  const jsonPersona = Object.values(JSON.parse(JSON.stringify(persona)));
  res.json(jsonPersona);
});

// JSON Empleados Listado General
router.get("/empleados", async (req, res) => {
  const empleadosQuery = `SELECT persona.ID_PERSONA, persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA, (if(persona.SEXO = 1, 'F', 'M')) as SEXO, persona.CELULAR, ciudad.NOMBRE_CIUDAD, departamentos.NOMBRE_DEPTO, empleado.ID_EMPLEADO, categoria_laboral.DESCRIPCION_CATEGORIA, empleado.FECHA_CONTRATACION 
                          FROM persona 
                          INNER JOIN empleado on persona.ID_PERSONA = empleado.ID_PERSONA
                          INNER JOIN categoria_laboral on empleado.ID_CATEGORIA = categoria_laboral.ID_CATEGORIA
                          INNER JOIN ciudad on persona.ID_CIUDAD = ciudad.ID_CIUDAD and ciudad.ID_DEPTO = persona.ID_DEPTO
                          INNER JOIN departamentos on persona.ID_DEPTO = departamentos.ID_DEPTO`;
  const empleados = await pool.query(empleadosQuery);
  const jsonEmpelados = Object.values(JSON.parse(JSON.stringify(empleados)));
  res.json(jsonEmpelados);
});

router.post("/clientes/add", async (req, res) => {
  // Add person
  const {
    id_persona,
    nombre_persona,
    apellido_persona,
    sexo,
    celular,
    direccion_residencia,
    id_ciudad,
    id_depto,
  } = req.body;
  const newPersona = {
    id_persona,
    nombre_persona,
    apellido_persona,
    sexo,
    celular,
    direccion_residencia,
    id_ciudad,
    id_depto,
  };
  await pool.query("INSERT INTO persona set ?", [newPersona]);
  req.flash("success", "Cliente Agregado Correctamente");
  res.redirect("/persona/clientes/add");
});

// Editar
router.get("/clientes/edit/:id_persona", async (req, res) => {
  const { id_persona } = req.params;
  const ciudad = await pool.query("SELECT * FROM ciudad");
  const departamentos = await pool.query("SELECT * FROM departamentos");

  const persona = await pool.query(
    "SELECT * FROM persona WHERE id_persona = ?",
    [id_persona]
  );
  //req.flash('success', 'Link edited succesfully');
  res.render("personas/clientes/edit", {
    persona: persona[0],
    ciudad,
    departamentos,
  });
});

router.post("/clientes/edit/:id_persona", async (req, res) => {
  const { id_persona } = req.params;
  const {
    nombre_persona,
    apellido_persona,
    sexo,
    celular,
    direccion_residencia,
    id_ciudad,
    id_depto,
  } = req.body;
  const newPersona = {
    nombre_persona,
    apellido_persona,
    sexo,
    celular,
    direccion_residencia,
    id_ciudad,
    id_depto,
  };
  await pool.query("UPDATE persona set ? WHERE id_persona = ?", [
    newPersona,
    id_persona,
  ]);
  req.flash("success", "Cliente Actualizado Correctamente");
  res.redirect("/persona/clientes/add");
});

// Eliminar

router.get("/clientes/delete/:id_persona", async (req, res) => {
  const { id_persona } = req.params;
  await pool.query("DELETE FROM persona WHERE id_persona = ?", [id_persona]);
  req.flash("success", "Cliente Eliminado Correctamente");
  res.redirect("/persona/clientes/add");
});

module.exports = router;
