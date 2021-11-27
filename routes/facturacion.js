const express = require("express");
const router = express.Router();
const pool = require("../database");

const PDF = require("pdfkit-construct");

// FACTURACION
// Imprimir Factura Listada
// Generacion Informe Simple PDF
router.get("/factura/:id", async (req, res) => {
  // Querys
  const { id } = req.params;

  const queryDetails = `SELECT factura_detalle.ID_FACTURA, factura_detalle.ID_PRODUCTOS, productos.NOMBRE_PRODUCTOS, tipos_producto.NOMBRE_TIPOPRODUCTO, marca.NOMBRE_MARCA,
                        factura_detalle.CANTIDAD, factura_detalle.PRECIO_UNIT,
                        round(sum(factura_detalle.CANTIDAD * factura_detalle.PRECIO_UNIT), 2) as SUBTOTAL
                        FROM factura_detalle
                        INNER JOIN productos ON productos.ID_PRODUCTOS = factura_detalle.ID_PRODUCTOS
                        INNER JOIN tipos_producto ON productos.ID_TIPOPRODUCTO = tipos_producto.ID_TIPOPRODUCTO
                        INNER JOIN marca ON productos.ID_MARCA = marca.ID_MARCA
                        WHERE ID_FACTURA = ?
                        GROUP BY factura_detalle.ID_PRODUCTOS`;
  const facturaDetails = await pool.query(queryDetails, [id]);

  const querySubISV = `SELECT @subtotal:=round(sum(factura_detalle.CANTIDAD * factura_detalle.PRECIO_UNIT), 2), 
                      @isv:=round(sum(factura_detalle.CANTIDAD * factura_detalle.PRECIO_UNIT) * 0.15, 3)
                      FROM factura_detalle WHERE ID_FACTURA = ?;`;
  const queryTotal = `SELECT factura_detalle.ID_FACTURA, @subtotal as SUBTOTAL, @isv as ISV, round((@subtotal + @isv), 2) as Total
                      FROM factura_detalle WHERE ID_FACTURA = ? GROUP BY factura_detalle.ID_FACTURA;`;

  await pool.query(querySubISV, [id]);

  const facturaTotal = await pool.query(queryTotal, [id]);

  // General Factura
  const queryGeneral = `SELECT FECHA, (SELECT concat_ws(' ', persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA) FROM persona, factura
                          WHERE persona.ID_PERSONA = factura.ID_PERSONA AND ID_FACTURA = ?) as Cliente, 
                        (SELECT concat_ws(' ', persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA) FROM persona, empleado, factura
                          WHERE persona.ID_PERSONA = empleado.ID_PERSONA AND empleado.ID_EMPLEADO = factura.ID_EMPLEADO AND ID_FACTURA = ?) as Empleado,
                           modo_pago.DESC_MODOPAGO
                        FROM factura
                        INNER JOIN modo_pago ON modo_pago.ID_MODOPAGO = factura.ID_MODOPAGO
                        Where ID_FACTURA = ?;`;

  const facturaGeneral = await pool.query(queryGeneral, [id, id, id]);

  // Format de Fecha
  var now = new Date(facturaGeneral[0].FECHA);
  var day = now.getDate();
  var month = now.getMonth() + 1;
  var year = now.getFullYear();
  var time = now.toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  });
  var fecha = day + "/" + month + "/" + year + " " + time;

  // Generacion PDF
  const doc = new PDF({ bufferPages: true });

  const filename = `Factura-Descripcion-#${id}.pdf`;

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
      height: "20",
    },
    () => {
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .text(`FACTURA #${facturaDetails[0].ID_FACTURA}`, {
          align: "center",
          paragraphGap: 6,
        });

      doc.fontSize(11);
      doc.font("Helvetica");

      doc.text(`Cliente: ${facturaGeneral[0].Cliente}`, { align: "left" });

      doc.text(`Atendió: ${facturaGeneral[0].Empleado}`, { align: "left" });

      doc.text(`Fecha: ${fecha}`, { align: "left" });

      doc.text(`Pagó con: ${facturaGeneral[0].DESC_MODOPAGO}`, {
        align: "left",
      });

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(
          "Go! Store",
          {
            align: "left",
          },
          doc.header.y + 8
        );
    }
  );

  const invoice = facturaDetails.map((fact) => {
    const item = {
      id: fact.ID_PRODUCTOS,
      description: fact.NOMBRE_PRODUCTOS,
      type: fact.NOMBRE_TIPOPRODUCTO,
      brand: fact.NOMBRE_MARCA,
      amount: fact.CANTIDAD,
      unit_price: fact.PRECIO_UNIT,
      subtotal: fact.SUBTOTAL,
    };

    return item;
  });

  doc.addTable(
    [
      { key: "id", label: "ID", align: "left" },
      { key: "description", label: "Descripcion", align: "center" },
      { key: "type", label: "Tipo", align: "center" },
      { key: "brand", label: "Marca", align: "center" },
      { key: "amount", label: "Cantidad", align: "center" },
      { key: "unit_price", label: "Precio Unit L.", align: "center" },
      { key: "subtotal", label: "Subtotal L.", align: "center" },
    ],
    invoice,
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

  // Footer
  doc.setDocumentFooter(
    {
      height: "40",
    },
    () => {
      doc.fontSize(11);
      doc.text(
        `Subtotal: L. ${facturaTotal[0].SUBTOTAL}`,
        { align: "right" },
        doc.footer.y + 10
      );
      doc.text(
        `ISV: L. ${facturaTotal[0].ISV}`,
        { align: "right" },
        doc.footer.y + 25
      );
      doc.text(
        `Total: L. ${facturaTotal[0].Total}`,
        { align: "right" },
        doc.footer.y + 40
      );
    }
  );

  // render tables
  doc.render();
  doc.end();
});

