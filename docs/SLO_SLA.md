# Service Level Objectives (SLO) & Service Level Agreement (SLA) Matrix

## 1. Distinction Fondamentale

* **SLO (Service Level Objectives)** : Objectifs techniques internes d'ingénierie et de fiabilité mesurés en continu par les métriques Prometheus et les probes d'observabilité.
* **SLA (Service Level Agreement)** : Engagements contractuels formels envers les clients payants (tiers Pro / Enterprise), assortis de crédits de service en cas de non-respect.

---

## 2. Matrice des Objectifs Internes (SLO)

| Indicateur (SLI) | Objectif Interne (SLO) | Période de Mesure | Mécanisme de Surveillance |
| :--- | :--- | :--- | :--- |
| **Disponibilité API Globale** | **99.9 %** | 30 jours glissants | `/health/live`, `/health/ready`, `http_requests_total` |
| **Latence p50 (CRUD/Metadata)** | **< 35 ms** | 1 heure | `http_request_duration_seconds{quantile="0.5"}` |
| **Latence p95 (CRUD/Metadata)** | **< 120 ms** | 1 heure | `http_request_duration_seconds{quantile="0.95"}` |
| **Latence p99 (CRUD/Metadata)** | **< 450 ms** | 1 heure | `http_request_duration_seconds{quantile="0.99"}` |
| **Latence p95 (Génération IA)** | **< 3.5 s** | 24 heures | `ai_request_duration_seconds` |
| **Taux d'erreur 5xx** | **< 0.1 %** | 24 heures | `http_errors_total / http_requests_total` |
| **Taux de succès des Jobs en Queue** | **> 99.5 %** | 7 jours | `jobs_total` vs `jobs_failed` / `jobs_dead_letter` |
| **Idempotence Strict Replay** | **100.0 %** (zéro double facturation) | Continu | `X-Idempotency-Key` + SHA-256 hash |
| **Temps de Récupération (RTO)** | **< 30 secondes** | Par incident | Watchdog + Auto-recovery crash pool |
| **Perte de Données Maximale (RPO)**| **0 transaction (RPO = 0)** | Par incident | Transactions ACID avec commit atomique |

---

## 3. Matrice d'Engagement Client (SLA)

| Tier d'Abonnement | Disponibilité Garantie (SLA) | Temps de Réponse Support | Pénalités / Crédits de Service |
| :--- | :--- | :--- | :--- |
| **Starter (Gratuit)** | *Meilleur effort (Best Effort, aucun SLA garanti)* | Communauté / 48h | Aucun crédit |
| **Pro Creator (19 €/m)** | **99.5 % de disponibilité mensuelle** | < 12 heures ouvrées | 10% de crédit si < 99.5%, 25% si < 99.0% |
| **Enterprise Studio (99 €/m)**| **99.9 % de disponibilité mensuelle** | < 1 heure (24/7) | 20% de crédit si < 99.9%, 50% si < 98.5% |

---

## 4. Exclusions de SLA

Les événements suivants ne sont pas imputables à la disponibilité de la plateforme :
1. Pannes globales des infrastructures Cloud sous-jacentes (ex: incident majeur GCP/AWS région complète).
2. Indisponibilité totale déclarée par le fournisseur d'API d'IA tiers si tous les circuits de repli ont été engagés de manière transparente.
3. Attaques volumétriques DDoS dépassant les capacités de mitigation réseau déclarées.
