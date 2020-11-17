<?php
$conec = new mysqli("localhost","root","","iotmiddleware");
if($conec->connect_error)die("No se pudo conectar");
mysqli_set_charset($conec, 'utf8');
$consulta = "SELECT e.url, e.DateAndTime, e.ifCond, e.thenCond, e.elseCond, a.requestID 
			 FROM eventos e JOIN aplicaciones a ON (e.appID = a.appID)";
$query = $conec->query($consulta) or die($conec->error);
foreach($query as $row){
    echo '<tr>';
    echo '<td>'. $row['url'] .'</td>';
    echo '<td>'. $row['DateAndTime'] .'</td>';
    echo '<td>'. $row['ifCond'] .'</td>';
    echo '<td>'. $row['thenCond'] .'</td>';
    echo '<td>'. $row['elseCond'] .'</td>';
    echo '<td>'. $row['requestID'] .'</td>';
    echo '</tr>';
}
$conec->close();
?>