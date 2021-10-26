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


module.exports = router