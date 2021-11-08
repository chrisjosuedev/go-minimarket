const express = require("express");
const router = express.Router();
const pool = require("../database");


// Ventas
router.get("/ventas", async (req, res) => {
  res.render("facturacion/factura/analiticas");
});

// Compras
router.get("/compras", async (req, res) => {
  res.render("facturacion/compra/analiticas");
});

// Analiticas Compras
router.get("/compras/general", async (req, res) => {
  // Nivel de compras Diario
  const queryNivel = `SELECT compra_producto.FECHA, round(sum(CANTIDAD * PRECIO_COMPRA), 2) as Total
                      FROM compra_producto_detalle
                      INNER JOIN compra_producto ON compra_producto.ID_COMPRA = compra_producto_detalle.ID_COMPRA
                      group by day(compra_producto.FECHA)
                      order by compra_producto.FECHA;`;

  const queryComprasNivel = await pool.query(queryNivel);
  const jsonComprasDaily = Object.values(JSON.parse(JSON.stringify(queryComprasNivel)));

  await pool.query("SET lc_time_names = 'es_ES';")

  // Nivel de compras Mensual
  const queryNivelMensual = `SELECT upper(monthname(compra_producto.FECHA)) as Mes, round(sum(CANTIDAD * PRECIO_COMPRA), 3) as Total
                            FROM compra_producto_detalle
                            INNER JOIN compra_producto ON compra_producto.ID_COMPRA = compra_producto_detalle.ID_COMPRA
                            group by month(compra_producto.FECHA)
                            order by compra_producto.FECHA;`;

  const queryComprasMensual = await pool.query(queryNivelMensual);
  const jsonComprasMensual = Object.values(JSON.parse(JSON.stringify(queryComprasMensual)));

  // Nivel de compras Anual
  const queryNivelAnual = `SELECT year(compra_producto.FECHA) as Year, round(sum(CANTIDAD * PRECIO_COMPRA), 2) as Total
                          FROM compra_producto_detalle
                          INNER JOIN compra_producto ON compra_producto.ID_COMPRA = compra_producto_detalle.ID_COMPRA
                          group by year(compra_producto.FECHA)
                          order by compra_producto.FECHA;`;
  
  const queryComprasAnual = await pool.query(queryNivelAnual);
  const jsonComprasAnual = Object.values(JSON.parse(JSON.stringify(queryComprasAnual)));

  // Total de Ventas
  const totalCompras = await pool.query(
    "SELECT round(sum(CANTIDAD * PRECIO_COMPRA), 2) as Total FROM compra_producto_detalle;"
  );
  const jsonCompras = Object.values(JSON.parse(JSON.stringify(totalCompras)));


  res.json({jsonComprasDaily, jsonComprasMensual, jsonComprasAnual, jsonCompras})
})

