<?php
$conec = new mysqli("localhost","root","","iotmiddleware");
if($conec->connect_error)die("No se pudo conectar");
mysqli_set_charset($conec, 'utf8');
$consulta = "SELECT * FROM hardware";
$query = $conec->query($consulta) or die($conec->error);
foreach($query as $row){
    echo '<tr>';
    echo '<td>'. $row['id'] .'</td>';
    echo '<td>'. $row['type'] .'</td>';
    echo '<td>'. $row['tag'] .'</td>';
    echo '</tr>';
}
$conec->close();
?>