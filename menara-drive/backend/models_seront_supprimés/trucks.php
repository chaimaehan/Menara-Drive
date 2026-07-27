<?php
class Camion {
  private $pdo;

  public function __construct($pdo) {
    $this->pdo = $pdo;
  }

  public function getAll() {
    $stmt = $this->pdo->query("
      SELECT camions.*, chauffeurs.nom AS chauffeur_nom
      FROM camions
      LEFT JOIN chauffeurs ON camions.chauffeur_id = chauffeurs.id
      ORDER BY camions.id DESC
    ");
    return $stmt->fetchAll();
  }

  public function create($data) {
    $sql = "INSERT INTO camions (code, capacite, chauffeur_id) VALUES (?, ?, ?)";
    $stmt = $this->pdo->prepare($sql);
    $stmt->execute([
      $data['code'],
      $data['capacite'],
      $data['chauffeur_id']
    ]);
    $data['id'] = $this->pdo->lastInsertId();
    return $data;
  }

  public function update($id, $data) {
    $sql = "UPDATE camions SET code = ?, capacite = ?, chauffeur_id = ? WHERE id = ?";
    $stmt = $this->pdo->prepare($sql);
    return $stmt->execute([
      $data['code'],
      $data['capacite'],
      $data['chauffeur_id'],
      $id
    ]);
  }

  public function delete($id) {
    $stmt = $this->pdo->prepare("DELETE FROM camions WHERE id = ?");
    return $stmt->execute([$id]);
  }
}
