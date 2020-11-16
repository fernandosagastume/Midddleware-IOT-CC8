//Server para recibir request de todos, y enviar los responses
//Se preparan las librerias que se van a utilizar
var http = require('http');
var url = require('url');
var payload = require('request-payload');
var fs = require('fs');
var mysql = require('mysql');
var express = require('express');
var querys = require('querystring');
var moment = require('moment');
var ngrok = require('ngrok');
var colores = require('hex-to-color-name');
let VDChanges = false;
let eventCreated = false;
let VDNewData = "";
var ipAddress = "192.168.0.11";

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

//Función para remplazar caracteres en un string
function setCharAt(str,index,chr) {
    if(index > str.length-1) return str;
    return str.substring(0,index) + chr + str.substring(index+1);
}

var conec = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: '3306',
    database: 'iotmiddleware',
    multipleStatements: true
});

conec.connect(err => {
    if(err) throw err;
    console.log('MySQL Connected');
});

var server = http.createServer(function(request, response){
    var path = url.parse(request.url).pathname;
    console.log(request.url);
    switch(path){
        case "/":
            var referrer = request.headers.referer;
            //Select a la tabla de virtual devices
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
                        var vals1 = [["SLIDER_VOLUME", result.insertId, "input", "Slider de volumen"],
                                     ["MSG_SONG", result.insertId, "input", "Texto de la canción"],
                                     ["LCD_SONG", result.insertId, "output", "Display de canciones"],
                                     ["COLOR_PICKER", result.insertId, "input", "Selector de colores"],
                                     ["LED_RGB", result.insertId, "output", "Luz de efecto de bocina"],
                                     ["LED_GREEN", result.insertId, "output", "Luz dispositivo encendido"],
                                     ["LED_RED", result.insertId, "output", "Luz dispositivo apagado"],
                                     ["SW_START", result.insertId, "input", "Botón de start"],
                                     ["SW_STOP", result.insertId, "input", "Botón de stop"]
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
                //console.log(body.substring(2,3));
                //Select a la tabla de virtual devices
                var mysqli = mysql.format("SELECT vdID FROM virtualdevices WHERE requestID=?", ["VirtualDeviceFJSC"]);
                conec.query(mysqli, function(err, rows, fields) {
                    var mysqli1 = mysql.format("SELECT * FROM `bitacora_vd` ORDER BY bitacora_VD_ID DESC");
                    conec.query(mysqli1, function(err1, rows1, fields1) {
                        /*if(rows1.length > 0) {
                            if (rows1[0].dataReceived == body) {
                                //Se prepara el insert a la base de datos
                                var queryy2 = "UPDATE bitacora_vd SET ? WHERE ?";
                                //Se guarda el request del virtual device en la bitacora
                                var vals2 = [{DateAndTime: moment().format('YYYY-MM-DD HH:mm:ss')}, {dataReceived: rows[0].dataReceived}];
                                conec.query(queryy2, [vals2], function (err, result) {
                                    if(result != null)
                                        console.log("Datos actualizados en la bitacora de los vd: " + result.affectedRows);
                                });
                            } else {
                                //Se prepara el insert a la base de datos
                                var queryy2 = "INSERT INTO bitacora_vd (DateAndTime, dataReceived, vdID) VALUES ?";
                                //Se guarda el request del virtual device en la bitacora
                                var vals2 = [[moment().format('YYYY-MM-DD HH:mm:ss'), body, rows[0].vdID]];
                                conec.query(queryy2, [vals2], function (err, result) {
                                    console.log("Filas insertadas en la bitacora de los vd: " + result.affectedRows);
                                });
                            }
                        }*/
                        if(rows1.length < 0) {
                            //Se prepara el insert a la base de datos
                            var queryy2 = "INSERT INTO bitacora_vd (DateAndTime, dataReceived, vdCondition, vdID) VALUES ?";
                            //Se guarda el request del virtual device en la bitacora como init por ser el primero
                            var vals2 = [[moment().format('YYYY-MM-DD HH:mm:ss'), body, "Init", rows[0].vdID]];
                            conec.query(queryy2, [vals2], function (err, result) {
                                console.log("Filas insertadas en la bitacora de los vd: " + result.affectedRows);
                            });
                        }
                    });
                });
                var bool = false;
                if(body.substring(1,2) == "0"){
                    body = setCharAt(body, 1, '2');
                    bool = true;
                }
                else{
                    var axu = hex2bin(body.substring(1,2));
                    if(axu.charAt(axu.length-2) == '0' && axu.charAt(axu.length-3) == '0'){
                        if(axu.charAt(axu.length-4) == '0'){
                            body = setCharAt(body, 1, '2');
                            bool = true;
                        }else{
                            body = setCharAt(body, 1, 'A');
                            bool = true;
                        }
                    }
                }

                conec.query("SELECT * FROM bitacora_vd ORDER BY bitacora_VD_ID DESC", function (err1, rows2, fields1) {
                    mostRecent = rows2[0].dataReceived;
                    console.log("FOUND: ", mostRecent)
                    //Se compara con el valor más reciente
                    if (mostRecent != body) {
                        //Si hubieron cambios del EU entonces se toman esos cambios
                        if(VDChanges) {
                            VDChanges = false;
                            //Se convierte en bytes los datos que se van a enviar
                            var bytes = Buffer.byteLength(mostRecent, 'utf8');
                            response.setHeader('Content-Length', bytes);
                            //Status code 200: OK
                            response.writeHead(200);
                            response.end(mostRecent);
                        }else{//De lo contrario fueron cambios hechos por el VD
                            //Valor del color picker
                            var aux = body.substring(18, 24);
                            var cont = 0;
                            //Siempre se le pone el valor del color picker al RGB
                            for (var i = 11; i < 17; i++) {
                                body = setCharAt(body, i, aux.charAt(cont));
                                cont++;
                            }
                            var aux1 = hex2bin(body.substring(0,1));
                            var aux2 = hex2bin(mostRecent.substring(0,1));
                            //Boton de pausa activado
                            if(aux1.charAt(aux1.length - 3) == '1'){
                                //Si el botón estaba desactivado antes, entonces se verfica si el de start esta activado para desactivarlo
                                if(aux2.charAt(aux2.length - 3) == '0') {
                                    if ((aux1.charAt(aux1.length - 2) == '1') && (aux1.charAt(aux1.length - 4) == '1')) {
                                        body = setCharAt(body, 0, 'C');
                                    } else if ((aux1.charAt(aux1.length - 2) == '1') && (aux1.charAt(aux1.length - 4) == '0')) {
                                        body = setCharAt(body, 0, '4');
                                    }else if ((aux1.charAt(aux1.length - 2) == '0') && (aux1.charAt(aux1.length - 4) == '1')) {
                                        body = setCharAt(body, 0, '8');
                                    }else{
                                        body = setCharAt(body, 0, '0');
                                    }
                                }
                            }
                            //Boton de start activado
                            else if(aux1.charAt(aux1.length - 2) == '1'){
                                //Si el botón estaba desactivado antes, entonces se verfica si el de pausa esta activado para desactivarlo
                                if(aux2.charAt(aux2.length - 2) == '0') {
                                    if ((aux1.charAt(aux1.length - 3) == '1') && (aux1.charAt(aux1.length - 4) == '1')) {
                                        body = setCharAt(body, 0, 'A');
                                    }else if ((aux1.charAt(aux1.length - 3) == '1') && (aux1.charAt(aux1.length - 4) == '0')) {
                                        body = setCharAt(body, 0, '2');
                                    }
                                }
                            }
                            //Select a la tabla de virtual devices
                            var mysqli = mysql.format("SELECT vdID FROM virtualdevices WHERE requestID=?", ["VirtualDeviceFJSC"]);
                            conec.query(mysqli, function(err, rowsVD, fields) {
                                //Se prepara el insert a la base de datos
                                var query = "INSERT INTO bitacora_vd (DateAndTime, dataReceived, vdID) VALUES ?";
                                //Se guarda el request del virtual device en la bitacora como init por ser el primero
                                var vals = [[moment().format('YYYY-MM-DD HH:mm:ss'), body, rowsVD[0].vdID]];
                                if(body.length > 0) {
                                    conec.query(query, [vals], function (err2, result2) {
                                        console.log("Bitacora VD cambiada por EU: " + result2.affectedRows);
                                    });
                                }
                            });
                            //Se convierte en bytes los datos que se van a enviar
                            var bytes = Buffer.byteLength(body, 'utf8');
                            response.setHeader('Content-Length', bytes);
                            //Status code 200: OK
                            response.writeHead(200);
                            response.end(body);
                        }
                    }else {
                        if (bool == true) {
                            conec.query("SELECT * FROM bitacora_vd ORDER BY bitacora_VD_ID DESC", function (err1, rows2, fields1) {
                                mostRecent = rows2[0].dataReceived;
                                //Se compara con el valor más reciente
                                if (mostRecent != body) {
                                    //Select a la tabla de virtual devices
                                    var mysqli = mysql.format("SELECT vdID FROM virtualdevices WHERE requestID=?", ["VirtualDeviceFJSC"]);
                                    conec.query(mysqli, function (err, rows, fields) {
                                        //Se prepara el insert a la base de datos
                                        var query = "INSERT INTO bitacora_vd (DateAndTime, dataReceived, vdID) VALUES ?";
                                        //Se guarda el request del virtual device en la bitacora como init por ser el primero
                                        var vals = [[moment().format('YYYY-MM-DD HH:mm:ss'), body, rows[0].vdID]];
                                        conec.query(query, [vals], function (err, result) {
                                            console.log("Filas insertadas en la bitacora de los vd: " + result.affectedRows);
                                        });
                                    });
                                }
                            });

                            //Se convierte en bytes los datos que se van a enviar
                            var bytes = Buffer.byteLength(body, 'utf8');
                            response.setHeader('Content-Length', bytes);
                            //Status code 200: OK
                            response.writeHead(200);
                            response.end(body);
                        } else {
                            response.writeHead(200);
                            response.end();
                        }
                    }
 //-----------------------------Aquí inicia el chequeo de evento--------------------------------------------------------
                    var qry = "SELECT eventID, url, DateAndTime, ifCond, thenCond, elseCond, a.requestID FROM eventos e JOIN aplicaciones a ON (e.appID = a.appID)";
                    conec.query(qry, function (errore, filas, campos) {
                        if(errore) throw errore;
                        if(filas.length > 0){
                            for(var i = 0; i < filas.length; i++){
                                var ifConditional = JSON.parse(filas[i].ifCond);
                                var thenConditional = JSON.parse(filas[i].thenCond);
                                var elseConditional = JSON.parse(filas[i].elseCond);
                                var url = filas[i].url;
                                var aID = filas[i].requestID;

                                var anotherQ = "SELECT * FROM bitacora_vd ORDER BY bitacora_VD_ID DESC";
                                conec.query(anotherQ, [], function (err1, rows1, fields1) {
                                   if(err1)throw err1;
                                   if(rows1.length > 0){
                                       var data = rows1[0].dataReceived;
                                       //Se verifica que tipo de condición es para comparar con el valor del query
                                       switch(ifConditional.condition){
                                           case "=":
                                               if(ifConditional.left.id == "COLOR_PICKER"){
                                                   var aux = data.substring(18,24);
                                                   var hexInt = parseInt(aux, 16);
                                                   if(ifConditional.right.sensor == hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                               "id": aID,
                                                                               "url": url,
                                                                               "date": new Date().toISOString(),
                                                                               "change": {}
                                                                           };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                               let dataR = "";
                                                                               res.on("data", d => {
                                                                                   dataR += d;
                                                                               })
                                                                               res.on("end", () => {
                                                                                   console.log(dataR);
                                                                               })
                                                                           })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                           if(elseConditional.url == ipAddress){
                                                               var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                               conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                                   if (err2) throw err2;
                                                                   if (rows2.length == 0) {
                                                                       checkCond = false;
                                                                   } else {
                                                                       if (rows2[0].type == "input") {
                                                                           //Error, no puede ser input, debe de ser output el change
                                                                           checkCond = false;
                                                                       }else{//output
                                                                           var idComp = elseConditional.id;
                                                                           //Se crea el JSON para enviar el change
                                                                           let bodyToSend = {
                                                                               "id": aID,
                                                                               "url": url,
                                                                               "date": new Date().toISOString(),
                                                                               "change": {}
                                                                           };
                                                                           if(elseConditional.status && elseConditional.text) {
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status,
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                           else{
                                                                               if(elseConditional.status){
                                                                                   bodyToSend.change[idComp] = {
                                                                                       "status": elseConditional.status
                                                                                   };
                                                                               }
                                                                               else if(elseConditional.text){
                                                                                   bodyToSend.change[idComp] = {
                                                                                       "text": elseConditional.text
                                                                                   };
                                                                               }
                                                                           }
                                                                           let options = {
                                                                               hostname: ipAddress,
                                                                               port: 8081,
                                                                               path: "/change/",
                                                                               method: "POST",
                                                                               headers: {
                                                                                   "Content-Type": "application/json",
                                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                               }
                                                                           }
                                                                           //Se envia el request para el change
                                                                           http.request(options, res => {
                                                                               let dataR = "";
                                                                               res.on("data", d => {
                                                                                   dataR += d;
                                                                               })
                                                                               res.on("end", () => {
                                                                                   console.log(dataR);
                                                                               })
                                                                           })
                                                                               .on("error", console.error)
                                                                               .end(JSON.stringify(bodyToSend));
                                                                       }
                                                                   }
                                                               });
                                                           }
                                                           else{//Evento externo
                                                               var idComp = elseConditional.id;
                                                               //Se crea el JSON para enviar el change
                                                               let bodyToSend = {
                                                                   "id": "MWApp_FernandoSagastume",
                                                                   "url": ipAddress,
                                                                   "date": new Date().toISOString(),
                                                                   "change": {}
                                                               };
                                                               if(elseConditional.status && elseConditional.text) {
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status,
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                               else{
                                                                   if(elseConditional.status){
                                                                       bodyToSend.change[idComp] = {
                                                                           "status": elseConditional.status
                                                                       };
                                                                   }
                                                                   else if(elseConditional.text){
                                                                       bodyToSend.change[idComp] = {
                                                                           "text": elseConditional.text
                                                                       };
                                                                   }
                                                               }
                                                               let options = {
                                                                   hostname: thenConditional.url,
                                                                   path: "/change/",
                                                                   method: "POST",
                                                                   headers: {
                                                                       "Content-Type": "application/json",
                                                                       "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                   }
                                                               }
                                                               //Se envia el request para el change
                                                               http.request(options, res => {
                                                                   let dataR = "";
                                                                   res.on("data", d => {
                                                                       dataR += d;
                                                                   })
                                                                   res.on("end", () => {
                                                                       console.log(dataR);
                                                                   })
                                                               })
                                                                   .on("error", console.error)
                                                                   .end(JSON.stringify(bodyToSend));
                                                           }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SLIDER_VOLUME"){
                                                   var aux = data.substring(4,6);
                                                   var hexInt = parseInt(aux, 16);
                                                   if(ifConditional.right.sensor == hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SW_STOP"){
                                                   var aux = hex2bin(data.substring(0,1));
                                                   var stop = aux.charAt(aux.length-3);
                                                   var hexInt = parseInt(stop);
                                                   if(ifConditional.right.sensor == hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SW_START"){
                                                   var aux = hex2bin(data.substring(0,1));
                                                   var start = aux.charAt(aux.length-2);
                                                   var hexInt = parseInt(start);
                                                   if(ifConditional.right.sensor == hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "MSG_SONG"){
                                                   var aux = data.substring(25);
                                               }
                                               break;
                                           case "!=":
                                               if(ifConditional.left.id == "COLOR_PICKER"){
                                                   var aux = data.substring(18,24);
                                                   var hexInt = parseInt(aux, 16);
                                                   if(ifConditional.right.sensor != hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SLIDER_VOLUME"){
                                                   var aux = data.substring(4,6);
                                                   var hexInt = parseInt(aux, 16);
                                                   if(ifConditional.right.sensor != hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SW_STOP"){
                                                   var aux = hex2bin(data.substring(0,1));
                                                   var stop = aux.charAt(aux.length-3);
                                                   var hexInt = parseInt(stop);
                                                   if(ifConditional.right.sensor != hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SW_START"){
                                                   var aux = hex2bin(data.substring(0,1));
                                                   var start = aux.charAt(aux.length-2);
                                                   var hexInt = parseInt(start);
                                                   if(ifConditional.right.sensor != hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "MSG_SONG"){
                                                   var aux = data.substring(25);
                                               }
                                               break;
                                           case "<":
                                               if(ifConditional.left.id == "COLOR_PICKER"){
                                                   var aux = data.substring(18,24);
                                                   var hexInt = parseInt(aux, 16);
                                                   if(ifConditional.right.sensor < hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SLIDER_VOLUME"){
                                                   var aux = data.substring(4,6);
                                                   var hexInt = parseInt(aux, 16);
                                                   if(ifConditional.right.sensor < hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SW_STOP"){
                                                   var aux = hex2bin(data.substring(0,1));
                                                   var stop = aux.charAt(aux.length-3);
                                                   var hexInt = parseInt(stop);
                                                   if(ifConditional.right.sensor < hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SW_START"){
                                                   var aux = hex2bin(data.substring(0,1));
                                                   var start = aux.charAt(aux.length-2);
                                                   var hexInt = parseInt(start);
                                                   if(ifConditional.right.sensor < hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "MSG_SONG"){
                                                   var aux = data.substring(25);
                                               }
                                               break;
                                           case ">":
                                               if(ifConditional.left.id == "COLOR_PICKER"){
                                                   var aux = data.substring(18,24);
                                                   var hexInt = parseInt(aux, 16);
                                                   if(ifConditional.right.sensor > hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SLIDER_VOLUME"){
                                                   var aux = data.substring(4,6);
                                                   var hexInt = parseInt(aux, 16);
                                                   if(ifConditional.right.sensor > hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SW_STOP"){
                                                   var aux = hex2bin(data.substring(0,1));
                                                   var stop = aux.charAt(aux.length-3);
                                                   var hexInt = parseInt(stop);
                                                   if(ifConditional.right.sensor > hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SW_START"){
                                                   var aux = hex2bin(data.substring(0,1));
                                                   var start = aux.charAt(aux.length-2);
                                                   var hexInt = parseInt(start);
                                                   if(ifConditional.right.sensor > hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "MSG_SONG"){
                                                   var aux = data.substring(25);
                                               }
                                               break;
                                           case "<=":
                                               if(ifConditional.left.id == "COLOR_PICKER"){
                                                   var aux = data.substring(18,24);
                                                   var hexInt = parseInt(aux, 16);
                                                   if(ifConditional.right.sensor <= hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SLIDER_VOLUME"){
                                                   var aux = data.substring(4,6);
                                                   var hexInt = parseInt(aux, 16);
                                                   if(ifConditional.right.sensor <= hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SW_STOP"){
                                                   var aux = hex2bin(data.substring(0,1));
                                                   var stop = aux.charAt(aux.length-3);
                                                   var hexInt = parseInt(stop);
                                                   if(ifConditional.right.sensor <= hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SW_START"){
                                                   var aux = hex2bin(data.substring(0,1));
                                                   var start = aux.charAt(aux.length-2);
                                                   var hexInt = parseInt(start);
                                                   if(ifConditional.right.sensor <= hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "MSG_SONG"){
                                                   var aux = data.substring(25);
                                               }
                                               break;
                                           case ">=":
                                               if(ifConditional.left.id == "COLOR_PICKER"){
                                                   var aux = data.substring(18,24);
                                                   var hexInt = parseInt(aux, 16);
                                                   if(ifConditional.right.sensor >= hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SLIDER_VOLUME"){
                                                   var aux = data.substring(4,6);
                                                   var hexInt = parseInt(aux, 16);
                                                   if(ifConditional.right.sensor >= hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SW_STOP"){
                                                   var aux = hex2bin(data.substring(0,1));
                                                   var stop = aux.charAt(aux.length-3);
                                                   var hexInt = parseInt(stop);
                                                   if(ifConditional.right.sensor >= hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "SW_START"){
                                                   var aux = hex2bin(data.substring(0,1));
                                                   var start = aux.charAt(aux.length-2);
                                                   var hexInt = parseInt(start);
                                                   if(ifConditional.right.sensor >= hexInt){
                                                       //Se verifica que el then sea local o externo
                                                       if(thenConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [thenConditional.id], function (err2, rows2, fields2) {
                                                               if (err2) throw err2;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = thenConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(thenConditional.status && thenConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": thenConditional.status,
                                                                               "text": thenConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(thenConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": thenConditional.status
                                                                               };
                                                                           }
                                                                           else if(thenConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": thenConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = thenConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(thenConditional.status && thenConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": thenConditional.status,
                                                                   "text": thenConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(thenConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": thenConditional.status
                                                                   };
                                                               }
                                                               else if(thenConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": thenConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                                   else{//Si no se cumple la condición entonces
                                                       if(elseConditional.url == ipAddress){
                                                           var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                           conec.query(sqlquery, [elseConditional.id], function (err2, rows2, fields2) {
                                                               if (err) throw err;
                                                               if (rows2.length == 0) {
                                                                   checkCond = false;
                                                               } else {
                                                                   if (rows2[0].type == "input") {
                                                                       //Error, no puede ser input, debe de ser output el change
                                                                       checkCond = false;
                                                                   }else{//output
                                                                       var idComp = elseConditional.id;
                                                                       //Se crea el JSON para enviar el change
                                                                       let bodyToSend = {
                                                                           "id": aID,
                                                                           "url": url,
                                                                           "date": new Date().toISOString(),
                                                                           "change": {}
                                                                       };
                                                                       if(elseConditional.status && elseConditional.text) {
                                                                           bodyToSend.change[idComp] = {
                                                                               "status": elseConditional.status,
                                                                               "text": elseConditional.text
                                                                           };
                                                                       }
                                                                       else{
                                                                           if(elseConditional.status){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "status": elseConditional.status
                                                                               };
                                                                           }
                                                                           else if(elseConditional.text){
                                                                               bodyToSend.change[idComp] = {
                                                                                   "text": elseConditional.text
                                                                               };
                                                                           }
                                                                       }
                                                                       let options = {
                                                                           hostname: ipAddress,
                                                                           port: 8081,
                                                                           path: "/change/",
                                                                           method: "POST",
                                                                           headers: {
                                                                               "Content-Type": "application/json",
                                                                               "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                                           }
                                                                       }
                                                                       //Se envia el request para el change
                                                                       http.request(options, res => {
                                                                           let dataR = "";
                                                                           res.on("data", d => {
                                                                               dataR += d;
                                                                           })
                                                                           res.on("end", () => {
                                                                               console.log(dataR);
                                                                           })
                                                                       })
                                                                           .on("error", console.error)
                                                                           .end(JSON.stringify(bodyToSend));
                                                                   }
                                                               }
                                                           });
                                                       }
                                                       else{//Evento externo
                                                           var idComp = elseConditional.id;
                                                           //Se crea el JSON para enviar el change
                                                           let bodyToSend = {
                                                               "id": "MWApp_FernandoSagastume",
                                                               "url": ipAddress,
                                                               "date": new Date().toISOString(),
                                                               "change": {}
                                                           };
                                                           if(elseConditional.status && elseConditional.text) {
                                                               bodyToSend.change[idComp] = {
                                                                   "status": elseConditional.status,
                                                                   "text": elseConditional.text
                                                               };
                                                           }
                                                           else{
                                                               if(elseConditional.status){
                                                                   bodyToSend.change[idComp] = {
                                                                       "status": elseConditional.status
                                                                   };
                                                               }
                                                               else if(elseConditional.text){
                                                                   bodyToSend.change[idComp] = {
                                                                       "text": elseConditional.text
                                                                   };
                                                               }
                                                           }
                                                           let options = {
                                                               hostname: thenConditional.url,
                                                               path: "/change/",
                                                               method: "POST",
                                                               headers: {
                                                                   "Content-Type": "application/json",
                                                                   "Content-Length": Buffer.byteLength(JSON.stringify(bodyToSend))
                                                               }
                                                           }
                                                           //Se envia el request para el change
                                                           http.request(options, res => {
                                                               let dataR = "";
                                                               res.on("data", d => {
                                                                   dataR += d;
                                                               })
                                                               res.on("end", () => {
                                                                   console.log(dataR);
                                                               })
                                                           })
                                                               .on("error", console.error)
                                                               .end(JSON.stringify(bodyToSend));
                                                       }
                                                   }
                                               }
                                               else if(ifConditional.left.id == "MSG_SONG"){
                                                   var aux = data.substring(25);
                                               }
                                               break;
                                           default:
                                               break;
                                       }
                                   }
                               });

                            }
                        }
                    });
 //-----------------------------Aquí tremina el chequeo de evento-------------------------------------------------------
                });
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
                                    //Se crea un moment
                                    var postdate = moment(POST_DATA.date);
                                    //Se parsea a un formato más entendible
                                    var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                    //Los valores a insertar en la tabla de la bitacora
                                    var values = [["EU", POST_DATA.url, "INFO", fecha, result.insertId]];
                                    //Se hace la consulta a la base de datos
                                    conec.query(consulta, [values], function (err, result1) {
                                        if (err) throw err;
                                        console.log("Filas insertadas en la bitacora: " + result1.affectedRows);
                                        //Se prepara el json para el response
                                        var json_obj = { id: "MWApp_FernandoSagastume", url: ipAddress,
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
                                            var valus = [[POST_DATA.url, "INFO", JSON.stringify(json_obj), moment().format('YYYY-MM-DD HH:mm:ss'), result1.insertId]];
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
                                //Se crea un moment
                                var postdate = moment(POST_DATA.date);
                                //Se parsea a un formato más entendible
                                var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                //Los valores a insertar en la tabla de la bitacora
                                var values = [["EU", POST_DATA.url, "INFO", fecha, rows[0].appID]];
                                //Se hace la consulta a la base de datos
                                conec.query(consulta, [values], function (err, result) {
                                    if (err) throw err;
                                    console.log("Filas insertadas en la bitacora: " + result.affectedRows);
                                    //Se prepara el json para el response
                                    var json_obj = { id: "MWApp_FernandoSagastume", url: ipAddress,
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
                                        var valus = [[POST_DATA.url, "INFO", JSON.stringify(json_obj), moment().format('YYYY-MM-DD HH:mm:ss'), result.insertId]];
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
            if(request.method == 'POST') {
                var cuerpo = '';
                request.on('data', function (data){
                    cuerpo += data;
                });
                request.on('end', function () {
                    try {
                        //Se obtiene el JSON enviado en el request
                        let SEARCH_JSON = JSON.parse(cuerpo);
                        console.log(SEARCH_JSON.search.id_hardware);
                        console.log(SEARCH_JSON.search.start_date);
                        console.log(SEARCH_JSON.search.finish_date);
                        //Se crea un moment de la fecha inicio
                        var inicio = moment(SEARCH_JSON.search.start_date);
                        //Se crea un moment de la fecha final
                        var final = moment(SEARCH_JSON.search.finish_date);
                        //Se parsea a un formato más entendible
                        var inicio_fecha = inicio.format('YYYY-MM-DD HH:mm:ss');
                        var final_fecha = final.format('YYYY-MM-DD HH:mm:ss');
                        //Select a la tabla de aplicaciones
                        var mysqlQ = mysql.format("SELECT appID FROM aplicaciones WHERE requestID=?", [SEARCH_JSON.id]);
                        conec.query(mysqlQ, function(err, rows, fields) {
                            //Si no se encuentra nada en la tabla, entonces se inserta
                            if (rows.length == 0) {
                                //Se prepara el insert a la base de datos
                                var quer = "INSERT INTO aplicaciones (requestID) VALUES ?";
                                //Se guarda el id del request
                                var valores = [[SEARCH_JSON.id]];
                                conec.query(quer, [valores], function (err, result) {
                                    if (err) throw err;
                                    //Se prepara la data para insertar en la bitacora
                                    var consulta = "INSERT INTO bitacora (channel, url, requestType, body, DateAndTime, appID) VALUES ?";
                                    //Se crea un moment
                                    var postdate = moment(SEARCH_JSON.date);
                                    //Se parsea a un formato más entendible
                                    var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                    //Los valores a insertar en la tabla de la bitacora
                                    var values = [["EU", SEARCH_JSON.url, "SEARCH", JSON.stringify(SEARCH_JSON.search), fecha, result.insertId]];
                                    //Se hace la consulta a la base de datos
                                    conec.query(consulta, [values], function (err, result1) {
                                        if (err) throw err;
                                        console.log("Filas insertadas en la bitacora: " + result1.affectedRows);
                                        //Se prepara el json para el response
                                        var json_search = {
                                            id: "MWApp_FernandoSagastume", url: ipAddress,
                                            date: (new Date().toISOString()), search: {}, data: {}
                                        };
                                        /* Se hace una consulta a la base de datos para obtener los componentes del
                                          dispositivo IOT. */
                                        conec.query("SELECT * FROM hardware WHERE id = ?", [SEARCH_JSON.search.id_hardware], function (err, rows, fields) {
                                            if (err) throw err;
                                            conec.query("SELECT * FROM bitacora_vd WHERE DateAndTime >= ? AND DateAndTime <= ?", [inicio_fecha, final_fecha],
                                                function (err1, rows1, fields1) {
                                                    if (err) throw err1;
                                                    //Se envia el componente y el tipo que es
                                                    json_search["search"] = {
                                                        id_hardware: SEARCH_JSON.search.id_hardware,
                                                        type: rows[0].type
                                                    }
                                                    /* Se itera en las filas devueltas y a la vez se forma otro json
                                                    para incluir en el json response. */
                                                    for (var i = 0; i < rows1.length; i++) {
                                                        var dateComponent = new Date(rows1[i].DateAndTime).toISOString();
                                                        if (rows[0].type == "Output") {
                                                            if (SEARCH_JSON.search.id_hardware == "LED_GREEN") {
                                                                var aux = hex2bin(rows1[i].dataReceived.substring(1, 2));
                                                                if (aux.charAt(aux.length - 2) == '0') {
                                                                    //Se agrega a la llave de data
                                                                    json_search.data[dateComponent] = {
                                                                        status: "false",
                                                                        text: "Apagado"
                                                                    };
                                                                } else {
                                                                    if (aux.charAt(aux.length - 2) == '1') {
                                                                        //Se agrega a la llave de data
                                                                        json_search.data[dateComponent] = {
                                                                            status: "true",
                                                                            text: "Encendido"
                                                                        };
                                                                    }
                                                                }
                                                            } else if (SEARCH_JSON.search.id_hardware == "LED_RED") {
                                                                var aux = hex2bin(rows1[i].dataReceived.substring(1, 2));
                                                                if (aux.charAt(aux.length - 3) == '0') {
                                                                    //Se agrega a la llave de data
                                                                    json_search.data[dateComponent] = {
                                                                        status: "false",
                                                                        text: "Apagado"
                                                                    };
                                                                } else {
                                                                    if (aux.charAt(aux.length - 3) == '1') {
                                                                        //Se agrega a la llave de data
                                                                        json_search.data[dateComponent] = {
                                                                            status: "true",
                                                                            text: "Encendido"
                                                                        };
                                                                    }
                                                                }
                                                            } else if (SEARCH_JSON.search.id_hardware == "LED_RGB") {
                                                                var aux = hex2bin(rows1[i].dataReceived.substring(1, 2));
                                                                if (aux.charAt(aux.length - 4) == '0') {
                                                                    //Se agrega a la llave de data
                                                                    json_search.data[dateComponent] = {
                                                                        status: "false",
                                                                        text: "Apagado, no mostrando nada"
                                                                    };
                                                                } else {
                                                                    if (aux.charAt(aux.length - 4) == '1') {
                                                                        var aux1 = rows1[i].dataReceived.substring(11, 17);
                                                                        var colorname = colores('#' + aux1);
                                                                        //Se agrega a la llave de data
                                                                        json_search.data[dateComponent] = {
                                                                            status: "true",
                                                                            text: "Mostrando el color " + colorname
                                                                        };
                                                                    }
                                                                }
                                                            } else if (SEARCH_JSON.search.id_hardware == "LCD_SONG") {
                                                                var aux = hex2bin(rows1[i].dataReceived.substring(0, 1));
                                                                if (aux.charAt(aux.length - 4) == '0') {
                                                                    //Se agrega a la llave de data
                                                                    json_search.data[dateComponent] = {
                                                                        status: "false",
                                                                        text: "Pantalla apagada"
                                                                    };
                                                                } else {
                                                                    if (aux.charAt(aux.length - 4) == '1') {
                                                                        //Se agrega a la llave de data
                                                                        json_search.data[dateComponent] = {
                                                                            status: "true",
                                                                            text: "Pantalla encendida"
                                                                        };
                                                                    }
                                                                }
                                                            }
                                                        } else {
                                                            if (SEARCH_JSON.search.id_hardware == "SLIDER_VOLUME") {
                                                                var aux = rows1[i].dataReceived.substring(4, 6);
                                                                var hexInt = parseInt(aux, 16);
                                                                json_search.data[dateComponent] = {sensor: hexInt};
                                                            } else if (SEARCH_JSON.search.id_hardware == "COLOR_PICKER") {
                                                                var aux = rows1[i].dataReceived.substring(19, 25);
                                                                var hexInt = parseInt(aux, 16);
                                                                json_search.data[dateComponent] = {
                                                                    sensor: hexInt,
                                                                    text: "Color elegido: " + colores("#" + aux)
                                                                };
                                                            } else if (SEARCH_JSON.search.id_hardware == "MSG_SONG") {
                                                                var aux = rows1[i].dataReceived.substring(25);
                                                                var hexInt = parseInt(aux, 16);
                                                                if (aux != "") {
                                                                    var song = '';
                                                                    for (var i = 0; i < hex.length; i += 2) {
                                                                        song += String.fromCharCode(parseInt(aux.substr(i, 2), 16));
                                                                    }
                                                                    json_search.data[dateComponent] = {text: "Se escribió la canción " + song};
                                                                } else {
                                                                    json_search.data[dateComponent] = {text: "No se escribió ninguna canción"};
                                                                }
                                                            } else if (SEARCH_JSON.search.id_hardware == "SW_START") {
                                                                var aux = hex2bin(rows1[i].dataReceived.substring(0, 1));
                                                                if (aux.charAt(aux.length - 2) == '0') {
                                                                    //Se agrega a la llave de data
                                                                    json_search.data[dateComponent] = {
                                                                        status: "0",
                                                                        text: "Botón no presionado"
                                                                    };
                                                                } else {
                                                                    if (aux.charAt(aux.length - 2) == '1') {
                                                                        //Se agrega a la llave de data
                                                                        json_search.data[dateComponent] = {
                                                                            status: "1",
                                                                            text: "Botón presionado"
                                                                        };
                                                                    }
                                                                }
                                                            } else if (SEARCH_JSON.search.id_hardware == "SW_STOP") {
                                                                var aux = hex2bin(rows1[i].dataReceived.substring(0, 1));
                                                                if (aux.charAt(aux.length - 3) == '0') {
                                                                    //Se agrega a la llave de data
                                                                    json_search.data[dateComponent] = {
                                                                        status: "0",
                                                                        text: "Botón no presionado"
                                                                    };
                                                                } else {
                                                                    if (aux.charAt(aux.length - 3) == '1') {
                                                                        //Se agrega a la llave de data
                                                                        json_search.data[dateComponent] = {
                                                                            status: "1",
                                                                            text: "Botón presionado"
                                                                        };
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                    response.setHeader('Content-Type', 'application/json');
                                                    //Se envía el JSON como el response
                                                    response.end(JSON.stringify(json_search));
                                                    //Se prepara la data para insertar en la bitacora de responses
                                                    var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                    //Los valores a insertar en la tabla de la bitacora
                                                    var valus = [[SEARCH_JSON.url, "SEARCH", JSON.stringify(json_search), moment().format('YYYY-MM-DD HH:mm:ss'), result1.insertId]];
                                                    //Se hace la consulta a la base de datos
                                                    conec.query(consult, [valus], function (err, result) {
                                                        console.log("Filas insertadas en la tabla de responses: " + result.affectedRows);
                                                    });
                                                });
                                        });
                                    });
                                });
                            }else{
                                //Se prepara la data para insertar en la bitacora
                                var consulta = "INSERT INTO bitacora (channel, url, requestType, body, DateAndTime, appID) VALUES ?";
                                //Se crea un moment
                                var postdate = moment(SEARCH_JSON.date);
                                //Se parsea a un formato más entendible
                                var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                //Los valores a insertar en la tabla de la bitacora
                                var values = [["EU", SEARCH_JSON.url, "SEARCH", JSON.stringify(SEARCH_JSON.search), fecha, rows[0].appID]];
                                //Se hace la consulta a la base de datos
                                conec.query(consulta, [values], function (err, result) {
                                    if (err) throw err;
                                    console.log("Filas insertadas en la bitacora: " + result.affectedRows);
                                    //Se prepara el json para el response
                                    var json_search = {
                                        id: "MWApp_FernandoSagastume", url: ipAddress,
                                        date: (new Date().toISOString()), search: {}, data: {}
                                    };
                                    /* Se hace una consulta a la base de datos para obtener los componentes del
                                      dispositivo IOT. */
                                    conec.query("SELECT * FROM hardware WHERE id = ?", [SEARCH_JSON.search.id_hardware], function (err, rows, fields) {
                                        if (err) throw err;
                                        conec.query("SELECT * FROM bitacora_vd WHERE DateAndTime >= ? AND DateAndTime <= ?", [inicio_fecha, final_fecha],
                                            function (err1, rows1, fields1) {
                                                if (err) throw err1;
                                                //Se envia el componente y el tipo que es
                                                json_search["search"] = {
                                                    id_hardware: SEARCH_JSON.search.id_hardware,
                                                    type: rows[0].type
                                                }
                                                /* Se itera en las filas devueltas y a la vez se forma otro json
                                                para incluir en el json response. */
                                                for (var i = 0; i < rows1.length; i++) {
                                                    var dateComponent = new Date(rows1[i].DateAndTime).toISOString();
                                                    if (rows[0].type == "Output") {
                                                        if (SEARCH_JSON.search.id_hardware == "LED_GREEN") {
                                                            var aux = hex2bin(rows1[i].dataReceived.substring(1, 2));
                                                            if (aux.charAt(aux.length - 2) == '0') {
                                                                //Se agrega a la llave de data
                                                                json_search.data[dateComponent] = {
                                                                    status: false,
                                                                    text: "Apagado"
                                                                };
                                                            } else {
                                                                if (aux.charAt(aux.length - 2) == '1') {
                                                                    //Se agrega a la llave de data
                                                                    json_search.data[dateComponent] = {
                                                                        status: true,
                                                                        text: "Encendido"
                                                                    };
                                                                }
                                                            }
                                                        } else if (SEARCH_JSON.search.id_hardware == "LED_RED") {
                                                            var aux = hex2bin(rows1[i].dataReceived.substring(1, 2));
                                                            if (aux.charAt(aux.length - 3) == '0') {
                                                                //Se agrega a la llave de data
                                                                json_search.data[dateComponent] = {
                                                                    status: false,
                                                                    text: "Apagado"
                                                                };
                                                            } else {
                                                                if (aux.charAt(aux.length - 3) == '1') {
                                                                    //Se agrega a la llave de data
                                                                    json_search.data[dateComponent] = {
                                                                        status: true,
                                                                        text: "Encendido"
                                                                    };
                                                                }
                                                            }
                                                        } else if (SEARCH_JSON.search.id_hardware == "LED_RGB") {
                                                            var aux = hex2bin(rows1[i].dataReceived.substring(1, 2));
                                                            if (aux.charAt(aux.length - 4) == '0') {
                                                                //Se agrega a la llave de data
                                                                json_search.data[dateComponent] = {
                                                                    status: false,
                                                                    text: "Apagado, no mostrando nada"
                                                                };
                                                            } else {
                                                                if (aux.charAt(aux.length - 4) == '1') {
                                                                    var aux1 = rows1[i].dataReceived.substring(11, 17);
                                                                    var colorname = colores('#' + aux1);
                                                                    //Se agrega a la llave de data
                                                                    json_search.data[dateComponent] = {
                                                                        status: true,
                                                                        text: "Mostrando el color " + colorname
                                                                    };
                                                                }
                                                            }
                                                        } else if (SEARCH_JSON.search.id_hardware == "LCD_SONG") {
                                                            var aux = hex2bin(rows1[i].dataReceived.substring(0, 1));
                                                            if (aux.charAt(aux.length - 4) == '0') {
                                                                //Se agrega a la llave de data
                                                                json_search.data[dateComponent] = {
                                                                    status: false,
                                                                    text: "Pantalla apagada"
                                                                };
                                                            } else {
                                                                if (aux.charAt(aux.length - 4) == '1') {
                                                                    //Se agrega a la llave de data
                                                                    json_search.data[dateComponent] = {
                                                                        status: true,
                                                                        text: "Pantalla encendida"
                                                                    };
                                                                }
                                                            }
                                                        }
                                                    } else {
                                                        if (SEARCH_JSON.search.id_hardware == "SLIDER_VOLUME") {
                                                            var aux = rows1[i].dataReceived.substring(4, 6);
                                                            var hexInt = parseInt(aux, 16);
                                                            json_search.data[dateComponent] = {sensor: hexInt};
                                                        } else if (SEARCH_JSON.search.id_hardware == "COLOR_PICKER") {
                                                            var aux = rows1[i].dataReceived.substring(19, 25);
                                                            var hexInt = parseInt(aux, 16);
                                                            json_search.data[dateComponent] = {
                                                                sensor: hexInt,
                                                                text: "Color elegido: " + colores("#" + aux)
                                                            };
                                                        } else if (SEARCH_JSON.search.id_hardware == "MSG_SONG") {
                                                            var aux = rows1[i].dataReceived.substring(25);
                                                            var hexInt = parseInt(aux, 16);
                                                            if (aux != "") {
                                                                var song = '';
                                                                for (var i = 0; i < hex.length; i += 2) {
                                                                    song += String.fromCharCode(parseInt(aux.substr(i, 2), 16));
                                                                }
                                                                json_search.data[dateComponent] = {text: "Se escribió la canción " + song};
                                                            } else {
                                                                json_search.data[dateComponent] = {text: "No se escribió ninguna canción"};
                                                            }
                                                        } else if (SEARCH_JSON.search.id_hardware == "SW_START") {
                                                            var aux = hex2bin(rows1[i].dataReceived.substring(0, 1));
                                                            if (aux.charAt(aux.length - 3) == '0') {
                                                                //Se agrega a la llave de data
                                                                json_search.data[dateComponent] = {
                                                                    sensor: 0,
                                                                    text: "Botón no presionado"
                                                                };
                                                            } else {
                                                                if (aux.charAt(aux.length - 3) == '1') {
                                                                    //Se agrega a la llave de data
                                                                    json_search.data[dateComponent] = {
                                                                        sensor: 1,
                                                                        text: "Botón presionado"
                                                                    };
                                                                }
                                                            }
                                                        } else if (SEARCH_JSON.search.id_hardware == "SW_STOP") {
                                                            var aux = hex2bin(rows1[i].dataReceived.substring(0, 1));
                                                            if (aux.charAt(aux.length - 2) == '0') {
                                                                //Se agrega a la llave de data
                                                                json_search.data[dateComponent] = {
                                                                    sensor: 0,
                                                                    text: "Botón no presionado"
                                                                };
                                                            } else {
                                                                if (aux.charAt(aux.length - 2) == '1') {
                                                                    //Se agrega a la llave de data
                                                                    json_search.data[dateComponent] = {
                                                                        sensor: 1,
                                                                        text: "Botón presionado"
                                                                    };
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                                response.setHeader('Content-Type', 'application/json');
                                                //Se envía el JSON como el response
                                                response.end(JSON.stringify(json_search));
                                                //Se prepara la data para insertar en la bitacora de responses
                                                var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                //Los valores a insertar en la tabla de la bitacora
                                                var valus = [[SEARCH_JSON.url, "SEARCH", JSON.stringify(json_search), moment().format('YYYY-MM-DD HH:mm:ss'), result.insertId]];
                                                //Se hace la consulta a la base de datos
                                                conec.query(consult, [valus], function (err, result1) {
                                                    console.log("Filas insertadas en la tabla de responses: " + result1.affectedRows);
                                                });
                                            });
                                    });
                                });
                            }
                        });
                    } catch (error) {
                        console.error(error.message);
                    }
                });
                break;
            }
            else{
                break;
            }
        case "/change/":
            if(request.method == 'POST') {
                var cuerpo = '';
                request.on('data', function (data){
                    cuerpo += data;
                });
                request.on('end', function () {
                    try {
                        //Se obtiene el JSON enviado en el request
                        let CHANGE_JSON = JSON.parse(cuerpo);
                        //Se obtiene el componente de hw que se desea cambiar
                        var hw = Object.keys(CHANGE_JSON.change)[0];
                        //Select a la tabla de aplicaciones
                        var mysqlQ = mysql.format("SELECT appID FROM aplicaciones WHERE requestID=?", [CHANGE_JSON.id]);
                        conec.query(mysqlQ, function(err, rows, fields) {
                            //Se prepara la data para insertar en la bitacora
                            var consulta = "INSERT INTO bitacora (channel, url, requestType, body, DateAndTime, appID) VALUES ?";
                            //Se crea un moment
                            var postdate = moment(CHANGE_JSON.date);
                            //Se parsea a un formato más entendible
                            var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                            //Los valores a insertar en la tabla de la bitacora
                            var values = [["EU", CHANGE_JSON.url, "CHANGE", JSON.stringify(CHANGE_JSON.change), fecha, rows[0].appID]];
                            //Se hace la consulta a la base de datos
                            conec.query(consulta, [values], function (err, result) {
                                if (err) throw err;
                                console.log("Filas insertadas en la bitacora: " + result.affectedRows);
                                //Se prepara el json para el response
                                var json_change = {
                                    id: "MWApp_FernandoSagastume", url: ipAddress,
                                    date: (new Date().toISOString()), status: ""
                                };
                                /* Se hace una consulta a la base de datos para obtener los componentes del
                                  dispositivo IOT. */
                            conec.query("SELECT * FROM hardware WHERE id = ?", [hw], function (err, rows1, fields) {
                                if (err) throw err;
                                if(rows1.length == 0){
                                    json_change["status"] = "ERROR"
                                    response.setHeader('Content-Type', 'application/json');
                                    //Se envía el JSON como el response
                                    response.end(JSON.stringify(json_change));
                                    //Se prepara la data para insertar en la bitacora de responses
                                    var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                    //Los valores a insertar en la tabla de la bitacora
                                    var valus = [[CHANGE_JSON.url, "CHANGE", JSON.stringify(json_change), moment().format('YYYY-MM-DD HH:mm:ss'), result.insertId]];
                                    //Se hace la consulta a la base de datos
                                    conec.query(consult, [valus], function (err, result1) {
                                        console.log("Filas insertadas en la tabla de responses: " + result1.affectedRows);
                                    });
                                }else{
                                    conec.query("SELECT * FROM bitacora_vd ORDER BY bitacora_VD_ID DESC", function (err1, rows2, fields1) {
                                            if (rows1[0].type == "Output") {
                                                 if (hw == "LED_RGB") {
                                                    //Se obtiene el estado del VD más reciente
                                                    var aux = hex2bin(rows2[0].dataReceived.substring(1, 2));
                                                     //console.log("DATA RECEIVED 1:", aux.charAt(aux.length - 4));
                                                     //console.log("STATUS:", CHANGE_JSON.change[hw].status);
                                                    if ((aux.charAt(aux.length - 4) == '0') && (CHANGE_JSON.change[hw].status)) {
                                                        //Se verifica que el led rojo no este encendido
                                                        if(aux.charAt(aux.length - 3) != '1'){
                                                            VDChanges = true;
                                                            var dataRecibida = rows2[0].dataReceived;
                                                            VDNewData = setCharAt(dataRecibida, 1, 'A');
                                                            //Valor del color picker
                                                            var aux1 = dataRecibida.substring(18, 24);
                                                            var cont = 0;
                                                            for(var i = 11; i < 17; i++){
                                                                VDNewData = setCharAt(VDNewData, i, aux1.charAt(cont));
                                                                cont++;
                                                            }
                                                            //Select a la tabla de virtual devices
                                                            var mysqli = mysql.format("SELECT vdID FROM virtualdevices WHERE requestID=?", ["VirtualDeviceFJSC"]);
                                                            conec.query(mysqli, function(err, rows, fields) {
                                                                //Se prepara el insert a la base de datos
                                                                var query = "INSERT INTO bitacora_vd (DateAndTime, dataReceived, vdID) VALUES ?";
                                                                //Se guarda el request del virtual device en la bitacora como init por ser el primero
                                                                var vals = [[moment().format('YYYY-MM-DD HH:mm:ss'), VDNewData, rows[0].vdID]];
                                                                conec.query(query, [vals], function (err, result) {
                                                                    console.log("Bitacora VD cambiada por EU: " + result.affectedRows);
                                                                });
                                                            });
                                                        }
                                                    } else {
                                                        if (aux.charAt(aux.length - 4) == '1' && (!CHANGE_JSON.change[hw].status)) {
                                                            //Se verifica que el led rojo no esté encendido
                                                            if(aux.charAt(aux.length - 3) != '1'){
                                                                VDChanges = true;
                                                                var dataRecibida = rows2[0].dataReceived;
                                                                VDNewData = setCharAt(dataRecibida, 1, '2');
                                                                //Se llena de ceros el color del RGB
                                                                for(var i = 11; i < 17; i++){
                                                                    VDNewData = setCharAt(VDNewData, i, '0');
                                                                    cont++;
                                                                }
                                                                //Select a la tabla de virtual devices
                                                                var mysqli = mysql.format("SELECT vdID FROM virtualdevices WHERE requestID=?", ["VirtualDeviceFJSC"]);
                                                                conec.query(mysqli, function(err, rows, fields) {
                                                                    //Se prepara el insert a la base de datos
                                                                    var query = "INSERT INTO bitacora_vd (DateAndTime, dataReceived, vdID) VALUES ?";
                                                                    //Se guarda el request del virtual device en la bitacora como init por ser el primero
                                                                    var vals = [[moment().format('YYYY-MM-DD HH:mm:ss'), VDNewData, rows[0].vdID]];
                                                                    conec.query(query, [vals], function (err, result) {
                                                                        if(result)
                                                                        console.log("Bitacora VD cambiada por EU: " + result.affectedRows);
                                                                    });
                                                                });
                                                            }
                                                        }
                                                    }
                                                     json_change["status"] = "OK"
                                                     response.setHeader('Content-Type', 'application/json');
                                                     //Se envía el JSON como el response
                                                     response.end(JSON.stringify(json_change));
                                                }
                                                 else if (hw == "LCD_SONG") {
                                                     //Se obtiene el estado del VD más reciente
                                                     var aux = hex2bin(rows2[0].dataReceived.substring(0, 1));
                                                     var leds = hex2bin(rows2[0].dataReceived.substring(1, 2));
                                                     //console.log("DATA RECEIVED 1:", aux.charAt(aux.length - 4));
                                                     //console.log("STATUS:", CHANGE_JSON.change[hw].status);
                                                     if ((aux.charAt(aux.length - 4) == '0') && (CHANGE_JSON.change[hw].status)) {
                                                         //Se hacen los cambios para el VD
                                                         if(leds.charAt(leds.length - 3) != '1'){
                                                             VDChanges = true;
                                                             var dataRecibida = rows2[0].dataReceived;
                                                             //Se verifica que el Switch de pausa (SW0) esté presionado
                                                             if(aux.charAt(aux.length - 3) == '1'){
                                                                 VDNewData = setCharAt(dataRecibida, 0, 'C');
                                                             }
                                                             //Se verifica que el Switch de inicio (SW1) esté presionado
                                                             else if(aux.charAt(aux.length - 2) == '1'){
                                                                 VDNewData = setCharAt(dataRecibida, 0, 'A');
                                                             }
                                                             else{
                                                                 VDNewData = setCharAt(dataRecibida, 0, '8');
                                                             }
                                                             //Select a la tabla de virtual devices
                                                             var mysqli = mysql.format("SELECT vdID FROM virtualdevices WHERE requestID=?", ["VirtualDeviceFJSC"]);
                                                             conec.query(mysqli, function(err, rows, fields) {
                                                                 //Se prepara el insert a la base de datos
                                                                 var query = "INSERT INTO bitacora_vd (DateAndTime, dataReceived, vdID) VALUES ?";
                                                                 //Se guarda el request del virtual device en la bitacora como init por ser el primero
                                                                 var vals = [[moment().format('YYYY-MM-DD HH:mm:ss'), VDNewData, rows[0].vdID]];
                                                                 conec.query(query, [vals], function (err, result) {
                                                                     console.log("Bitacora VD cambiada por EU: " + result.affectedRows);
                                                                 });
                                                             });
                                                         }
                                                     } else {
                                                         if (aux.charAt(aux.length - 4) == '1' && (!CHANGE_JSON.change[hw].status)) {
                                                             //Se hacen los cambios para el VD
                                                             if(aux.charAt(aux.length - 3) != '1'){
                                                                 VDChanges = true;
                                                                 var dataRecibida = rows2[0].dataReceived;
                                                                 //Se verifica que el Switch de pausa (SW0) esté presionado
                                                                 if(aux.charAt(aux.length - 3) == '1'){
                                                                     VDNewData = setCharAt(dataRecibida, 0, '4');
                                                                 }
                                                                 //Se verifica que el Switch de inicio (SW1) esté presionado
                                                                 else if(aux.charAt(aux.length - 2) == '1'){
                                                                     VDNewData = setCharAt(dataRecibida, 0, '2');
                                                                 }
                                                                 else{
                                                                     VDNewData = setCharAt(dataRecibida, 0, '0');
                                                                 }
                                                                 //Select a la tabla de virtual devices
                                                                 var mysqli = mysql.format("SELECT vdID FROM virtualdevices WHERE requestID=?", ["VirtualDeviceFJSC"]);
                                                                 conec.query(mysqli, function(err, rows, fields) {
                                                                     //Se prepara el insert a la base de datos
                                                                     var query = "INSERT INTO bitacora_vd (DateAndTime, dataReceived, vdID) VALUES ?";
                                                                     //Se guarda el request del virtual device en la bitacora como init por ser el primero
                                                                     var vals = [[moment().format('YYYY-MM-DD HH:mm:ss'), VDNewData, rows[0].vdID]];
                                                                     conec.query(query, [vals], function (err, result) {
                                                                         console.log("Bitacora VD cambiada por EU: " + result.affectedRows);
                                                                     });
                                                                 });
                                                             }
                                                         }
                                                     }
                                                     json_change["status"] = "OK"
                                                     response.setHeader('Content-Type', 'application/json');
                                                     //Se envía el JSON como el response
                                                     response.end(JSON.stringify(json_change));
                                                 }
                                                 else if (hw == "LED_GREEN") {
                                                     //Se obtiene el estado del VD más reciente
                                                     var leds = hex2bin(rows2[0].dataReceived.substring(1, 2));
                                                     if ((leds.charAt(leds.length - 2) == '0') && (CHANGE_JSON.change[hw].status)) {
                                                         //Se hacen los cambios para el VD
                                                         if(leds.charAt(leds.length - 3) == '1'){
                                                             VDChanges = true;
                                                             var dataRecibida = rows2[0].dataReceived;
                                                             //Se enciende el LED verde, y lo demás se deja en 0
                                                             VDNewData = "020000000000000000000000";
                                                             //Select a la tabla de virtual devices
                                                             var mysqli = mysql.format("SELECT vdID FROM virtualdevices WHERE requestID=?", ["VirtualDeviceFJSC"]);
                                                             conec.query(mysqli, function(err, rows, fields) {
                                                                 //Se prepara el insert a la base de datos
                                                                 var query = "INSERT INTO bitacora_vd (DateAndTime, dataReceived, vdID) VALUES ?";
                                                                 //Se guarda el request del virtual device en la bitacora como init por ser el primero
                                                                 var vals = [[moment().format('YYYY-MM-DD HH:mm:ss'), VDNewData, rows[0].vdID]];
                                                                 conec.query(query, [vals], function (err, result) {
                                                                     console.log("Bitacora VD cambiada por EU: " + result.affectedRows);
                                                                 });
                                                             });
                                                         }
                                                     } else {
                                                         if (leds.charAt(leds.length - 2) == '1' && (!CHANGE_JSON.change[hw].status)) {
                                                             //Se hacen los cambios para el VD
                                                             VDChanges = true;
                                                             var dataRecibida = rows2[0].dataReceived;
                                                             //Se apaga el LED verde, se enciende el LED rojo, y lo demás se deja en 0
                                                             VDNewData = "040000000000000000000000";
                                                             //Select a la tabla de virtual devices
                                                             var mysqli = mysql.format("SELECT vdID FROM virtualdevices WHERE requestID=?", ["VirtualDeviceFJSC"]);
                                                             conec.query(mysqli, function(err, rows, fields) {
                                                                 //Se prepara el insert a la base de datos
                                                                 var query = "INSERT INTO bitacora_vd (DateAndTime, dataReceived, vdID) VALUES ?";
                                                                 //Se guarda el request del virtual device en la bitacora como init por ser el primero
                                                                 var vals = [[moment().format('YYYY-MM-DD HH:mm:ss'), VDNewData, rows[0].vdID]];
                                                                 conec.query(query, [vals], function (err, result) {
                                                                     console.log("Bitacora VD cambiada por EU: " + result.affectedRows);
                                                                 });
                                                             });
                                                         }
                                                     }
                                                     json_change["status"] = "OK"
                                                     response.setHeader('Content-Type', 'application/json');
                                                     //Se envía el JSON como el response
                                                     response.end(JSON.stringify(json_change));
                                                 }
                                                 else if (hw == "LED_RED") {
                                                     //Se obtiene el estado del VD más reciente
                                                     var leds = hex2bin(rows2[0].dataReceived.substring(1, 2));
                                                     if ((leds.charAt(leds.length - 3) == '0') && (CHANGE_JSON.change[hw].status)) {
                                                         //Se hacen los cambios para el VD
                                                         if(leds.charAt(leds.length - 2) == '1'){
                                                             VDChanges = true;
                                                             var dataRecibida = rows2[0].dataReceived;
                                                             //Se enciende el LED rojo y se apaga el verde, y lo demás se deja en 0
                                                             VDNewData = "040000000000000000000000";
                                                             //Select a la tabla de virtual devices
                                                             var mysqli = mysql.format("SELECT vdID FROM virtualdevices WHERE requestID=?", ["VirtualDeviceFJSC"]);
                                                             conec.query(mysqli, function(err, rows, fields) {
                                                                 //Se prepara el insert a la base de datos
                                                                 var query = "INSERT INTO bitacora_vd (DateAndTime, dataReceived, vdID) VALUES ?";
                                                                 //Se guarda el request del virtual device en la bitacora como init por ser el primero
                                                                 var vals = [[moment().format('YYYY-MM-DD HH:mm:ss'), VDNewData, rows[0].vdID]];
                                                                 conec.query(query, [vals], function (err, result) {
                                                                     console.log("Bitacora VD cambiada por EU: " + result.affectedRows);
                                                                 });
                                                             });
                                                         }
                                                     } else {
                                                         if (leds.charAt(leds.length - 3) == '1' && (!CHANGE_JSON.change[hw].status)) {
                                                             //Se hacen los cambios para el VD
                                                             VDChanges = true;
                                                             var dataRecibida = rows2[0].dataReceived;
                                                             //Se enciende el LED verde, se apaga el LED rojo, y lo demás se deja en 0
                                                             VDNewData = "020000000000000000000000";
                                                             //Select a la tabla de virtual devices
                                                             var mysqli = mysql.format("SELECT vdID FROM virtualdevices WHERE requestID=?", ["VirtualDeviceFJSC"]);
                                                             conec.query(mysqli, function(err, rows, fields) {
                                                                 //Se prepara el insert a la base de datos
                                                                 var query = "INSERT INTO bitacora_vd (DateAndTime, dataReceived, vdID) VALUES ?";
                                                                 //Se guarda el request del virtual device en la bitacora como init por ser el primero
                                                                 var vals = [[moment().format('YYYY-MM-DD HH:mm:ss'), VDNewData, rows[0].vdID]];
                                                                 conec.query(query, [vals], function (err, result) {
                                                                     console.log("Bitacora VD cambiada por EU: " + result.affectedRows);
                                                                 });
                                                             });
                                                         }
                                                     }
                                                     json_change["status"] = "OK"
                                                     response.setHeader('Content-Type', 'application/json');
                                                     //Se envía el JSON como el response
                                                     response.end(JSON.stringify(json_change));
                                                 }
                                                 else{
                                                     json_change["status"] = "ERROR";
                                                     response.setHeader('Content-Type', 'application/json');
                                                     //Se envía el JSON como el response
                                                     response.end(JSON.stringify(json_change));
                                                 }
                                                //Se prepara la data para insertar en la bitacora de responses
                                                var cconsult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                //Los valores a insertar en la tabla de la bitacora
                                                var cvalus = [[CHANGE_JSON.url, "CHANGE", JSON.stringify(json_change), moment().format('YYYY-MM-DD HH:mm:ss'), result.insertId]];
                                                //Se hace la consulta a la base de datos
                                                conec.query(cconsult, [cvalus], function (err, result1) {
                                                    console.log("Filas insertadas en la tabla de responses: " + result1.affectedRows);
                                                });
                                            }
                                            else if (rows1[0].type == "input") {
                                                json_change["status"] = "ERROR";
                                                response.setHeader('Content-Type', 'application/json');
                                                //Se envía el JSON como el response
                                                response.end(JSON.stringify(json_change));
                                                //Se prepara la data para insertar en la bitacora de responses
                                                var cconsult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                //Los valores a insertar en la tabla de la bitacora
                                                var cvalus = [[CHANGE_JSON.url, "CHANGE", JSON.stringify(json_change), moment().format('YYYY-MM-DD HH:mm:ss'), result.insertId]];
                                                //Se hace la consulta a la base de datos
                                                conec.query(cconsult, [cvalus], function (err, result1) {
                                                    console.log("Filas insertadas en la tabla de responses: " + result1.affectedRows);
                                                });
                                            }
                                    });
                                }
                            });
                        });
                    });

                    } catch (error) {
                        //Se obtiene el JSON enviado en el request
                        let CHANGE_JSON = JSON.parse(cuerpo);
                        var json_change = {
                            id: "MWApp_FernandoSagastume", url: ipAddress,
                            date: (new Date().toISOString()), status: "ERROR"
                        };
                        response.setHeader('Content-Type', 'application/json');
                        //Se envía el JSON como el response
                        response.end(JSON.stringify(json_change));
                        conec.query("SELECT MAX(binnacleID) AS MAXIMO FROM bitacora WHERE url = ? and requestType = ?", [CHANGE_JSON.url, "CHANGE"],
                            function (err, rows, fields) {
                            if (err) throw err;
                                //Se prepara la data para insertar en la bitacora de responses
                                var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                //Los valores a insertar en la tabla de la bitacora
                                var valus = [[CHANGE_JSON.url, "CHANGE", JSON.stringify(json_change), moment().format('YYYY-MM-DD HH:mm:ss'), rows.MAXIMO]];
                                //Se hace la consulta a la base de datos
                                conec.query(consult, [valus], function (err, result1) {
                                    console.log("Filas insertadas en la tabla de responses: " + result1.affectedRows);
                                });
                        });
                        console.error(error.message);
                    }
                });
                break;
            }else{
                break;
            }
        case "/create/":
            if(request.method == 'POST') {
                var cuerpo = '';
                request.on('data', function (data) {
                    cuerpo += data;
                });
                request.on('end', function () {
                    try{
                        //Se obtiene el JSON enviado en el request
                        let EVENT_JSON = JSON.parse(cuerpo);
                        //Se prepara el json para el response
                        var json_event = {
                            id: "MWApp_FernandoSagastume", url: ipAddress,
                            date: (new Date().toISOString()), status: "",
                            idEvent: ""
                        };
                        var json_error = {
                            id: "MWApp_FernandoSagastume", url: ipAddress,
                            date: (new Date().toISOString()), status: "ERROR"
                        };
                        //verifica si se produjo error
                        var errHappened = false;
                        //Select a la tabla de aplicaciones
                        var mysqlQ = mysql.format("SELECT appID FROM aplicaciones WHERE requestID=?", [EVENT_JSON.id]);
                        conec.query(mysqlQ, function(errores, filas, campos) {
                            if(errores)throw errores;
                            //Se prepara la data para insertar en la bitacora
                            var consulta = "INSERT INTO bitacora (channel, url, requestType, body, DateAndTime, appID) VALUES ?";
                            //Se crea un moment
                            var postdate = moment(EVENT_JSON.date);
                            //Se parsea a un formato más entendible
                            var hoy = postdate.format('YYYY-MM-DD HH:mm:ss');
                            //Los valores a insertar en la tabla de la bitacora
                            var values = [["EU", EVENT_JSON.url, "CREATE", JSON.stringify(EVENT_JSON.create), hoy, filas[0].appID]];
                            //Se hace la consulta a la base de datos
                            conec.query(consulta, [values], function (er, resultado) {
                                if (er) throw er;
                                console.log("Filas insertadas en la bitacora: " + resultado.affectedRows);
                                //Condición para Middleware local
                                if (EVENT_JSON.create.if.left.url == ipAddress) {
                                    var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                    conec.query(sqlquery, [EVENT_JSON.create.if.left.id], function (err, rows, fields) {
                                        if (err) throw err;
                                        if (rows.length == 0) {
                                            errHappened = true;
                                            response.setHeader("Content-Type", "application/json");
                                            response.end(JSON.stringify(json_error));
                                            //Se prepara la data para insertar en la bitacora de responses
                                            var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                            //Los valores a insertar en la tabla de la bitacora
                                            var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                            //Se hace la consulta a la base de datos
                                            conec.query(consult, [valus], function (er1, resultado1) {
                                                if(er1) throw er1;
                                                console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                            });
                                        } else {
                                            if (rows[0].type == "input") {
                                                //Se verifica que venga o sensor o texto
                                                if (EVENT_JSON.create.if.right.sensor || EVENT_JSON.create.if.right.text) {
                                                    if (EVENT_JSON.create.then.url == ipAddress) {
                                                        var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                        conec.query(sqlquery, [EVENT_JSON.create.then.id], function (err1, rows1, fields1) {
                                                            if (rows1.length == 0) {
                                                                errHappened = true;
                                                                response.setHeader("Content-Type", "application/json");
                                                                response.end(JSON.stringify(json_error));
                                                                //Se prepara la data para insertar en la bitacora de responses
                                                                var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                //Los valores a insertar en la tabla de la bitacora
                                                                var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                //Se hace la consulta a la base de datos
                                                                conec.query(consult, [valus], function (er1, resultado1) {
                                                                    if(er1) throw er1;
                                                                    console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                });
                                                            } else {
                                                                if (EVENT_JSON.create.else.url == ipAddress) {
                                                                    var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                                    conec.query(sqlquery, [EVENT_JSON.create.else.id], function (err2, rows2, fields2) {
                                                                        if (rows2.length == 0) {
                                                                            errHappened = true;
                                                                            response.setHeader("Content-Type", "application/json");
                                                                            response.end(JSON.stringify(json_error));
                                                                            //Se prepara la data para insertar en la bitacora de responses
                                                                            var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                            //Los valores a insertar en la tabla de la bitacora
                                                                            var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                            //Se hace la consulta a la base de datos
                                                                            conec.query(consult, [valus], function (er1, resultado1) {
                                                                                if(er1) throw er1;
                                                                                console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                            });
                                                                        } else {
                                                                            var sqlquery = "SELECT appID FROM aplicaciones WHERE requestID = ?";
                                                                            conec.query(sqlquery, [EVENT_JSON.id], function (err3, rows3, fields3) {
                                                                                //Se prepara la data para insertar en la tabla de eventos
                                                                                var consulta = "INSERT INTO eventos (url, DateAndTime, ifCond, thenCond, elseCond, appID) VALUES ?";
                                                                                //Se crea un moment
                                                                                var postdate = moment(EVENT_JSON.date);
                                                                                //Se parsea a un formato más entendible
                                                                                var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                                                                //Los valores a insertar en la tabla de eventos
                                                                                var values = [[EVENT_JSON.url, fecha, JSON.stringify(EVENT_JSON.create.if),
                                                                                    JSON.stringify(EVENT_JSON.create.then), JSON.stringify(EVENT_JSON.create.else), rows3[0].appID]];
                                                                                //Se hace la consulta a la base de datos
                                                                                conec.query(consulta, [values], function (err4, result) {
                                                                                    if (err4) throw err4;
                                                                                    if (result.affectedRows) {
                                                                                        console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                                                        json_event["status"] = "OK";
                                                                                        json_event["idEvent"] = (result.insertId).toString();
                                                                                        response.setHeader('Content-type', 'application/json');
                                                                                        response.end(JSON.stringify(json_event));
                                                                                        //Se prepara la data para insertar en la bitacora de responses
                                                                                        var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                                        //Los valores a insertar en la tabla de la bitacora
                                                                                        var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_event), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                                        //Se hace la consulta a la base de datos
                                                                                        conec.query(consult, [valus], function (er1, resultado1) {
                                                                                            if(er1) throw er1;
                                                                                            console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                                        });
                                                                                    } else {
                                                                                        console.log("No se pudo insertar en la DB la data del evento")
                                                                                    }
                                                                                });
                                                                            });
                                                                        }
                                                                    });
                                                                } else {
                                                                    var sqlquery = "SELECT appID FROM aplicaciones WHERE requestID = ?";
                                                                    conec.query(sqlquery, [EVENT_JSON.id], function (err3, rows3, fields3) {
                                                                        //Se prepara la data para insertar en la tabla de eventos
                                                                        var consulta = "INSERT INTO eventos (url, DateAndTime, ifCond, thenCond, elseCond, appID) VALUES ?";
                                                                        //Se crea un moment
                                                                        var postdate = moment(EVENT_JSON.date);
                                                                        //Se parsea a un formato más entendible
                                                                        var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                                                        //Los valores a insertar en la tabla de eventos
                                                                        var values = [[EVENT_JSON.url, fecha, JSON.stringify(EVENT_JSON.create.if),
                                                                            JSON.stringify(EVENT_JSON.create.then), JSON.stringify(EVENT_JSON.create.else), rows3[0].appID]];
                                                                        //Se hace la consulta a la base de datos
                                                                        conec.query(consulta, [values], function (err4, result) {
                                                                            if (err4) throw err4;
                                                                            if (result.affectedRows) {
                                                                                console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                                                json_event["status"] = "OK";
                                                                                json_event["idEvent"] = (result.insertId).toString();
                                                                                response.setHeader('Content-type', 'application/json');
                                                                                response.end(JSON.stringify(json_event));
                                                                                //Se prepara la data para insertar en la bitacora de responses
                                                                                var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                                //Los valores a insertar en la tabla de la bitacora
                                                                                var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_event), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                                //Se hace la consulta a la base de datos
                                                                                conec.query(consult, [valus], function (er1, resultado1) {
                                                                                    if(er1) throw er1;
                                                                                    console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                                });
                                                                            } else {
                                                                                console.log("No se pudo insertar en la DB la data del evento")
                                                                            }
                                                                        });
                                                                    });
                                                                }
                                                            }
                                                        });
                                                    } else if (EVENT_JSON.create.else.url == ipAddress) {
                                                        var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                        conec.query(sqlquery, [EVENT_JSON.create.else.id], function (err2, rows2, fields2) {
                                                            if (rows2.length == 0) {
                                                                errHappened = true;
                                                                response.setHeader("Content-Type", "application/json");
                                                                response.end(JSON.stringify(json_error));
                                                                //Se prepara la data para insertar en la bitacora de responses
                                                                var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                //Los valores a insertar en la tabla de la bitacora
                                                                var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                //Se hace la consulta a la base de datos
                                                                conec.query(consult, [valus], function (er1, resultado1) {
                                                                    if(er1) throw er1;
                                                                    console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                });
                                                            } else {
                                                                var sqlquery = "SELECT appID FROM aplicaciones WHERE requestID = ?";
                                                                conec.query(sqlquery, [EVENT_JSON.id], function (err3, rows3, fields3) {
                                                                    //Se prepara la data para insertar en la tabla de eventos
                                                                    var consulta = "INSERT INTO eventos (url, DateAndTime, ifCond, thenCond, elseCond, appID) VALUES ?";
                                                                    //Se crea un moment
                                                                    var postdate = moment(EVENT_JSON.date);
                                                                    //Se parsea a un formato más entendible
                                                                    var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                                                    //Los valores a insertar en la tabla de eventos
                                                                    var values = [[EVENT_JSON.url, fecha, JSON.stringify(EVENT_JSON.create.if),
                                                                        JSON.stringify(EVENT_JSON.create.then), JSON.stringify(EVENT_JSON.create.else), rows3[0].appID]];
                                                                    //Se hace la consulta a la base de datos
                                                                    conec.query(consulta, [values], function (err4, result) {
                                                                        if (err4) throw err4;
                                                                        if (result.affectedRows) {
                                                                            console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                                            json_event["status"] = "OK";
                                                                            json_event["idEvent"] = (result.insertId).toString();
                                                                            response.setHeader('Content-type', 'application/json');
                                                                            response.end(JSON.stringify(json_event));
                                                                            //Se prepara la data para insertar en la bitacora de responses
                                                                            var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                            //Los valores a insertar en la tabla de la bitacora
                                                                            var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_event), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                            //Se hace la consulta a la base de datos
                                                                            conec.query(consult, [valus], function (er1, resultado1) {
                                                                                if(er1) throw er1;
                                                                                console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                            });
                                                                        } else {
                                                                            console.log("No se pudo insertar en la DB la data del evento")
                                                                        }
                                                                    });
                                                                });
                                                            }
                                                        });
                                                    } else {
                                                        var sqlquery = "SELECT appID FROM aplicaciones WHERE requestID = ?";
                                                        conec.query(sqlquery, [EVENT_JSON.id], function (err3, rows3, fields3) {
                                                            //Se prepara la data para insertar en la tabla de eventos
                                                            var consulta = "INSERT INTO eventos (url, DateAndTime, ifCond, thenCond, elseCond, appID) VALUES ?";
                                                            //Se crea un moment
                                                            var postdate = moment(EVENT_JSON.date);
                                                            //Se parsea a un formato más entendible
                                                            var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                                            //Los valores a insertar en la tabla de eventos
                                                            var values = [[EVENT_JSON.url, fecha, JSON.stringify(EVENT_JSON.create.if),
                                                                JSON.stringify(EVENT_JSON.create.then), JSON.stringify(EVENT_JSON.create.else), rows3[0].appID]];
                                                            //Se hace la consulta a la base de datos
                                                            conec.query(consulta, [values], function (err4, result) {
                                                                if (err4) throw err4;
                                                                if (result.affectedRows) {
                                                                    console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                                    json_event["status"] = "OK";
                                                                    json_event["idEvent"] = (result.insertId).toString();
                                                                    response.setHeader('Content-type', 'application/json');
                                                                    response.end(JSON.stringify(json_event));
                                                                    //Se prepara la data para insertar en la bitacora de responses
                                                                    var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                    //Los valores a insertar en la tabla de la bitacora
                                                                    var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_event), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                    //Se hace la consulta a la base de datos
                                                                    conec.query(consult, [valus], function (er1, resultado1) {
                                                                        if(er1) throw er1;
                                                                        console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                    });
                                                                } else {
                                                                    console.log("No se pudo insertar en la DB la data del evento")
                                                                }
                                                            });
                                                        });
                                                    }
                                                } else {//No vienen datos para el input entonces error
                                                    errHappened = true;
                                                    response.setHeader("Content-Type", "application/json");
                                                    response.end(JSON.stringify(json_error));
                                                    //Se prepara la data para insertar en la bitacora de responses
                                                    var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                    //Los valores a insertar en la tabla de la bitacora
                                                    var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                    //Se hace la consulta a la base de datos
                                                    conec.query(consult, [valus], function (er1, resultado1) {
                                                        if(er1) throw er1;
                                                        console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                    });
                                                }
                                            } else {//output
                                                if (EVENT_JSON.create.then.url == ipAddress) {
                                                    var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                    conec.query(sqlquery, [EVENT_JSON.create.then.id], function (err1, rows1, fields1) {
                                                        if (rows1.length == 0) {
                                                            response.setHeader("Content-Type", "application/json");
                                                            response.end(JSON.stringify(json_error));
                                                            //Se prepara la data para insertar en la bitacora de responses
                                                            var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                            //Los valores a insertar en la tabla de la bitacora
                                                            var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                            //Se hace la consulta a la base de datos
                                                            conec.query(consult, [valus], function (er1, resultado1) {
                                                                if(er1) throw er1;
                                                                console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                            });
                                                        } else {
                                                            if (EVENT_JSON.create.else.url == ipAddress) {
                                                                var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                                conec.query(sqlquery, [EVENT_JSON.create.else.id], function (err2, rows2, fields2) {
                                                                    if (rows2.length == 0) {
                                                                        errHappened = true;
                                                                        response.setHeader("Content-Type", "application/json");
                                                                        response.end(JSON.stringify(json_error));
                                                                        //Se prepara la data para insertar en la bitacora de responses
                                                                        var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                        //Los valores a insertar en la tabla de la bitacora
                                                                        var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                        //Se hace la consulta a la base de datos
                                                                        conec.query(consult, [valus], function (er1, resultado1) {
                                                                            if(er1) throw er1;
                                                                            console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                        });
                                                                    } else {
                                                                        var sqlquery = "SELECT appID FROM aplicaciones WHERE requestID = ?";
                                                                        conec.query(sqlquery, [EVENT_JSON.id], function (err3, rows3, fields3) {
                                                                            //Se prepara la data para insertar en la tabla de eventos
                                                                            var consulta = "INSERT INTO eventos (url, DateAndTime, ifCond, thenCond, elseCond, appID) VALUES ?";
                                                                            //Se crea un moment
                                                                            var postdate = moment(EVENT_JSON.date);
                                                                            //Se parsea a un formato más entendible
                                                                            var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                                                            //Los valores a insertar en la tabla de eventos
                                                                            var values = [[EVENT_JSON.url, fecha, JSON.stringify(EVENT_JSON.create.if),
                                                                                JSON.stringify(EVENT_JSON.create.then), JSON.stringify(EVENT_JSON.create.else), rows3[0].appID]];
                                                                            //Se hace la consulta a la base de datos
                                                                            conec.query(consulta, [values], function (err4, result) {
                                                                                if (err4) throw err4;
                                                                                if (result.affectedRows) {
                                                                                    console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                                                    json_event["status"] = "OK";
                                                                                    json_event["idEvent"] = (result.insertId).toString();
                                                                                    response.setHeader('Content-type', 'application/json');
                                                                                    response.end(JSON.stringify(json_event));
                                                                                    //Se prepara la data para insertar en la bitacora de responses
                                                                                    var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                                    //Los valores a insertar en la tabla de la bitacora
                                                                                    var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_event), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                                    //Se hace la consulta a la base de datos
                                                                                    conec.query(consult, [valus], function (er1, resultado1) {
                                                                                        if(er1) throw er1;
                                                                                        console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                                    });
                                                                                } else {
                                                                                    console.log("No se pudo insertar en la DB la data del evento")
                                                                                }
                                                                            });
                                                                        });
                                                                    }
                                                                });
                                                            } else {
                                                                var sqlquery = "SELECT appID FROM aplicaciones WHERE requestID = ?";
                                                                conec.query(sqlquery, [EVENT_JSON.id], function (err3, rows3, fields3) {
                                                                    //Se prepara la data para insertar en la tabla de eventos
                                                                    var consulta = "INSERT INTO eventos (url, DateAndTime, ifCond, thenCond, elseCond, appID) VALUES ?";
                                                                    //Se crea un moment
                                                                    var postdate = moment(EVENT_JSON.date);
                                                                    //Se parsea a un formato más entendible
                                                                    var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                                                    //Los valores a insertar en la tabla de eventos
                                                                    var values = [[EVENT_JSON.url, fecha, JSON.stringify(EVENT_JSON.create.if),
                                                                        JSON.stringify(EVENT_JSON.create.then), JSON.stringify(EVENT_JSON.create.else), rows3[0].appID]];
                                                                    //Se hace la consulta a la base de datos
                                                                    conec.query(consulta, [values], function (err4, result) {
                                                                        if (err4) throw err4;
                                                                        if (result.affectedRows) {
                                                                            console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                                            json_event["status"] = "OK";
                                                                            json_event["idEvent"] = (result.insertId).toString();
                                                                            response.setHeader('Content-type', 'application/json');
                                                                            response.end(JSON.stringify(json_event));
                                                                            //Se prepara la data para insertar en la bitacora de responses
                                                                            var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                            //Los valores a insertar en la tabla de la bitacora
                                                                            var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_event), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                            //Se hace la consulta a la base de datos
                                                                            conec.query(consult, [valus], function (er1, resultado1) {
                                                                                if(er1) throw er1;
                                                                                console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                            });
                                                                        } else {
                                                                            console.log("No se pudo insertar en la DB la data del evento")
                                                                        }
                                                                    });
                                                                });
                                                            }
                                                        }
                                                    });
                                                } else if (EVENT_JSON.create.else.url == ipAddress) {
                                                    var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                    conec.query(sqlquery, [EVENT_JSON.create.else.id], function (err2, rows2, fields2) {
                                                        if (rows2.length == 0) {
                                                            errHappened = true;
                                                            response.setHeader("Content-Type", "application/json");
                                                            response.end(JSON.stringify(json_error));
                                                            //Se prepara la data para insertar en la bitacora de responses
                                                            var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                            //Los valores a insertar en la tabla de la bitacora
                                                            var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                            //Se hace la consulta a la base de datos
                                                            conec.query(consult, [valus], function (er1, resultado1) {
                                                                if(er1) throw er1;
                                                                console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                            });
                                                        } else {
                                                            var sqlquery = "SELECT appID FROM aplicaciones WHERE requestID = ?";
                                                            conec.query(sqlquery, [EVENT_JSON.id], function (err3, rows3, fields3) {
                                                                //Se prepara la data para insertar en la tabla de eventos
                                                                var consulta = "INSERT INTO eventos (url, DateAndTime, ifCond, thenCond, elseCond, appID) VALUES ?";
                                                                //Se crea un moment
                                                                var postdate = moment(EVENT_JSON.date);
                                                                //Se parsea a un formato más entendible
                                                                var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                                                //Los valores a insertar en la tabla de eventos
                                                                var values = [[EVENT_JSON.url, fecha, JSON.stringify(EVENT_JSON.create.if),
                                                                    JSON.stringify(EVENT_JSON.create.then), JSON.stringify(EVENT_JSON.create.else), rows3[0].appID]];
                                                                //Se hace la consulta a la base de datos
                                                                conec.query(consulta, [values], function (err4, result) {
                                                                    if (err4) throw err4;
                                                                    if (result.affectedRows) {
                                                                        console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                                        json_event["status"] = "OK";
                                                                        json_event["idEvent"] = (result.insertId).toString();
                                                                        response.setHeader('Content-type', 'application/json');
                                                                        response.end(JSON.stringify(json_event));
                                                                        //Se prepara la data para insertar en la bitacora de responses
                                                                        var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                        //Los valores a insertar en la tabla de la bitacora
                                                                        var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_event), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                        //Se hace la consulta a la base de datos
                                                                        conec.query(consult, [valus], function (er1, resultado1) {
                                                                            if(er1) throw er1;
                                                                            console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                        });
                                                                    } else {
                                                                        console.log("No se pudo insertar en la DB la data del evento")
                                                                    }
                                                                });
                                                            });
                                                        }
                                                    });
                                                } else {
                                                    var sqlquery = "SELECT appID FROM aplicaciones WHERE requestID = ?";
                                                    conec.query(sqlquery, [EVENT_JSON.id], function (err3, rows3, fields3) {
                                                        //Se prepara la data para insertar en la tabla de eventos
                                                        var consulta = "INSERT INTO eventos (url, DateAndTime, ifCond, thenCond, elseCond, appID) VALUES ?";
                                                        //Se crea un moment
                                                        var postdate = moment(EVENT_JSON.date);
                                                        //Se parsea a un formato más entendible
                                                        var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                                        //Los valores a insertar en la tabla de eventos
                                                        var values = [[EVENT_JSON.url, fecha, JSON.stringify(EVENT_JSON.create.if),
                                                            JSON.stringify(EVENT_JSON.create.then), JSON.stringify(EVENT_JSON.create.else), rows3[0].appID]];
                                                        //Se hace la consulta a la base de datos
                                                        conec.query(consulta, [values], function (err4, result) {
                                                            if (err4) throw err4;
                                                            if (result.affectedRows) {
                                                                console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                                json_event["status"] = "OK";
                                                                json_event["idEvent"] = (result.insertId).toString();
                                                                response.setHeader('Content-type', 'application/json');
                                                                response.end(JSON.stringify(json_event));
                                                                //Se prepara la data para insertar en la bitacora de responses
                                                                var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                //Los valores a insertar en la tabla de la bitacora
                                                                var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_event), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                //Se hace la consulta a la base de datos
                                                                conec.query(consult, [valus], function (er1, resultado1) {
                                                                    if(er1) throw er1;
                                                                    console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                });
                                                            } else {
                                                                console.log("No se pudo insertar en la DB la data del evento")
                                                            }
                                                        });
                                                    });
                                                }
                                            }
                                        }
                                    });
                                } else {
                                    var sqlquery = "SELECT appID FROM aplicaciones WHERE requestID = ?";
                                    conec.query(sqlquery, [EVENT_JSON.id], function (err3, rows3, fields3) {
                                        //Se prepara la data para insertar en la tabla de eventos
                                        var consulta = "INSERT INTO eventos (url, DateAndTime, ifCond, thenCond, elseCond, appID) VALUES ?";
                                        //Se crea un moment
                                        var postdate = moment(EVENT_JSON.date);
                                        //Se parsea a un formato más entendible
                                        var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                        //Los valores a insertar en la tabla de eventos
                                        var values = [[EVENT_JSON.url, fecha, JSON.stringify(EVENT_JSON.create.if),
                                            JSON.stringify(EVENT_JSON.create.then), JSON.stringify(EVENT_JSON.create.else), rows3[0].appID]];
                                        //Se hace la consulta a la base de datos
                                        conec.query(consulta, [values], function (err4, result) {
                                            if (err4) throw err4;
                                            if (result.affectedRows) {
                                                console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                json_event["status"] = "OK";
                                                json_event["idEvent"] = (result.insertId).toString();
                                                response.setHeader('Content-type', 'application/json');
                                                response.end(JSON.stringify(json_event));
                                                //Se prepara la data para insertar en la bitacora de responses
                                                var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                //Los valores a insertar en la tabla de la bitacora
                                                var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_event), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                //Se hace la consulta a la base de datos
                                                conec.query(consult, [valus], function (er1, resultado1) {
                                                    if(er1) throw er1;
                                                    console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                });
                                            } else {
                                                console.log("No se pudo insertar en la DB la data del evento");
                                                errHappened = true;
                                                response.setHeader('Content-type', 'application/json');
                                                response.end(JSON.stringify(json_error));
                                                //Se prepara la data para insertar en la bitacora de responses
                                                var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                //Los valores a insertar en la tabla de la bitacora
                                                var valus = [[EVENT_JSON.url, "CREATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                //Se hace la consulta a la base de datos
                                                conec.query(consult, [valus], function (er1, resultado1) {
                                                    if(er1) throw er1;
                                                    console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                });
                                            }
                                        });
                                    });
                                }
                            });
                        });
                    }catch (error){
                        console.error(error.message);
                    }
                });
                break;
            }else{
                break;
            }
        case "/update/":
            if(request.method == 'POST') {
                var cuerpo = '';
                request.on('data', function (data) {
                    cuerpo += data;
                });
                request.on('end', function () {
                    try{
                        //Se obtiene el JSON enviado en el request
                        let EVENT_JSON = JSON.parse(cuerpo);
                        //Se prepara el json para el response
                        var json_ok = {
                            id: "MWApp_FernandoSagastume", url: ipAddress,
                            date: (new Date().toISOString()), status: "OK"
                        };
                        var json_error = {
                            id: "MWApp_FernandoSagastume", url: ipAddress,
                            date: (new Date().toISOString()), status: "ERROR"
                        };
                        //verifica si se produjo error
                        var errHappened = false;
                        //Select a la tabla de aplicaciones
                        var mysqlQ = mysql.format("SELECT appID FROM aplicaciones WHERE requestID=?", [EVENT_JSON.id]);
                        conec.query(mysqlQ, function(errores, filas, campos) {
                            if(errores)throw errores;
                            //Se prepara la data para insertar en la bitacora
                            var consulta = "INSERT INTO bitacora (channel, url, requestType, body, DateAndTime, appID) VALUES ?";
                            //Se crea un moment
                            var postdate = moment(EVENT_JSON.date);
                            //Se parsea a un formato más entendible
                            var hoy = postdate.format('YYYY-MM-DD HH:mm:ss');
                            //Los valores para actualizar la tabla de la bitacora
                            var values = [["EU", EVENT_JSON.url, "UPDATE", JSON.stringify(EVENT_JSON.update), hoy, filas[0].appID]];
                            //Se hace la consulta a la base de datos
                            conec.query(consulta, [values], function (er, resultado) {
                                if (er) throw er;
                                console.log("Filas insertadas en la bitacora: " + resultado.affectedRows);
                                conec.query("SELECT * FROM eventos WHERE eventID = ?", [EVENT_JSON.update.id], function (err, rows, fields) {
                                    if(err)throw err;
                                    //Si no existe el dispositivo entonces error
                                    if(rows.length == 0){
                                        response.setHeader("Content-Type", "application/json");
                                        response.end(JSON.stringify(json_error));
                                        //Se prepara la data para insertar en la bitacora de responses
                                        var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                        //Los valores a insertar en la tabla de la bitacora
                                        var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                        //Se hace la consulta a la base de datos
                                        conec.query(consult, [valus], function (er1, resultado1) {
                                            if(er1) throw er1;
                                            console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                        });
                                    }
                                    else{
                                        if (EVENT_JSON.update.if.left.url == ipAddress) {
                                            var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                            conec.query(sqlquery, [EVENT_JSON.update.if.left.id], function (err, rows, fields) {
                                                if (err) throw err;
                                                if (rows.length == 0) {
                                                    errHappened = true;
                                                    response.setHeader("Content-Type", "application/json");
                                                    response.end(JSON.stringify(json_error));
                                                    //Se prepara la data para insertar en la bitacora de responses
                                                    var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                    //Los valores a insertar en la tabla de la bitacora
                                                    var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                    //Se hace la consulta a la base de datos
                                                    conec.query(consult, [valus], function (er1, resultado1) {
                                                        if(er1) throw er1;
                                                        console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                    });
                                                } else {
                                                    if (rows[0].type == "input") {
                                                        //Se verifica que venga o sensor o texto
                                                        if (EVENT_JSON.update.if.right.sensor || EVENT_JSON.update.if.right.text) {
                                                            if (EVENT_JSON.update.then.url == ipAddress) {
                                                                var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                                conec.query(sqlquery, [EVENT_JSON.update.then.id], function (err1, rows1, fields1) {
                                                                    if (rows1.length == 0) {
                                                                        errHappened = true;
                                                                        response.setHeader("Content-Type", "application/json");
                                                                        response.end(JSON.stringify(json_error));
                                                                        //Se prepara la data para insertar en la bitacora de responses
                                                                        var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                        //Los valores a insertar en la tabla de la bitacora
                                                                        var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                        //Se hace la consulta a la base de datos
                                                                        conec.query(consult, [valus], function (er1, resultado1) {
                                                                            if(er1) throw er1;
                                                                            console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                        });
                                                                    } else {
                                                                        if (EVENT_JSON.update.else.url == ipAddress) {
                                                                            var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                                            conec.query(sqlquery, [EVENT_JSON.update.else.id], function (err2, rows2, fields2) {
                                                                                if (rows2.length == 0) {
                                                                                    errHappened = true;
                                                                                    response.setHeader("Content-Type", "application/json");
                                                                                    response.end(JSON.stringify(json_error));
                                                                                    //Se prepara la data para insertar en la bitacora de responses
                                                                                    var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                                    //Los valores a insertar en la tabla de la bitacora
                                                                                    var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                                    //Se hace la consulta a la base de datos
                                                                                    conec.query(consult, [valus], function (er1, resultado1) {
                                                                                        if(er1) throw er1;
                                                                                        console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                                    });
                                                                                } else {
                                                                                        var getEvent = "SELECT * FROM eventos WHERE eventID = ?";
                                                                                        conec.query(getEvent, [EVENT_JSON.update.id], function (getErr, getRows, getFields) {
                                                                                            if(getErr) throw getErr;
                                                                                            conec.query("DELETE FROM eventos WHERE eventID = ?", [EVENT_JSON.update.id],
                                                                                                function (delErr, delRes) {
                                                                                                if(delRes.affectedRows){
                                                                                                    console.log("Se elimino el evento: ", delRes.affectedRows);
                                                                                                    //Se prepara la data para actualizar la tabla de eventos
                                                                                                    var consulta = "INSERT INTO eventos (eventID, url, DateAndTime, ifCond, thenCond, elseCond, appID) VALUES ?";
                                                                                                    //Se crea un moment
                                                                                                    var postdate = moment(EVENT_JSON.date);
                                                                                                    //Se parsea a un formato más entendible
                                                                                                    var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                                                                                    //Los valores a insertar en la tabla de eventos
                                                                                                    var values = [parseInt(EVENT_JSON.update.id), EVENT_JSON.date,
                                                                                                        JSON.stringify(EVENT_JSON.update.if), JSON.stringify(EVENT_JSON.update.then),
                                                                                                        JSON.stringify(EVENT_JSON.update.else), getRows[0].appID];
                                                                                                    //Se hace la consulta a la base de datos
                                                                                                    conec.query(consulta, [values], function (err4, result) {
                                                                                                        if (err4) throw err4;
                                                                                                        if (result.affectedRows) {
                                                                                                            console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                                                                            response.setHeader('Content-type', 'application/json');
                                                                                                            response.end(JSON.stringify(json_ok));
                                                                                                            //Se prepara la data para insertar en la bitacora de responses
                                                                                                            var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                                                            //Los valores a insertar en la tabla de la bitacora
                                                                                                            var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_ok),
                                                                                                                moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                                                            //Se hace la consulta a la base de datos
                                                                                                            conec.query(consult, [valus], function (er1, resultado1) {
                                                                                                                if(er1) throw er1;
                                                                                                                console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                                                            });
                                                                                                        } else {
                                                                                                            console.log("No se pudo insertar en la DB la data del evento")
                                                                                                        }
                                                                                                    });
                                                                                                }else{
                                                                                                    console.error("No se pudo concretar la operación");
                                                                                                }
                                                                                            })
                                                                                        });
                                                                                }
                                                                            });
                                                                        } else {
                                                                            var sqlquery = "SELECT appID FROM aplicaciones WHERE requestID = ?";
                                                                            conec.query(sqlquery, [EVENT_JSON.id], function (err3, rows3, fields3) {
                                                                                //Se prepara la data para actualizar la tabla de eventos
                                                                                var consulta = "UPDATE eventos SET ifCond = ? , thenCond = ? , elseCond = ? WHERE eventID = " + EVENT_JSON.update.id;
                                                                                //Se crea un moment
                                                                                var postdate = moment(EVENT_JSON.date);
                                                                                //Se parsea a un formato más entendible
                                                                                var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                                                                //Los valores a insertar en la tabla de eventos
                                                                                var values = [JSON.stringify(EVENT_JSON.update.if), JSON.stringify(EVENT_JSON.update.then),
                                                                                    JSON.stringify(EVENT_JSON.update.else)];
                                                                                //Se hace la consulta a la base de datos
                                                                                conec.query(consulta, [values], function (err4, result) {
                                                                                    if (err4) throw err4;
                                                                                    if (result.affectedRows) {
                                                                                        console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                                                        response.setHeader('Content-type', 'application/json');
                                                                                        response.end(JSON.stringify(json_ok));
                                                                                        //Se prepara la data para insertar en la bitacora de responses
                                                                                        var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                                        //Los valores a insertar en la tabla de la bitacora
                                                                                        var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_ok), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                                        //Se hace la consulta a la base de datos
                                                                                        conec.query(consult, [valus], function (er1, resultado1) {
                                                                                            if(er1) throw er1;
                                                                                            console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                                        });
                                                                                    } else {
                                                                                        console.log("No se pudo insertar en la DB la data del evento")
                                                                                    }
                                                                                });
                                                                            });
                                                                        }
                                                                    }
                                                                });
                                                            } else if (EVENT_JSON.create.else.url == ipAddress) {
                                                                var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                                conec.query(sqlquery, [EVENT_JSON.create.else.id], function (err2, rows2, fields2) {
                                                                    if (rows2.length == 0) {
                                                                        errHappened = true;
                                                                        response.setHeader("Content-Type", "application/json");
                                                                        response.end(JSON.stringify(json_error));
                                                                        //Se prepara la data para insertar en la bitacora de responses
                                                                        var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                        //Los valores a insertar en la tabla de la bitacora
                                                                        var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                        //Se hace la consulta a la base de datos
                                                                        conec.query(consult, [valus], function (er1, resultado1) {
                                                                            if(er1) throw er1;
                                                                            console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                        });
                                                                    } else {
                                                                        var getEvent = "SELECT * FROM eventos WHERE eventID = ?";
                                                                        conec.query(getEvent, [EVENT_JSON.update.id], function (getErr, getRows, getFields) {
                                                                            if(getErr) throw getErr;
                                                                            conec.query("DELETE FROM eventos WHERE eventID = ?", [EVENT_JSON.update.id],
                                                                                function (delErr, delRes) {
                                                                                    if(delRes.affectedRows){
                                                                                        console.log("Se elimino el evento: ", delRes.affectedRows);
                                                                                        //Se prepara la data para actualizar la tabla de eventos
                                                                                        var consulta = "INSERT INTO eventos (eventID, url, DateAndTime, ifCond, thenCond, elseCond, appID) VALUES ?";
                                                                                        //Se crea un moment
                                                                                        var postdate = moment(EVENT_JSON.date);
                                                                                        //Se parsea a un formato más entendible
                                                                                        var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                                                                        //Los valores a insertar en la tabla de eventos
                                                                                        var values = [parseInt(EVENT_JSON.update.id), EVENT_JSON.date,
                                                                                            JSON.stringify(EVENT_JSON.update.if), JSON.stringify(EVENT_JSON.update.then),
                                                                                            JSON.stringify(EVENT_JSON.update.else), getRows[0].appID];
                                                                                        //Se hace la consulta a la base de datos
                                                                                        conec.query(consulta, [values], function (err4, result) {
                                                                                            if (err4) throw err4;
                                                                                            if (result.affectedRows) {
                                                                                                console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                                                                response.setHeader('Content-type', 'application/json');
                                                                                                response.end(JSON.stringify(json_ok));
                                                                                                //Se prepara la data para insertar en la bitacora de responses
                                                                                                var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                                                //Los valores a insertar en la tabla de la bitacora
                                                                                                var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_ok),
                                                                                                    moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                                                //Se hace la consulta a la base de datos
                                                                                                conec.query(consult, [valus], function (er1, resultado1) {
                                                                                                    if(er1) throw er1;
                                                                                                    console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                                                });
                                                                                            } else {
                                                                                                console.log("No se pudo insertar en la DB la data del evento")
                                                                                            }
                                                                                        });
                                                                                    }else{
                                                                                        console.error("No se pudo concretar la operación");
                                                                                    }
                                                                                })
                                                                        });
                                                                    }
                                                                });
                                                            } else {
                                                                var getEvent = "SELECT * FROM eventos WHERE eventID = ?";
                                                                conec.query(getEvent, [EVENT_JSON.update.id], function (getErr, getRows, getFields) {
                                                                    if(getErr) throw getErr;
                                                                    conec.query("DELETE FROM eventos WHERE eventID = ?", [EVENT_JSON.update.id],
                                                                        function (delErr, delRes) {
                                                                            if(delRes.affectedRows){
                                                                                console.log("Se elimino el evento: ", delRes.affectedRows);
                                                                                //Se prepara la data para actualizar la tabla de eventos
                                                                                var consulta = "INSERT INTO eventos (eventID, url, DateAndTime, ifCond, thenCond, elseCond, appID) VALUES ?";
                                                                                //Se crea un moment
                                                                                var postdate = moment(EVENT_JSON.date);
                                                                                //Se parsea a un formato más entendible
                                                                                var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                                                                //Los valores a insertar en la tabla de eventos
                                                                                var values = [parseInt(EVENT_JSON.update.id), EVENT_JSON.date,
                                                                                    JSON.stringify(EVENT_JSON.update.if), JSON.stringify(EVENT_JSON.update.then),
                                                                                    JSON.stringify(EVENT_JSON.update.else), getRows[0].appID];
                                                                                //Se hace la consulta a la base de datos
                                                                                conec.query(consulta, [values], function (err4, result) {
                                                                                    if (err4) throw err4;
                                                                                    if (result.affectedRows) {
                                                                                        console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                                                        response.setHeader('Content-type', 'application/json');
                                                                                        response.end(JSON.stringify(json_ok));
                                                                                        //Se prepara la data para insertar en la bitacora de responses
                                                                                        var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                                        //Los valores a insertar en la tabla de la bitacora
                                                                                        var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_ok),
                                                                                            moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                                        //Se hace la consulta a la base de datos
                                                                                        conec.query(consult, [valus], function (er1, resultado1) {
                                                                                            if(er1) throw er1;
                                                                                            console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                                        });
                                                                                    } else {
                                                                                        console.log("No se pudo insertar en la DB la data del evento")
                                                                                    }
                                                                                });
                                                                            }else{
                                                                                console.error("No se pudo concretar la operación");
                                                                            }
                                                                        })
                                                                });
                                                            }
                                                        } else {//No vienen datos para el input entonces error
                                                            errHappened = true;
                                                            response.setHeader("Content-Type", "application/json");
                                                            response.end(JSON.stringify(json_error));
                                                            //Se prepara la data para insertar en la bitacora de responses
                                                            var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                            //Los valores a insertar en la tabla de la bitacora
                                                            var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                            //Se hace la consulta a la base de datos
                                                            conec.query(consult, [valus], function (er1, resultado1) {
                                                                if(er1) throw er1;
                                                                console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                            });
                                                        }
                                                    } else {//output
                                                        if (EVENT_JSON.create.then.url == ipAddress) {
                                                            var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                            conec.query(sqlquery, [EVENT_JSON.create.then.id], function (err1, rows1, fields1) {
                                                                if (rows1.length == 0) {
                                                                    response.setHeader("Content-Type", "application/json");
                                                                    response.end(JSON.stringify(json_error));
                                                                    //Se prepara la data para insertar en la bitacora de responses
                                                                    var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                    //Los valores a insertar en la tabla de la bitacora
                                                                    var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                    //Se hace la consulta a la base de datos
                                                                    conec.query(consult, [valus], function (er1, resultado1) {
                                                                        if(er1) throw er1;
                                                                        console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                    });
                                                                } else {
                                                                    if (EVENT_JSON.update.else.url == ipAddress) {
                                                                        var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                                        conec.query(sqlquery, [EVENT_JSON.update.else.id], function (err2, rows2, fields2) {
                                                                            if (rows2.length == 0) {
                                                                                errHappened = true;
                                                                                response.setHeader("Content-Type", "application/json");
                                                                                response.end(JSON.stringify(json_error));
                                                                                //Se prepara la data para insertar en la bitacora de responses
                                                                                var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                                //Los valores a insertar en la tabla de la bitacora
                                                                                var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                                //Se hace la consulta a la base de datos
                                                                                conec.query(consult, [valus], function (er1, resultado1) {
                                                                                    if(er1) throw er1;
                                                                                    console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                                });
                                                                            } else {
                                                                                var getEvent = "SELECT * FROM eventos WHERE eventID = ?";
                                                                                conec.query(getEvent, [EVENT_JSON.update.id], function (getErr, getRows, getFields) {
                                                                                    if(getErr) throw getErr;
                                                                                    conec.query("DELETE FROM eventos WHERE eventID = ?", [EVENT_JSON.update.id],
                                                                                        function (delErr, delRes) {
                                                                                            if(delRes.affectedRows){
                                                                                                console.log("Se elimino el evento: ", delRes.affectedRows);
                                                                                                //Se prepara la data para actualizar la tabla de eventos
                                                                                                var consulta = "INSERT INTO eventos (eventID, url, DateAndTime, ifCond, thenCond, elseCond, appID) VALUES ?";
                                                                                                //Se crea un moment
                                                                                                var postdate = moment(EVENT_JSON.date);
                                                                                                //Se parsea a un formato más entendible
                                                                                                var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                                                                                //Los valores a insertar en la tabla de eventos
                                                                                                var values = [parseInt(EVENT_JSON.update.id), EVENT_JSON.date,
                                                                                                    JSON.stringify(EVENT_JSON.update.if), JSON.stringify(EVENT_JSON.update.then),
                                                                                                    JSON.stringify(EVENT_JSON.update.else), getRows[0].appID];
                                                                                                //Se hace la consulta a la base de datos
                                                                                                conec.query(consulta, [values], function (err4, result) {
                                                                                                    if (err4) throw err4;
                                                                                                    if (result.affectedRows) {
                                                                                                        console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                                                                        response.setHeader('Content-type', 'application/json');
                                                                                                        response.end(JSON.stringify(json_ok));
                                                                                                        //Se prepara la data para insertar en la bitacora de responses
                                                                                                        var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                                                        //Los valores a insertar en la tabla de la bitacora
                                                                                                        var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_ok),
                                                                                                            moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                                                        //Se hace la consulta a la base de datos
                                                                                                        conec.query(consult, [valus], function (er1, resultado1) {
                                                                                                            if(er1) throw er1;
                                                                                                            console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                                                        });
                                                                                                    } else {
                                                                                                        console.log("No se pudo insertar en la DB la data del evento")
                                                                                                    }
                                                                                                });
                                                                                            }else{
                                                                                                console.error("No se pudo concretar la operación");
                                                                                            }
                                                                                        })
                                                                                });
                                                                            }
                                                                        });
                                                                    } else {
                                                                        var getEvent = "SELECT * FROM eventos WHERE eventID = ?";
                                                                        conec.query(getEvent, [EVENT_JSON.update.id], function (getErr, getRows, getFields) {
                                                                            if(getErr) throw getErr;
                                                                            conec.query("DELETE FROM eventos WHERE eventID = ?", [EVENT_JSON.update.id],
                                                                                function (delErr, delRes) {
                                                                                    if(delRes.affectedRows){
                                                                                        console.log("Se elimino el evento: ", delRes.affectedRows);
                                                                                        //Se prepara la data para actualizar la tabla de eventos
                                                                                        var consulta = "INSERT INTO eventos (eventID, url, DateAndTime, ifCond, thenCond, elseCond, appID) VALUES ?";
                                                                                        //Se crea un moment
                                                                                        var postdate = moment(EVENT_JSON.date);
                                                                                        //Se parsea a un formato más entendible
                                                                                        var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                                                                        //Los valores a insertar en la tabla de eventos
                                                                                        var values = [parseInt(EVENT_JSON.update.id), EVENT_JSON.date,
                                                                                            JSON.stringify(EVENT_JSON.update.if), JSON.stringify(EVENT_JSON.update.then),
                                                                                            JSON.stringify(EVENT_JSON.update.else), getRows[0].appID];
                                                                                        //Se hace la consulta a la base de datos
                                                                                        conec.query(consulta, [values], function (err4, result) {
                                                                                            if (err4) throw err4;
                                                                                            if (result.affectedRows) {
                                                                                                console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                                                                response.setHeader('Content-type', 'application/json');
                                                                                                response.end(JSON.stringify(json_ok));
                                                                                                //Se prepara la data para insertar en la bitacora de responses
                                                                                                var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                                                //Los valores a insertar en la tabla de la bitacora
                                                                                                var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_ok),
                                                                                                    moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                                                //Se hace la consulta a la base de datos
                                                                                                conec.query(consult, [valus], function (er1, resultado1) {
                                                                                                    if(er1) throw er1;
                                                                                                    console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                                                });
                                                                                            } else {
                                                                                                console.log("No se pudo insertar en la DB la data del evento")
                                                                                            }
                                                                                        });
                                                                                    }else{
                                                                                        console.error("No se pudo concretar la operación");
                                                                                    }
                                                                                })
                                                                        });
                                                                    }
                                                                }
                                                            });
                                                        } else if (EVENT_JSON.update.else.url == ipAddress) {
                                                            var sqlquery = "SELECT * FROM hardware WHERE id = ?";
                                                            conec.query(sqlquery, [EVENT_JSON.update.else.id], function (err2, rows2, fields2) {
                                                                if (rows2.length == 0) {
                                                                    errHappened = true;
                                                                    response.setHeader("Content-Type", "application/json");
                                                                    response.end(JSON.stringify(json_error));
                                                                    //Se prepara la data para insertar en la bitacora de responses
                                                                    var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                    //Los valores a insertar en la tabla de la bitacora
                                                                    var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                    //Se hace la consulta a la base de datos
                                                                    conec.query(consult, [valus], function (er1, resultado1) {
                                                                        if(er1) throw er1;
                                                                        console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                    });
                                                                } else {
                                                                    var getEvent = "SELECT * FROM eventos WHERE eventID = ?";
                                                                    conec.query(getEvent, [EVENT_JSON.update.id], function (getErr, getRows, getFields) {
                                                                        if(getErr) throw getErr;
                                                                        conec.query("DELETE FROM eventos WHERE eventID = ?", [EVENT_JSON.update.id],
                                                                            function (delErr, delRes) {
                                                                                if(delRes.affectedRows){
                                                                                    console.log("Se elimino el evento: ", delRes.affectedRows);
                                                                                    //Se prepara la data para actualizar la tabla de eventos
                                                                                    var consulta = "INSERT INTO eventos (eventID, url, DateAndTime, ifCond, thenCond, elseCond, appID) VALUES ?";
                                                                                    //Se crea un moment
                                                                                    var postdate = moment(EVENT_JSON.date);
                                                                                    //Se parsea a un formato más entendible
                                                                                    var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                                                                    //Los valores a insertar en la tabla de eventos
                                                                                    var values = [parseInt(EVENT_JSON.update.id), EVENT_JSON.date,
                                                                                        JSON.stringify(EVENT_JSON.update.if), JSON.stringify(EVENT_JSON.update.then),
                                                                                        JSON.stringify(EVENT_JSON.update.else), getRows[0].appID];
                                                                                    //Se hace la consulta a la base de datos
                                                                                    conec.query(consulta, [values], function (err4, result) {
                                                                                        if (err4) throw err4;
                                                                                        if (result.affectedRows) {
                                                                                            console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                                                            response.setHeader('Content-type', 'application/json');
                                                                                            response.end(JSON.stringify(json_ok));
                                                                                            //Se prepara la data para insertar en la bitacora de responses
                                                                                            var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                                            //Los valores a insertar en la tabla de la bitacora
                                                                                            var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_ok),
                                                                                                moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                                            //Se hace la consulta a la base de datos
                                                                                            conec.query(consult, [valus], function (er1, resultado1) {
                                                                                                if(er1) throw er1;
                                                                                                console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                                            });
                                                                                        } else {
                                                                                            console.log("No se pudo insertar en la DB la data del evento")
                                                                                        }
                                                                                    });
                                                                                }else{
                                                                                    console.error("No se pudo concretar la operación");
                                                                                }
                                                                            })
                                                                    });
                                                                }
                                                            });
                                                        } else {
                                                            var getEvent = "SELECT * FROM eventos WHERE eventID = ?";
                                                            conec.query(getEvent, [EVENT_JSON.update.id], function (getErr, getRows, getFields) {
                                                                if(getErr) throw getErr;
                                                                conec.query("DELETE FROM eventos WHERE eventID = ?", [EVENT_JSON.update.id],
                                                                    function (delErr, delRes) {
                                                                        if(delRes.affectedRows){
                                                                            console.log("Se elimino el evento: ", delRes.affectedRows);
                                                                            //Se prepara la data para actualizar la tabla de eventos
                                                                            var consulta = "INSERT INTO eventos (eventID, url, DateAndTime, ifCond, thenCond, elseCond, appID) VALUES ?";
                                                                            //Se crea un moment
                                                                            var postdate = moment(EVENT_JSON.date);
                                                                            //Se parsea a un formato más entendible
                                                                            var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                                                            //Los valores a insertar en la tabla de eventos
                                                                            var values = [parseInt(EVENT_JSON.update.id), EVENT_JSON.date,
                                                                                JSON.stringify(EVENT_JSON.update.if), JSON.stringify(EVENT_JSON.update.then),
                                                                                JSON.stringify(EVENT_JSON.update.else), getRows[0].appID];
                                                                            //Se hace la consulta a la base de datos
                                                                            conec.query(consulta, [values], function (err4, result) {
                                                                                if (err4) throw err4;
                                                                                if (result.affectedRows) {
                                                                                    console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                                                    response.setHeader('Content-type', 'application/json');
                                                                                    response.end(JSON.stringify(json_ok));
                                                                                    //Se prepara la data para insertar en la bitacora de responses
                                                                                    var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                                    //Los valores a insertar en la tabla de la bitacora
                                                                                    var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_ok),
                                                                                        moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                                    //Se hace la consulta a la base de datos
                                                                                    conec.query(consult, [valus], function (er1, resultado1) {
                                                                                        if(er1) throw er1;
                                                                                        console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                                    });
                                                                                } else {
                                                                                    console.log("No se pudo insertar en la DB la data del evento")
                                                                                }
                                                                            });
                                                                        }else{
                                                                            console.error("No se pudo concretar la operación");
                                                                        }
                                                                    })
                                                            });
                                                        }
                                                    }
                                                }
                                            });
                                        } else {
                                            var getEvent = "SELECT * FROM eventos WHERE eventID = ?";
                                            conec.query(getEvent, [EVENT_JSON.update.id], function (getErr, getRows, getFields) {
                                                if(getErr) throw getErr;
                                                conec.query("DELETE FROM eventos WHERE eventID = ?", [EVENT_JSON.update.id],
                                                    function (delErr, delRes) {
                                                        if(delRes.affectedRows){
                                                            console.log("Se elimino el evento: ", delRes.affectedRows);
                                                            //Se prepara la data para actualizar la tabla de eventos
                                                            var consulta = "INSERT INTO eventos (eventID, url, DateAndTime, ifCond, thenCond, elseCond, appID) VALUES ?";
                                                            //Se crea un moment
                                                            var postdate = moment(EVENT_JSON.date);
                                                            //Se parsea a un formato más entendible
                                                            var fecha = postdate.format('YYYY-MM-DD HH:mm:ss');
                                                            //Los valores a insertar en la tabla de eventos
                                                            var values = [parseInt(EVENT_JSON.update.id), EVENT_JSON.date,
                                                                JSON.stringify(EVENT_JSON.update.if), JSON.stringify(EVENT_JSON.update.then),
                                                                JSON.stringify(EVENT_JSON.update.else), getRows[0].appID];
                                                            //Se hace la consulta a la base de datos
                                                            conec.query(consulta, [values], function (err4, result) {
                                                                if (err4) throw err4;
                                                                if (result.affectedRows) {
                                                                    console.log("Evento creado y guardado en la DB: " + result.affectedRows);
                                                                    response.setHeader('Content-type', 'application/json');
                                                                    response.end(JSON.stringify(json_ok));
                                                                    //Se prepara la data para insertar en la bitacora de responses
                                                                    var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                                    //Los valores a insertar en la tabla de la bitacora
                                                                    var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_ok),
                                                                        moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                                    //Se hace la consulta a la base de datos
                                                                    conec.query(consult, [valus], function (er1, resultado1) {
                                                                        if(er1) throw er1;
                                                                        console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                                    });
                                                                } else {
                                                                    console.log("No se pudo insertar en la DB la data del evento")
                                                                }
                                                            });
                                                        }else {
                                                            console.log("No se pudo insertar en la DB la data del evento");
                                                            errHappened = true;
                                                            response.setHeader('Content-type', 'application/json');
                                                            response.end(JSON.stringify(json_error));
                                                            //Se prepara la data para insertar en la bitacora de responses
                                                            var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                                            //Los valores a insertar en la tabla de la bitacora
                                                            var valus = [[EVENT_JSON.url, "UPDATE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                                            //Se hace la consulta a la base de datos
                                                            conec.query(consult, [valus], function (er1, resultado1) {
                                                                if(er1) throw er1;
                                                                console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                                        });
                                                    }
                                                });
                                            });
                                        }
                                    }
                                });
                            });
                        });
                    }
                    catch (error) {
                        console.error(error.message);
                    }
                });
                break;
            }
            else{
                break;
        }
        case "/delete/":
            if(request.method == 'POST') {
                var cuerpo = '';
                request.on('data', function (data) {
                    cuerpo += data;
                });
                request.on('end', function () {
                    try {
                        //Se obtiene el JSON enviado en el request
                        let DELETE_JSON = JSON.parse(cuerpo);
                        //Se prepara el json para el response
                        var json_ok = {
                            id: "MWApp_FernandoSagastume", url: ipAddress,
                            date: (new Date().toISOString()), status: "OK"
                        };
                        var json_error = {
                            id: "MWApp_FernandoSagastume", url: ipAddress,
                            date: (new Date().toISOString()), status: "ERROR"
                        };
                        //Select a la tabla de aplicaciones
                        var mysqlQ = mysql.format("SELECT appID FROM aplicaciones WHERE requestID=?", [DELETE_JSON.id]);
                        conec.query(mysqlQ, function(errores, filas, campos) {
                            if (errores) throw errores;
                            //Se prepara la data para insertar en la bitacora
                            var consulta = "INSERT INTO bitacora (channel, url, requestType, body, DateAndTime, appID) VALUES ?";
                            //Se crea un moment
                            var postdate = moment(DELETE_JSON.date);
                            //Se parsea a un formato más entendible
                            var hoy = postdate.format('YYYY-MM-DD HH:mm:ss');
                            //Los valores para actualizar la tabla de la bitacora
                            var values = [["EU", DELETE_JSON.url, "DELETE", JSON.stringify(DELETE_JSON.delete), hoy, filas[0].appID]];
                            //Se hace la consulta a la base de datos
                            conec.query(consulta, [values], function (er, resultado) {
                                if (er) throw er;
                                console.log("Filas insertadas en la bitacora: " + resultado.affectedRows);
                                //Se verifica que el id del evento exista
                                conec.query("SELECT * FROM eventos WHERE eventID = ?", [DELETE_JSON.delete.id], function (err, rows, fields) {
                                    if (err) throw err;
                                    //No existe ningun evento
                                    if (rows.length == 0) {
                                        response.setHeader("Content-Type", "application/json");
                                        response.end(JSON.stringify(json_error));
                                        //Se prepara la data para insertar en la bitacora de responses
                                        var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                        //Los valores a insertar en la tabla de la bitacora
                                        var valus = [[DELETE_JSON.url, "DELETE", JSON.stringify(json_error), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                        //Se hace la consulta a la base de datos
                                        conec.query(consult, [valus], function (er1, resultado1) {
                                            if (er1) throw er1;
                                            console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                        });
                                    }else{
                                        conec.query("DELETE FROM eventos WHERE eventID = ?", [DELETE_JSON.delete.id], function (error, resul) {
                                            if (error) throw error;
                                            console.log("Fila elimanada en la tabla de eventos: " + resul.affectedRows);
                                            response.setHeader("Content-Type", "application/json");
                                            response.end(JSON.stringify(json_ok));
                                            //Se prepara la data para insertar en la bitacora de responses
                                            var consult = "INSERT INTO bitacora_responses (sentToURL, responseType, body, DateAndTime, binnacleID) VALUES ?";
                                            //Los valores a insertar en la tabla de la bitacora
                                            var valus = [[DELETE_JSON.url, "DELETE", JSON.stringify(json_ok), moment().format('YYYY-MM-DD HH:mm:ss'), resultado.insertId]];
                                            //Se hace la consulta a la base de datos
                                            conec.query(consult, [valus], function (er1, resultado1) {
                                                if (er1) throw er1;
                                                console.log("Filas insertadas en la tabla de responses: " + resultado1.affectedRows);
                                            });
                                        });
                                    }
                                });
                            });
                        });
                    } catch (error) {
                        console.error(error.message);
                    }
                });
                break;
            }
            else{
                break;
            }
        case "/prueba":
            if(request.method == 'POST') {
                var cuerpo = '';
                request.on('data', function (data) {
                    cuerpo += data;
                });
                request.on('end', function () {
                    try {
                        //Se obtiene el JSON enviado en el request
                        let CHANGE_JSON = JSON.parse(cuerpo);
                        //Se obtiene el componente de hw que se desea cambiar
                        var hw = Object.keys(CHANGE_JSON.change)[0];
                        //Se preparan los campos del header de la respuesta
                        response.setHeader('Server',  'CC8');
                        response.setHeader('Access-Control-Allow-Origin', '*');
                        response.setHeader('Content-type', 'text/plain');
                        //Se convierte en bytes los datos que se van a enviar
                        var bytes = Buffer.byteLength(hw, 'utf8');
                        response.setHeader('Content-Length', bytes);
                        //Status code 200: OK
                        response.writeHead(200);
                        response.end(hw);
                        console.log(CHANGE_JSON.change[hw])
                    } catch (error) {
                        console.error(error.message);
                    }
                });
            }
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
            break;
    }
});

server.listen(8081, function(){
    //console.log(new Date('2020-11-06 14:00:00').toISOString());
    //console.log(new Date('2020-11-06 15:00:00').toISOString());
    console.log('Se inició el server a las ' + moment().format('YYYY-MM-DD HH:mm:ss') + ', escuchando el puerto 8081');
});
(async function() {
    try {
        const url = await ngrok.connect(
            {
                proto: 'http',
                addr: 8081
            }
        );
        ipAddress = url;
        console.log("El servidor se esta corriendo en la dirección : " + ipAddress);
    }catch(errorr){
        console.error(errorr);
    }
})();