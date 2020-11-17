<?php
$conec = new mysqli("localhost","root","","iotmiddleware");
if($conec->connect_error)die("No se pudo conectar");
mysqli_set_charset($conec, 'utf8');
$consulta = "SELECT DateAndTime, dataReceived, vdCondition 
			 FROM bitacora_vd";
$query = $conec->query($consulta) or die($conec->error);
foreach($query as $row){
    echo '<tr>';
    echo '<td>'. $row['DateAndTime'] .'</td>';
    echo '<td>'. $row['dataReceived'] .'</td>';
    if($row['vdCondition'] == NULL){
        echo '<td>'. "-" .'</td>';
    }
    else{
        echo '<td>'. $row['vdCondition'] .'</td>';
    }
    echo '</tr>';
}
$conec->close();
?>