// -> /facturacion/facturaregistro

router.get("/facturaregistro", async (req, res) => {
  const empQuery = `SELECT ID_EMPLEADO, ID_CATEGORIA, persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA 
                    FROM empleado 
                    INNER JOIN persona ON empleado.ID_PERSONA = persona.ID_PERSONA 
                    HAVING ID_CATEGORIA = 1 OR ID_CATEGORIA = 3`;
  const empleados = await pool.query(empQuery);
  //const clientes = await pool.query("SELECT * FROM persona");
  const metodopago = await pool.query("SELECT * FROM modo_pago");
  const productos = await pool.query("SELECT * FROM productos WHERE STOCK > 0");

  

  res.render("facturacion/factura/factura", {
    metodopago,
    empleados,
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

  // Llamar otra ruta
  var id = idVenta[0].ID_FACTURA

  
  const queryDetails = `SELECT factura_detalle.ID_FACTURA, factura_detalle.ID_PRODUCTOS, 
                        productos.NOMBRE_PRODUCTOS,
                        factura_detalle.CANTIDAD, factura_detalle.PRECIO_UNIT,
                        round(sum(factura_detalle.CANTIDAD * factura_detalle.PRECIO_UNIT), 2) as SUBTOTAL
                        FROM factura_detalle
                        INNER JOIN productos ON productos.ID_PRODUCTOS = factura_detalle.ID_PRODUCTOS
                        INNER JOIN tipos_producto ON productos.ID_TIPOPRODUCTO = tipos_producto.ID_TIPOPRODUCTO
                        INNER JOIN marca ON productos.ID_MARCA = marca.ID_MARCA
                        WHERE ID_FACTURA = ?
                        GROUP BY factura_detalle.ID_PRODUCTOS`;
  const facturaDetails = await pool.query(queryDetails, [id]);

  const querySubISV = `SELECT @subtotal:=round(sum(factura_detalle.CANTIDAD * factura_detalle.PRECIO_UNIT), 2), 
                      @isv:=round(sum(factura_detalle.CANTIDAD * factura_detalle.PRECIO_UNIT) * 0.15, 3)
                      FROM factura_detalle WHERE ID_FACTURA = ?;`;
  const queryTotal = `SELECT factura_detalle.ID_FACTURA, @subtotal as SUBTOTAL, @isv as ISV, round((@subtotal + @isv), 2) as Total
                      FROM factura_detalle WHERE ID_FACTURA = ? GROUP BY factura_detalle.ID_FACTURA;`;

  await pool.query(querySubISV, [id]);

  const facturaTotal = await pool.query(queryTotal, [id]);

  // General Factura
  const queryGeneral = `SELECT FECHA, (SELECT concat_ws(' ', persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA) FROM persona, factura
                          WHERE persona.ID_PERSONA = factura.ID_PERSONA AND ID_FACTURA = ?) as Cliente, 
                        (SELECT concat_ws(' ', persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA) FROM persona, empleado, factura
                          WHERE persona.ID_PERSONA = empleado.ID_PERSONA AND empleado.ID_EMPLEADO = factura.ID_EMPLEADO AND ID_FACTURA = ?) as Empleado,
                           modo_pago.DESC_MODOPAGO
                        FROM factura
                        INNER JOIN modo_pago ON modo_pago.ID_MODOPAGO = factura.ID_MODOPAGO
                        Where ID_FACTURA = ?;`;

  const facturaGeneral = await pool.query(queryGeneral, [id, id, id]);

  // Format de Fecha
  var now = new Date(facturaGeneral[0].FECHA);
  var day = now.getDate();
  var month = now.getMonth() + 1;
  var year = now.getFullYear();
  var time = now.toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  });
  var fecha = day + "/" + month + "/" + year + " " + time;

  // Generacion PDF
  const doc = new PDF({ bufferPages: true });

  const filename = `Factura-Descripcion-#${id}.pdf`;

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
      height: "20",
    },
    () => {
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .text(`FACTURA #${facturaDetails[0].ID_FACTURA}`, {
          align: "center",
          paragraphGap: 6,
        });

      doc.fontSize(11);
      doc.font("Helvetica");

      doc.text(`Cliente: ${facturaGeneral[0].Cliente}`, { align: "left" });

      doc.text(`Atendió: ${facturaGeneral[0].Empleado}`, { align: "left" });

      doc.text(`Fecha: ${fecha}`, { align: "left" });

      doc.text(`Pagó con: ${facturaGeneral[0].DESC_MODOPAGO}`, {
        align: "left",
      });

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(
          "Go! Store",
          {
            align: "left",
          },
          doc.header.y + 8
        );
    }
  );

  const invoice = facturaDetails.map((fact) => {
    const item = {
      id: fact.ID_PRODUCTOS,
      description: fact.NOMBRE_PRODUCTOS,
      amount: fact.CANTIDAD,
      unit_price: fact.PRECIO_UNIT,
      subtotal: fact.SUBTOTAL,
    };

    return item;
  });

  doc.addTable(
    [
      { key: "id", label: "ID", align: "left" },
      { key: "description", label: "Descripcion", align: "center" },
      { key: "amount", label: "Cantidad", align: "center" },
      { key: "unit_price", label: "Precio Unit L.", align: "center" },
      { key: "subtotal", label: "Subtotal L.", align: "center" },
    ],
    invoice,
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

  // Footer
  doc.setDocumentFooter(
    {
      height: "40",
    },
    () => {
      doc.fontSize(11);
      doc.text(
        `Subtotal: L. ${facturaTotal[0].SUBTOTAL}`,
        { align: "right" },
        doc.footer.y + 10
      );
      doc.text(
        `ISV: L. ${facturaTotal[0].ISV}`,
        { align: "right" },
        doc.footer.y + 25
      );
      doc.text(
        `Total: L. ${facturaTotal[0].Total}`,
        { align: "right" },
        doc.footer.y + 40
      );
    }
  );

  //req.flash("success", "Modo Pago agregado Correctamente");

  // render tables
  doc.render();
  doc.end();

  // Mensaje Final y Redireccionamiento
  
  //res.redirect("/facturacion/facturaregistro");
});


