//Server para recibir request de todos, y enviar los responses
//Se preparan las librerias que se van a utilizar
var http = require('http');
var url = require('url');
var payload = require('request-payload');
var fs = require('fs');

//Función para obtener el tamaño en bytes de un archivo
function getFilesizeInBytes(filename) {
    var stats = fs.statSync(filename)
    var fileSizeInBytes = stats["size"]
    return fileSizeInBytes
};

var server = http.createServer(function(request, response){
    var path = url.parse(request.url).pathname;
    console.log(path);
    switch(path){
        case "/":
            var referrer = request.headers.referer;
            let dataToSend = "FFF000000000000000000000";
            //Se convierte en bytes los datos que se van a enviar
            var bytes = Buffer.byteLength(dataToSend, 'utf8');
            //Se preparan los campos del header de la respuesta
            response.setHeader('Server',  'CC8');
            response.setHeader('Content-Length', bytes);
            response.setHeader('Access-Control-Allow-Origin', '*');
            response.setHeader('Content-type', 'text/plain');
            //Status code 200: OK
            response.writeHead(200);
            //console.log(request.headers);
            //Se obtiene el payload del IOT device (limite máximo del tamaño debe de ser 88 bytes)
            payload(request, {limit: 88}, function(body) {
                console.log('Este es el payload -> ',body);
                //console.log(body.substring(1, 4))
                response.end(dataToSend);
            });
            break;
        case "/index":
            //Se prepara el archivo a ser enviado como respuesta
            var html = fs.readFileSync('./index.html');
            //Se convierte en bytes los datos que se van a enviar
            var bytes = getFilesizeInBytes("index.html");
            //Se preparan los campos del header de la respuesta
            response.setHeader('Server',  'CC8');
            response.setHeader('Content-Length', bytes);
            response.setHeader('Access-Control-Allow-Origin', '*');
            response.setHeader('Content-type', 'text/html');
            //Status code 200: OK
            response.writeHead(200);
            //Se envía el sitio web como respuesta
            response.end(html);
            break;
        case "/style.css":
            //Se prepara el archivo a ser enviado como respuesta
            var html = fs.readFileSync('./style.css');
            //Se convierte en bytes los datos que se van a enviar
            var bytes = getFilesizeInBytes("style.css");
            //Se preparan los campos del header de la respuesta
            response.setHeader('Server',  'CC8');
            response.setHeader('Content-Length', bytes);
            response.setHeader('Access-Control-Allow-Origin', '*');
            response.setHeader('Content-type', 'text/css');
            //Status code 200: OK
            response.writeHead(200);
            //Se envía el sitio web como respuesta
            response.end(html);
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
    console.log('Se inició el server, escuchando el puerto 8081');
});