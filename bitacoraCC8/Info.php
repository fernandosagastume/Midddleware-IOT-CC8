<?php
$conec = new mysqli("localhost","root","","iotmiddleware");
if($conec->connect_error)die("No se pudo conectar");
mysqli_set_charset($conec, 'utf8');
$consulta = "SELECT a.requestID, b.channel, b.url, b.requestType, b.body, b.DateAndTime 
			 FROM aplicaciones a
			 JOIN bitacora b ON (a.appID = b.appID)";
$query = $conec->query($consulta) or die($conec->error);
foreach($query as $row){
    echo '<tr>';
    echo '<td>'. $row['requestID'] .'</td>';
    echo '<td>'. $row['channel'] .'</td>';
    echo '<td>'. $row['url'] .'</td>';
    echo '<td>'. $row['requestType'] .'</td>';
    if($row['body'] != NULL){
    	echo '<td>'. $row['body'] .'</td>';
    }else{
    	echo '<td>'. '-' .'</td>';
    }
    echo '<td>'. $row['DateAndTime'] .'</td>';
    echo '</tr>';
}
$conec->close();
?>