// Lista general de ventas
router.get("/ventas/transacciones", async (req, res) => {
  const ventasQuery = `SELECT factura.*, persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA, modo_pago.DESC_MODOPAGO
                      FROM factura_detalle
                      INNER JOIN factura ON factura.ID_FACTURA = factura_detalle.ID_FACTURA
                      INNER JOIN persona ON factura.ID_PERSONA = persona.ID_PERSONA
                      INNER JOIN modo_pago ON modo_pago.ID_MODOPAGO = factura.ID_MODOPAGO 
                      GROUP BY factura.ID_FACTURA
                      ORDER BY factura.ID_FACTURA ASC`;
  const ventas = await pool.query(ventasQuery);
  res.render("facturacion/factura/list", { ventas });
});

// Lista Detalle Factura
router.get("/ventas/transacciones/:id", async (req, res) => {
  const { id } = req.params;
  const queryDetails = `SELECT factura_detalle.ID_FACTURA, factura_detalle.ID_PRODUCTOS, productos.NOMBRE_PRODUCTOS, tipos_producto.NOMBRE_TIPOPRODUCTO, marca.NOMBRE_MARCA,
                        factura_detalle.CANTIDAD, factura_detalle.PRECIO_UNIT,
                        round(sum(factura_detalle.CANTIDAD * factura_detalle.PRECIO_UNIT), 2) as SUBTOTAL
                        FROM factura_detalle
                        INNER JOIN productos ON productos.ID_PRODUCTOS = factura_detalle.ID_PRODUCTOS
                        INNER JOIN tipos_producto ON productos.ID_TIPOPRODUCTO = tipos_producto.ID_TIPOPRODUCTO
                        INNER JOIN marca ON productos.ID_MARCA = marca.ID_MARCA
                        WHERE ID_FACTURA = ?
                        GROUP BY factura_detalle.ID_PRODUCTOS`;
  const facturaDetails = await pool.query(queryDetails, [id]);

  const querySubISV = `SELECT @subtotal:=round(sum(factura_detalle.CANTIDAD * factura_detalle.PRECIO_UNIT), 2), 
                      @isv:=round(sum(factura_detalle.CANTIDAD * factura_detalle.PRECIO_UNIT) * 0.15, 3)
                      FROM factura_detalle WHERE ID_FACTURA = ?;`;
  const queryTotal = `SELECT factura_detalle.ID_FACTURA, @subtotal as SUBTOTAL, @isv as ISV, round((@subtotal + @isv), 2) as Total
                      FROM factura_detalle WHERE ID_FACTURA = ? GROUP BY factura_detalle.ID_FACTURA;`;

  await pool.query(querySubISV, [id]);

  const facturaTotal = await pool.query(queryTotal, [id]);

  // General Factura
  const queryGeneral = `SELECT FECHA, (SELECT concat_ws(' ', persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA) FROM persona, factura
                          WHERE persona.ID_PERSONA = factura.ID_PERSONA AND ID_FACTURA = ?) as Cliente, 
                        (SELECT concat_ws(' ', persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA) FROM persona, empleado, factura
                          WHERE persona.ID_PERSONA = empleado.ID_PERSONA AND empleado.ID_EMPLEADO = factura.ID_EMPLEADO AND ID_FACTURA = ?) as Empleado,
                           modo_pago.DESC_MODOPAGO
                        FROM factura
                        INNER JOIN modo_pago ON modo_pago.ID_MODOPAGO = factura.ID_MODOPAGO
                        Where ID_FACTURA = ?;`;

  const facturaGeneral = await pool.query(queryGeneral, [id, id, id]);

  res.render("facturacion/factura/listDetail", {
    facturaDetails,
    facturaTotal: facturaTotal[0],
    facturaGeneral,
  });
});

