//Server para recibir request de todos, y enviar los responses
//Se preparan las librerias que se van a utilizar
var http = require('http');
var url = require('url');
var payload = require('request-payload');
var fs = require('fs');
var mysql = require('mysql');
var express = require('express');
var querys = require('querystring');

//Función para obtener el tamaño en bytes de un archivo
function getFilesizeInBytes(filename) {
    var stats = fs.statSync(filename)
    var fileSizeInBytes = stats["size"]
    return fileSizeInBytes
};
//Función para convertir de hexadecimal a binario
function hex2bin(hex){
    return (parseInt(hex, 16).toString(2)).padStart(8, '0');
}

var conec = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: '3306',
    database: 'iotmiddleware'
});

conec.connect(err => {
    if(err) throw err;
    console.log('MySQL Connected');
});

var server = http.createServer(function(request, response){
    var path = url.parse(request.url).pathname;
    switch(path){
        case "/":
            var referrer = request.headers.referer;
            //let dataToSend = "FFF000000000000000000000";
            //Select a la tabla de aplicaciones
            var mysqlQ = mysql.format("SELECT vdID FROM virtualdevices WHERE requestID=?", ["VirtualDeviceFJSC"]);
            conec.query(mysqlQ, function(err, rows, fields) {
                //Si no se encuentra nada en la tabla, entonces se inserta
                if (rows.length == 0) {
                    //Se prepara el insert a la base de datos
                    var queryy = "INSERT INTO virtualdevices (requestID) VALUES ?";
                    //Se guarda el nombre del virtual device asociado
                    var vals = [["VirtualDeviceFJSC"]];
                    conec.query(queryy, [vals], function (err, result) {
                        console.log("Filas insertadas en tabla de virtual devices: " + result.affectedRows);
                        //Se prepara el insert a la base de datos
                        var queryyy = "INSERT INTO hardware (id, vdID, type, tag) VALUES ?";
                        var vals1 = [["SLIDER_VOLUME", result.insertId, "Input", "Slider de volumen"],
                                     ["MSG_SONG", result.insertId, "Input", "Texto de la canción"],
                                     ["LCD_SONG", result.insertId, "Output", "Display de canciones"],
                                     ["COLOR_PICKER", result.insertId, "Input", "Selector de colores"],
                                     ["LED_RGB", result.insertId, "Output", "Luz de efecto de bocina"],
                                     ["LED_GREEN", result.insertId, "Output", "Luz dispositivo encendido"],
                                     ["LED_RED", result.insertId, "Output", "Luz dispositivo apagado"],
                                     ["SW_START", result.insertId, "Input", "Botón de start"],
                                     ["SW_STOP", result.insertId, "Input", "Botón de stop"]
                                    ];
                        conec.query(queryyy, [vals1], function (err, result) {
                            console.log("Filas insertadas en tabal de hardware: " + result.affectedRows);
                        });
                    });
                }
            });
            //Se preparan los campos del header de la respuesta
            response.setHeader('Server',  'CC8');
            response.setHeader('Access-Control-Allow-Origin', '*');
            response.setHeader('Content-type', 'text/plain');
            //console.log(request.headers);
            //Se obtiene el payload del IOT device (limite máximo del tamaño debe de ser 88 bytes)
            payload(request, {limit: 88}, function(body) {
                console.log('Este es el payload -> ',body);
                const ip = request.connection.remoteAddress;
                //Select a la tabla de aplicaciones
                var mysqlQ = mysql.format("SELECT vdID FROM virtualdevices WHERE requestID=?", ["VirtualDeviceFJSC"]);
                conec.query(mysqlQ, function(err, rows, fields) {

                });
                //console.log(body.substring(2,3));
                //Se convierte en bytes los datos que se van a enviar
                var bytes = Buffer.byteLength(body, 'utf8');
                response.setHeader('Content-Length', bytes);
                //Status code 200: OK
                response.writeHead(200);
                response.end(body);
            });
            break;
        case "/info/":
            if(request.method == 'POST') {
                var cuerpo = '';
                request.on('data', function (data){
                    cuerpo += data;
                });
                request.on('end', function (){
                    try {
                        //Se obtiene el JSON enviado en el request
                        let POST_DATA = JSON.parse(cuerpo);
                        //Se obtiene la fecha y hora del momento del request
                        var current_date = new Date();
                        //Select a la tabla de aplicaciones
                        var mysqlQ = mysql.format("SELECT appID FROM aplicaciones WHERE requestID=?", [POST_DATA.id]);
                        conec.query(mysqlQ, function(err, rows, fields) {
                            //Si no se encuentra nada en la tabla, entonces se inserta
                            if(rows.length == 0){
                                //Se prepara el insert a la base de datos
                                var quer = "INSERT INTO aplicaciones (requestID) VALUES ?";
                                //Se guarda el id del request
                                var valores = [[POST_DATA.id]];
                                conec.query(quer, [valores], function (err, result) {
                                    if (err) throw err;
                                    //Se prepara la data para insertar en la bitacora
                                    var consulta = "INSERT INTO bitacora (channel, url, requestType, DateAndTime, appID) VALUES ?";
                                    //Los valores a insertar en la tabla de la bitacora
                                    var values = [["EU", POST_DATA.url, "INFO", POST_DATA.date, result.insertId]];
                                    //Se hace la consulta a la base de datos
                                    conec.query(consulta, [values], function (err, result1) {
                                        if (err) throw err;
                                        console.log("Filas insertadas en la DB: " + result1.affectedRows);
                                        //Se prepara el json para el response
                                        var json_obj = { id: "MWApp_FernandoSagastume", url: "192.168.0.7:8081",
                                            date: (new Date().toISOString()), hardware: {}};
                                        /* Se hace una consulta a la base de datos para obtener los componentes del
                                          dispositivo IOT. */
                                        conec.query('SELECT * FROM hardware', function(err, rows, fields) {
                                            if (err) throw err;
                                            /* Se itera en las filas devueltas y a la vez se forma otro json
                                            para incluir en el json response. */
                                            for (var i = 0; i < rows.length; i++) {
                                                var id_hw = rows[i].id;
                                                //Se agrega a la llave hardware
                                                json_obj.hardware[id_hw] = {tag: rows[i].tag, type: rows[i].type};
                                            }
                                            /* Como se envia un JSON object como response, se setea como MIME
                                               type application/json. */
                                            response.setHeader('Content-Type', 'application/json');
                                            //Se envía el JSON como el response
                                            response.end(JSON.stringify(json_obj));
                                            //Se prepara la data para insertar en la bitacora de responses
                                            var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                            //Los valores a insertar en la tabla de la bitacora
                                            var valus = [[POST_DATA.url, "INFO", JSON.stringify(json_obj), new Date().toISOString(), result1.insertId]];
                                            //Se hace la consulta a la base de datos
                                            conec.query(consult, [valus], function (err, result) {
                                                console.log("Filas insertadas en la tabla de responses: " + result.affectedRows);
                                            });
                                        });
                                    });
                                });
                            }
                            else{//Si se encuentra en la tabla aplicaciones, entonces solamente se guarda en bitacora
                                //Se prepara la data para insertar en la bitacora
                                var consulta = "INSERT INTO bitacora (channel, url, requestType, DateAndTime, appID) VALUES ?";
                                //Los valores a insertar en la tabla de la bitacora
                                var values = [["EU", POST_DATA.url, "INFO", POST_DATA.date, rows[0].appID]];
                                //Se hace la consulta a la base de datos
                                conec.query(consulta, [values], function (err, result) {
                                    if (err) throw err;
                                    console.log("Filas insertadas en la DB: " + result.affectedRows);
                                    //Se prepara el json para el response
                                    var json_obj = { id: "MWApp_FernandoSagastume", url: "192.168.0.7:8081",
                                        date: (new Date().toISOString()), hardware: {}};
                                    /* Se hace una consulta a la base de datos para obtener los componentes del
                                      dispositivo IOT. */
                                    conec.query('SELECT * FROM hardware', function(err, rows, fields) {
                                        if (err) throw err;
                                        /* Se itera en las filas devueltas y a la vez se forma otro json
                                        para incluir en el json response. */
                                        for (var i = 0; i < rows.length; i++) {
                                            var id_hw = rows[i].id;
                                            //Se agrega a la llave hardware
                                            json_obj.hardware[id_hw] = {tag: rows[i].tag, type: rows[i].type};
                                        }
                                        /* Como se envia un JSON object como response, se setea como MIME
                                           type application/json. */
                                        response.setHeader('Content-Type', 'application/json');
                                        //Se envía el JSON como el response
                                        response.end(JSON.stringify(json_obj));
                                        //Se prepara la data para insertar en la bitacora de responses
                                        var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                        //Los valores a insertar en la tabla de la bitacora
                                        var valus = [[POST_DATA.url, "INFO", JSON.stringify(json_obj), new Date().toISOString(), result.insertId]];
                                        //Se hace la consulta a la base de datos
                                        conec.query(consult, [valus], function (err, result1) {
                                            console.log("Filas insertadas en la tabla de responses: " + result1.affectedRows);
                                        });
                                    });
                                });
                            }
                        });
                    }
                    catch (error){
                        console.error(error.message);
                    }
                });
                break;
            }
            else{
                break;
            }
        case "/search/":

            break;
        default:
            //Se prepara el archivo a ser enviado como respuesta
            var html = fs.readFileSync('./error404.html');
            //Se convierte en bytes los datos que se van a enviar
            var bytes = getFilesizeInBytes("error404.html");
            //Se preparan los campos del header de la respuesta
            response.setHeader('Server',  'CC8');
            response.setHeader('Content-Length', bytes);
            response.setHeader('Access-Control-Allow-Origin', '*');
            response.setHeader('Content-type', 'text/html');
            //Status code: 404, URL que se envió no fue encontrada
            response.writeHead(404);
            //Se envía el sitio web como respuesta
            response.end(html);
            var app = express();
            break;
    }
});

server.listen(8081, function(){
    console.log('Se inició el server a las ' + new Date().toISOString() + ', escuchando el puerto 8081');
});