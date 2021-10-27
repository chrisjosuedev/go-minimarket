const express = require("express")
const router = express.Router()
const pool = require("../database")

router.get("/ventas", async (req, res) => {
    res.render("facturacion/factura/analiticas")
})

// Cantidad de Ordenes por Cliente
router.get("/ventas/general", async (req, res) => {
    // Clientes con mayores pedidos
    const queryClients = `SELECT persona.NOMBRE_PERSONA, persona.APELLIDO_PERSONA, count(persona.NOMBRE_PERSONA) as Ordenes
                                FROM factura
                                INNER JOIN persona ON persona.ID_PERSONA = factura.ID_PERSONA
                                GROUP BY persona.NOMBRE_PERSONA
                                ORDER BY Ordenes DESC LIMIT 5;`
    const queryVentasByCliente = await pool.query(queryClients)
    const jsonVentasByCliente = Object.values(JSON.parse(JSON.stringify(queryVentasByCliente)));
    
    // Productos mas vendidos
    const queryProductos = `SELECT factura_detalle.ID_PRODUCTOS, productos.NOMBRE_PRODUCTOS, sum(factura_detalle.CANTIDAD) as Cantidad
                            FROM factura_detalle
                            INNER JOIN productos ON productos.ID_PRODUCTOS = factura_detalle.ID_PRODUCTOS
                            GROUP BY ID_PRODUCTOS
                            ORDER BY Cantidad DESC`
    const queryVentasByProduct = await pool.query(queryProductos)
    const jsonVentasByProduct = Object.values(JSON.parse(JSON.stringify(queryVentasByProduct)));
    
    // Compras por superiores al promedio de ventas
    const queryVentasProm = `SELECT persona.NOMBRE_PERSONA, sum(CANTIDAD * PRECIO_UNIT) as Total
                            FROM factura_detalle
                            INNER JOIN factura ON factura.ID_FACTURA = factura_detalle.ID_FACTURA
                            INNER JOIN persona ON persona.ID_PERSONA = factura.ID_PERSONA
                            group by factura.ID_FACTURA
                            HAVING Total > (SELECT avg(CANTIDAD * PRECIO_UNIT) FROM factura_detalle)
                            order by Total desc LIMIT 5;`

    const queryVentasByProm = await pool.query(queryVentasProm)
    const jsonVentasProm = Object.values(JSON.parse(JSON.stringify(queryVentasByProm)));

    // Compras por superiores al promedio de ventas
    const queryVentasPromInf = `SELECT persona.NOMBRE_PERSONA, sum(CANTIDAD * PRECIO_UNIT) as Total
                            FROM factura_detalle
                            INNER JOIN factura ON factura.ID_FACTURA = factura_detalle.ID_FACTURA
                            INNER JOIN persona ON persona.ID_PERSONA = factura.ID_PERSONA
                            group by factura.ID_FACTURA
                            HAVING Total < (SELECT avg(CANTIDAD * PRECIO_UNIT) FROM factura_detalle)
                            order by Total desc LIMIT 5;`

    const queryVentasByPromInf = await pool.query(queryVentasPromInf)
    const jsonVentasPromInf = Object.values(JSON.parse(JSON.stringify(queryVentasByPromInf)));

    // Promedio de ventas
    const avgVentas = await pool.query("SELECT avg(CANTIDAD * PRECIO_UNIT) as Promedio FROM factura_detalle")
    const jsonAvg = Object.values(JSON.parse(JSON.stringify(avgVentas)));

    // Total de Ventas
    const totalVentas = await pool.query("SELECT sum(CANTIDAD * PRECIO_UNIT) as Total FROM factura_detalle;")
    const jsonTotal = Object.values(JSON.parse(JSON.stringify(totalVentas)));

    // Nivel de facturacion Diario
    const queryNivel = `SELECT factura.FECHA, sum(CANTIDAD * PRECIO_UNIT) as Total, day(factura.FECHA)
                        FROM factura_detalle
                        INNER JOIN factura ON factura.ID_FACTURA = factura_detalle.ID_FACTURA
                        group by day(factura.FECHA)
                        order by factura.FECHA;`

    const queryVentasNivel = await pool.query(queryNivel)
    const jsonVentasDaily = Object.values(JSON.parse(JSON.stringify(queryVentasNivel)));

    res.json( { jsonVentasByCliente, jsonVentasByProduct, 
        jsonVentasProm, jsonVentasPromInf, jsonAvg, jsonVentasDaily, jsonTotal });
})


router.get("/productos", async (req, res) => {
    res.render("productos/items/analiticas")
})

// Querys Productos
router.get("/productos/general", async (req, res) => {
    // Precio mas alto/bajo
    const querySaveMinMax = `SELECT @highest:=max(PRECIO_UNIT), @lowest:=min(PRECIO_UNIT) FROM productos;`
    const queryPrice = `SELECT NOMBRE_PRODUCTOS, PRECIO_UNIT FROM productos
                        WHERE PRECIO_UNIT = @highest OR PRECIO_UNIT = @lowest;`
    await pool.query(querySaveMinMax)
    const queryProductsByPrice = await pool.query(queryPrice)
    const jsonProductsByPrice = Object.values(JSON.parse(JSON.stringify(queryProductsByPrice)));
    

    // Promedio de Precios
    const queryAvgPrice = `SELECT round(avg(PRECIO_UNIT), 2) as Promedio from productos;`
    const queryByAvgPrice = await pool.query(queryAvgPrice)
    const jsonAvgPrice = Object.values(JSON.parse(JSON.stringify(queryByAvgPrice)));

    // Productos por Marca
    const queryMarca = `SELECT marca.NOMBRE_MARCA, count(*) as Total
                        FROM productos
                        JOIN marca ON productos.ID_MARCA = marca.ID_MARCA
                        GROUP BY productos.ID_MARCA
                        ORDER BY Total DESC;`
    const queryByMarca = await pool.query(queryMarca)
    const jsonByMarca = Object.values(JSON.parse(JSON.stringify(queryByMarca)));

    // Productos por Tipo
    const queryTipo = `SELECT tipos_producto.NOMBRE_TIPOPRODUCTO, count(*) as Total
                        FROM productos
                        JOIN tipos_producto ON productos.ID_TIPOPRODUCTO = tipos_producto.ID_TIPOPRODUCTO
                        GROUP BY productos.ID_TIPOPRODUCTO
                        ORDER BY Total DESC;`
    const queryByTipo = await pool.query(queryTipo)
    const jsonByTipo = Object.values(JSON.parse(JSON.stringify(queryByTipo)));

    // Cantidad Total en Stock
    const queryTotalStock = await pool.query("SELECT sum(STOCK) as Total FROM productos")
    const jsonTotalStock = Object.values(JSON.parse(JSON.stringify(queryTotalStock)));

    res.json( { jsonProductsByPrice, jsonAvgPrice, jsonByMarca, jsonByTipo, jsonTotalStock } );
})

module.exports = router