// Lista Detalle Compra
router.get("/compras/transacciones/:id", async (req, res) => {
  const { id } = req.params;
  const queryDetails = `SELECT compra_producto_detalle.ID_COMPRA, compra_producto_detalle.ID_PRODUCTOS, productos.NOMBRE_PRODUCTOS, tipos_producto.NOMBRE_TIPOPRODUCTO, marca.NOMBRE_MARCA,
                        compra_producto_detalle.CANTIDAD, compra_producto_detalle.PRECIO_COMPRA,
                        round(sum(compra_producto_detalle.CANTIDAD * compra_producto_detalle.PRECIO_COMPRA), 2) as SUBTOTAL
                        FROM compra_producto_detalle
                        INNER JOIN productos ON productos.ID_PRODUCTOS = compra_producto_detalle.ID_PRODUCTOS
                        INNER JOIN tipos_producto ON productos.ID_TIPOPRODUCTO = tipos_producto.ID_TIPOPRODUCTO
                        INNER JOIN marca ON productos.ID_MARCA = marca.ID_MARCA
                        WHERE ID_COMPRA = ?
                        GROUP BY compra_producto_detalle.ID_PRODUCTOS;`;

  const compraDetails = await pool.query(queryDetails, [id]);

  const querySubISV = `SELECT @subtotal:=round(sum(compra_producto_detalle.CANTIDAD * compra_producto_detalle.PRECIO_COMPRA), 2), 
                        @isv:=round(sum(compra_producto_detalle.CANTIDAD * compra_producto_detalle.PRECIO_COMPRA) * 0.15, 3)
                        FROM compra_producto_detalle WHERE ID_COMPRA = ?;`;

  const queryTotal = `SELECT compra_producto_detalle.ID_COMPRA, @subtotal as SUBTOTAL, @isv as ISV, round((@subtotal + @isv), 3) as TOTAL
                      FROM compra_producto_detalle WHERE ID_COMPRA = ? GROUP BY compra_producto_detalle.ID_COMPRA;`;

  await pool.query(querySubISV, [id]);

  const compraTotal = await pool.query(queryTotal, [id]);

  res.render("facturacion/compra/listDetail", {
    compraDetails,
    compraTotal: compraTotal[0],
  });
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
  const comprasQuery = `SELECT compra_producto.*, proveedores.NOMBRE_PROVEEDOR, round(sum(compra_producto_detalle.CANTIDAD * compra_producto_detalle.PRECIO_COMPRA), 2) as TOTAL
                        FROM compra_producto_detalle
                        INNER JOIN compra_producto ON compra_producto.ID_COMPRA = compra_producto_detalle.ID_COMPRA
                        INNER JOIN proveedores ON compra_producto.ID_PROVEEDOR = proveedores.ID_PROVEEDOR
                        GROUP BY compra_producto.ID_COMPRA
                        ORDER BY compra_producto.ID_COMPRA ASC;`;
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

// Ruta de Busquedas en Facturacion
router.get("/consultas/ventas", async (req, res) => {
  const empQuery = `SELECT ID_EMPLEADO, ID_CATEGORIA, persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA 
                    FROM empleado 
                    INNER JOIN persona ON empleado.ID_PERSONA = persona.ID_PERSONA 
                    HAVING ID_CATEGORIA = 1 OR ID_CATEGORIA = 3`;
  const empleados = await pool.query(empQuery);
  const clientes = await pool.query("SELECT * FROM persona");
  const metodopago = await pool.query("SELECT * FROM modo_pago");
  res.render("facturacion/factura/byventas", {
    empleados,
    clientes,
    metodopago,
  });
});

// CONSULTAS ESPECIFICAS
// Ventas realizadas por Cliente
router.get("/consultas/ventas/cliente/:id_persona", async (req, res) => {
  const { id_persona } = req.params;
  // Busqueda Cliente
  const cliQuerybyId = `SELECT factura.*, persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA, modo_pago.DESC_MODOPAGO, round(sum(factura_detalle.CANTIDAD * factura_detalle.PRECIO_UNIT), 2) as TOTAL
                        FROM factura_detalle
                        INNER JOIN factura ON factura.ID_FACTURA = factura_detalle.ID_FACTURA
                        INNER JOIN persona ON factura.ID_PERSONA = persona.ID_PERSONA
                        INNER JOIN modo_pago ON modo_pago.ID_MODOPAGO = factura.ID_MODOPAGO
                        WHERE persona.ID_PERSONA = ?
                        GROUP BY factura.ID_FACTURA
                        ORDER BY factura.ID_FACTURA ASC`;
  const clienteFact = await pool.query(cliQuerybyId, [id_persona]);
  const jsonCliente = Object.values(JSON.parse(JSON.stringify(clienteFact)));
  res.json(jsonCliente);
});

// Ventas Realizadas por Empleado
router.get("/consultas/ventas/empleado/:id", async (req, res) => {
  const { id } = req.params;
  // Busqueda Cliente
  const empQuerybyId = `SELECT factura.*, persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA, modo_pago.DESC_MODOPAGO, round(sum(factura_detalle.CANTIDAD * factura_detalle.PRECIO_UNIT), 2) as TOTAL
                        FROM factura_detalle
                        INNER JOIN factura ON factura.ID_FACTURA = factura_detalle.ID_FACTURA
                        INNER JOIN persona ON factura.ID_PERSONA = persona.ID_PERSONA
                        INNER JOIN modo_pago ON modo_pago.ID_MODOPAGO = factura.ID_MODOPAGO
                        WHERE factura.ID_EMPLEADO = ?
                        GROUP BY factura.ID_FACTURA
                        ORDER BY factura.ID_FACTURA ASC`;
  const empleadoFact = await pool.query(empQuerybyId, [id]);
  const jsonEmpleado = Object.values(JSON.parse(JSON.stringify(empleadoFact)));
  res.json(jsonEmpleado);
});

// Ventas Realiadas por Metodo de Pago
router.get("/consultas/ventas/modopago/:cod", async (req, res) => {
  const { cod } = req.params;
  // Busqueda Cliente
  const paymentQuerybyId = `SELECT factura.*, persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA, modo_pago.DESC_MODOPAGO, round(sum(factura_detalle.CANTIDAD * factura_detalle.PRECIO_UNIT), 2) as TOTAL
                        FROM factura_detalle
                        INNER JOIN factura ON factura.ID_FACTURA = factura_detalle.ID_FACTURA
                        INNER JOIN persona ON factura.ID_PERSONA = persona.ID_PERSONA
                        INNER JOIN modo_pago ON modo_pago.ID_MODOPAGO = factura.ID_MODOPAGO
                        WHERE factura.ID_MODOPAGO = ?
                        GROUP BY factura.ID_FACTURA
                        ORDER BY factura.ID_FACTURA ASC`;
  const paymentFact = await pool.query(paymentQuerybyId, [cod]);
  const jsonPayment = Object.values(JSON.parse(JSON.stringify(paymentFact)));
  res.json(jsonPayment);
});

// Ruta de Busquedas en Compras
router.get("/consultas/compras", async (req, res) => {
  const proveedores = await pool.query("SELECT * FROM proveedores");
  res.render("facturacion/factura/bycompras", { proveedores });
});

// Compras realizadas por proveedor (Listado)
router.get(
  "/consultas/compras/proveedor/lista/:rtn/:order",
  async (req, res) => {
    const { rtn, order } = req.params;
    const proveedorQuerybyId = `SELECT compra_producto.*, proveedores.*, round(sum(compra_producto_detalle.CANTIDAD * compra_producto_detalle.PRECIO_COMPRA), 2) as TOTAL
                                FROM compra_producto_detalle
                                INNER JOIN compra_producto ON compra_producto.ID_COMPRA = compra_producto_detalle.ID_COMPRA
                                INNER JOIN proveedores ON compra_producto.ID_PROVEEDOR = proveedores.ID_PROVEEDOR
                                WHERE proveedores.ID_PROVEEDOR = ?
                                GROUP BY compra_producto.ID_COMPRA`;
    if (order === "desc") {
      var orderby = ` ORDER BY TOTAL DESC`;
    } else {
      var orderby = ` ORDER BY TOTAL ASC`;
    }

    const comprabyID = proveedorQuerybyId + orderby;

    const proveedorFact = await pool.query(comprabyID, [rtn]);
    const jsonProveedor = Object.values(
      JSON.parse(JSON.stringify(proveedorFact))
    );
    res.json(jsonProveedor);
  }
);

// Compra realizadas por proveedores (Rango de Fecha)
router.get(
  "/consultas/compras/proveedor/lista/:rtn/:order/:fechain/:fechaout",
  async (req, res) => {
    const { rtn, order, fechain, fechaout } = req.params;
    const dateFilter = `SELECT compra_producto.*, proveedores.*, round(sum(compra_producto_detalle.CANTIDAD * compra_producto_detalle.PRECIO_COMPRA), 2) as TOTAL
                      FROM compra_producto_detalle
                      INNER JOIN compra_producto ON compra_producto.ID_COMPRA = compra_producto_detalle.ID_COMPRA
                      INNER JOIN proveedores ON compra_producto.ID_PROVEEDOR = proveedores.ID_PROVEEDOR
                      WHERE compra_producto.id_proveedor = ? and compra_producto.FECHA BETWEEN ? AND ?
                      GROUP BY compra_producto.ID_COMPRA`;

    if (order === "desc") {
      var orderby = ` ORDER BY TOTAL DESC`;
    } else {
      var orderby = ` ORDER BY TOTAL ASC`;
    }

    const comprabyDate = dateFilter + orderby;

    const proveedorFact = await pool.query(comprabyDate, [
      rtn,
      fechain,
      fechaout,
    ]);
    const jsonProveedor = Object.values(
      JSON.parse(JSON.stringify(proveedorFact))
    );

    res.json(jsonProveedor);
  }
);

// Compras realizadas por proveedor (Total de Ventas)
router.get("/consultas/compras/proveedor/total/:rtn", async (req, res) => {
  const { rtn } = req.params;
  const proveedorQuerybyId = `SELECT compra_producto.ID_COMPRA, compra_producto.ID_PROVEEDOR, proveedores.*, round(sum(compra_producto_detalle.CANTIDAD * compra_producto_detalle.PRECIO_COMPRA), 2) as TOTAL
                              FROM compra_producto_detalle
                              INNER JOIN compra_producto ON compra_producto.ID_COMPRA = compra_producto_detalle.ID_COMPRA
                              INNER JOIN proveedores ON compra_producto.ID_PROVEEDOR = proveedores.ID_PROVEEDOR
                              WHERE proveedores.ID_PROVEEDOR = ?`;
  const proveedorFact = await pool.query(proveedorQuerybyId, [rtn]);
  const jsonProveedor = Object.values(
    JSON.parse(JSON.stringify(proveedorFact))
  );

  res.json(jsonProveedor);
});

module.exports = router;