// Cantidad de Ordenes por Cliente
router.get("/ventas/general", async (req, res) => {
  // Clientes con mayores pedidos
  const queryClients = `SELECT persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA, count(persona.NOMBRE_PERSONA) as Ordenes
                                FROM factura
                                INNER JOIN persona ON persona.ID_PERSONA = factura.ID_PERSONA
                                GROUP BY persona.NOMBRE_PERSONA
                                ORDER BY Ordenes DESC LIMIT 5;`;
  const queryVentasByCliente = await pool.query(queryClients);
  const jsonVentasByCliente = Object.values(
    JSON.parse(JSON.stringify(queryVentasByCliente))
  );

  // Productos mas vendidos
  const queryProductos = `SELECT factura_detalle.ID_PRODUCTOS, productos.NOMBRE_PRODUCTOS, sum(factura_detalle.CANTIDAD) as Cantidad
                            FROM factura_detalle
                            INNER JOIN productos ON productos.ID_PRODUCTOS = factura_detalle.ID_PRODUCTOS
                            GROUP BY ID_PRODUCTOS
                            ORDER BY Cantidad DESC`;
  const queryVentasByProduct = await pool.query(queryProductos);
  const jsonVentasByProduct = Object.values(
    JSON.parse(JSON.stringify(queryVentasByProduct))
  );

  // Compras por superiores al promedio de ventas
  const queryVentasProm = `SELECT persona.NOMBRE_PERSONA, sum(CANTIDAD * PRECIO_UNIT) as Total
                            FROM factura_detalle
                            INNER JOIN factura ON factura.ID_FACTURA = factura_detalle.ID_FACTURA
                            INNER JOIN persona ON persona.ID_PERSONA = factura.ID_PERSONA
                            group by factura.ID_FACTURA
                            HAVING Total > (SELECT avg(CANTIDAD * PRECIO_UNIT) FROM factura_detalle)
                            order by Total desc LIMIT 5;`;

  const queryVentasByProm = await pool.query(queryVentasProm);
  const jsonVentasProm = Object.values(
    JSON.parse(JSON.stringify(queryVentasByProm))
  );

  // Compras por superiores al promedio de ventas
  const queryVentasPromInf = `SELECT persona.NOMBRE_PERSONA, sum(CANTIDAD * PRECIO_UNIT) as Total
                            FROM factura_detalle
                            INNER JOIN factura ON factura.ID_FACTURA = factura_detalle.ID_FACTURA
                            INNER JOIN persona ON persona.ID_PERSONA = factura.ID_PERSONA
                            group by factura.ID_FACTURA
                            HAVING Total < (SELECT avg(CANTIDAD * PRECIO_UNIT) FROM factura_detalle)
                            order by Total desc LIMIT 5;`;

  const queryVentasByPromInf = await pool.query(queryVentasPromInf);
  const jsonVentasPromInf = Object.values(
    JSON.parse(JSON.stringify(queryVentasByPromInf))
  );

  // Promedio de ventas
  const avgVentas = await pool.query(
    "SELECT avg(CANTIDAD * PRECIO_UNIT) as Promedio FROM factura_detalle"
  );
  const jsonAvg = Object.values(JSON.parse(JSON.stringify(avgVentas)));

  // Total de Ventas
  const totalVentas = await pool.query(
    "SELECT sum(CANTIDAD * PRECIO_UNIT) as Total FROM factura_detalle;"
  );
  const jsonTotal = Object.values(JSON.parse(JSON.stringify(totalVentas)));

  // Nivel de facturacion Diario
  const queryNivel = `SELECT factura.FECHA, sum(CANTIDAD * PRECIO_UNIT) as Total, day(factura.FECHA)
                        FROM factura_detalle
                        INNER JOIN factura ON factura.ID_FACTURA = factura_detalle.ID_FACTURA
                        group by day(factura.FECHA)
                        order by factura.FECHA;`;

  const queryVentasNivel = await pool.query(queryNivel);
  const jsonVentasDaily = Object.values(JSON.parse(JSON.stringify(queryVentasNivel)));

  await pool.query("SET lc_time_names = 'es_ES';")

  // Nivel de Facturacion Mensual
  const queryNivelMensual = `SELECT upper(monthname(factura.FECHA)) as Mes, sum(CANTIDAD * PRECIO_UNIT) as Total
                    FROM factura_detalle
                    INNER JOIN factura ON factura.ID_FACTURA = factura_detalle.ID_FACTURA
                    group by month(factura.FECHA)
                    order by factura.FECHA;`;

  const queryVentasMensual = await pool.query(queryNivelMensual);
  const jsonVentasMensual = Object.values(JSON.parse(JSON.stringify(queryVentasMensual)));

  // Nivel de Facturacion Anual
  const queryNivelAnual = `SELECT year(factura.FECHA) as Year, sum(CANTIDAD * PRECIO_UNIT) as Total
                            FROM factura_detalle
                            INNER JOIN factura ON factura.ID_FACTURA = factura_detalle.ID_FACTURA
                            group by year(factura.FECHA)
                            order by factura.FECHA;`;
  
  const queryVentasAnual = await pool.query(queryNivelAnual);
  const jsonVentasAnual = Object.values(JSON.parse(JSON.stringify(queryVentasAnual)));

  // Nivel de Ventas por Hora
  const queryNivelHora = `SELECT DATE_FORMAT(factura.FECHA, "%h%p") as Hora, 
                          	round(sum(CANTIDAD * PRECIO_UNIT), 2) as Total
                          FROM factura_detalle
                          INNER JOIN factura ON factura.ID_FACTURA = factura_detalle.ID_FACTURA
                          group by EXTRACT(HOUR FROM factura.FECHA)
                          order by Total DESC;`;
  
  const queryVentasHora = await pool.query(queryNivelHora);
  const jsonVentasHora = Object.values(JSON.parse(JSON.stringify(queryVentasHora)));

  res.json({
    jsonVentasByCliente,
    jsonVentasByProduct,
    jsonVentasProm,
    jsonVentasPromInf,
    jsonAvg,
    jsonVentasDaily,
    jsonVentasMensual,
    jsonVentasAnual,
    jsonVentasHora,
    jsonTotal,
  });
});

