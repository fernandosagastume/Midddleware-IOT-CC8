<?php
$conec = new mysqli("localhost","root","","iotmiddleware");
if($conec->connect_error)die("No se pudo conectar");
mysqli_set_charset($conec, 'utf8');
$consulta = "SELECT br.sentToURL, br.responseType, br.body, br.DateAndTime, a.requestID 
			 FROM bitacora b
			 JOIN bitacora_responses br ON (b.binnacleID = br.binnacleID)
             JOIN aplicaciones a ON (a.appID = b.appID)";
$query = $conec->query($consulta) or die($conec->error);
foreach($query as $row){
    echo '<tr>';
    echo '<td>'. $row['sentToURL'] .'</td>';
    echo '<td>'. $row['responseType'] .'</td>';
    echo '<td>'. $row['body'] .'</td>';
    echo '<td>'. $row['DateAndTime'] .'</td>';
    echo '<td>'. $row['requestID'] .'</td>';
    echo '</tr>';
}
$conec->close();
?>