<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Bitacora IOTMiddleware</title>
    <link rel="stylesheet" type="text/css" href="style.css">
</head>
<body class="bg">
<div class="container" id="header_bar">
    <div class="menu">
        <ul>
            <li><img src=""></li>
            <a href="index"><li class="bitacora">Bitacora</li></a>
            <a href ="buscar"><li>Buscar</li></a>
            <li>Actualizar</li>
            <li>Eliminar</li>
        </ul>
    </div>
</div>

<h1>Bitacora de los responses</h1>
<table>
<tr>
    <th>URL Sent To</th>
    <th>Response Type</th>
    <th>Body</th>
    <th>Date and Time</th>
    <th>Request ID</th>
    <?php include 'bitacoraResponses.php';?>
</tr>
</table>

<h1>Bitacora de request de las Aplicaciones</h1>
<table>
<tr>
    <th>Request ID</th>
    <th>Channel</th>
    <th>URL</th>
    <th>Request Type</th>
    <th>Body</th>
    <th>Date and Time</th>
    <?php include 'Info.php';?>
</tr>
</table>

<h1>Bitacora de Eventos</h1>
<table>
<tr>
    <th>URL</th>
    <th>Date and Time</th>
    <th>IF</th>
    <th>THEN</th>
    <th>ELSE</th>
    <th>App</th>
    <?php include 'events.php';?>
</tr>
</table>

<h1>Bitacora del IOT Virtual Device</h1>
<table>
<tr>
    <th>Date and Time</th>
    <th>Data Cambiada</th>
    <th>Condición</th>
    <?php include 'bitacoraVD.php';?>
</tr>
</table>

<h1>Tabla Referencia: Componentes del Dispositivo IOT</h1>
<table>
<tr>
    <th>Component ID</th>
    <th>Type</th>
    <th>Tag</th>
    <?php include 'hwReferences.php';?>
</tr>
</table>
</body>
</html>