router.get("/productos", async (req, res) => {
  res.render("productos/items/analiticas");
});

// Querys Productos
router.get("/productos/general", async (req, res) => {
  // Precio mas alto/bajo
  const querySaveMinMax = `SELECT @highest:=max(PRECIO_UNIT), @lowest:=min(PRECIO_UNIT) FROM productos;`;
  const queryPrice = `SELECT NOMBRE_PRODUCTOS, PRECIO_UNIT FROM productos
                        WHERE PRECIO_UNIT = @highest OR PRECIO_UNIT = @lowest;`;
  await pool.query(querySaveMinMax);
  const queryProductsByPrice = await pool.query(queryPrice);
  const jsonProductsByPrice = Object.values(
    JSON.parse(JSON.stringify(queryProductsByPrice))
  );

  // Promedio de Precios
  const queryAvgPrice = `SELECT round(avg(PRECIO_UNIT), 2) as Promedio from productos;`;
  const queryByAvgPrice = await pool.query(queryAvgPrice);
  const jsonAvgPrice = Object.values(
    JSON.parse(JSON.stringify(queryByAvgPrice))
  );

  // Productos por Marca
  const queryMarca = `SELECT marca.NOMBRE_MARCA, count(*) as Total
                        FROM productos
                        JOIN marca ON productos.ID_MARCA = marca.ID_MARCA
                        GROUP BY productos.ID_MARCA
                        ORDER BY Total DESC;`;
  const queryByMarca = await pool.query(queryMarca);
  const jsonByMarca = Object.values(JSON.parse(JSON.stringify(queryByMarca)));

  // Productos por Tipo
  const queryTipo = `SELECT tipos_producto.NOMBRE_TIPOPRODUCTO, count(*) as Total
                        FROM productos
                        JOIN tipos_producto ON productos.ID_TIPOPRODUCTO = tipos_producto.ID_TIPOPRODUCTO
                        GROUP BY productos.ID_TIPOPRODUCTO
                        ORDER BY Total DESC;`;
  const queryByTipo = await pool.query(queryTipo);
  const jsonByTipo = Object.values(JSON.parse(JSON.stringify(queryByTipo)));

  // Cantidad Total en Stock
  const queryTotalStock = await pool.query(
    "SELECT sum(STOCK) as Total FROM productos"
  );
  const jsonTotalStock = Object.values(
    JSON.parse(JSON.stringify(queryTotalStock))
  );

  res.json({
    jsonProductsByPrice,
    jsonAvgPrice,
    jsonByMarca,
    jsonByTipo,
    jsonTotalStock,
  });
});

module.exports = router;
