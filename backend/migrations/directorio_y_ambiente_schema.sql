-- =========================================================================
-- Script SQL: Módulo 10 (Monitoreo Ambiental) y Módulo 11 (Directorio de Dermatólogos)
-- Proyecto: Skinova
-- =========================================================================

-- 1. Preferencias ambientales del usuario (RF-AMB-01, RF-AMB-02, RF-AMB-10)
CREATE TABLE IF NOT EXISTS `user_environmental_preferences` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `use_location` tinyint(1) NOT NULL DEFAULT 0,
  `city_name` varchar(150) NOT NULL DEFAULT 'León, Gto',
  `latitude` float DEFAULT NULL,
  `longitude` float DEFAULT NULL,
  `sync_with_routine` tinyint(1) NOT NULL DEFAULT 1,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_user_environmental_preferences_user_id` (`user_id`),
  CONSTRAINT `fk_user_env_pref_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Caché de condiciones climáticas y recomendaciones de IA (RF-AMB-03 al 09, 11, 12)
CREATE TABLE IF NOT EXISTS `environmental_snapshots` (
  `id` varchar(36) NOT NULL,
  `city_name` varchar(150) NOT NULL,
  `latitude` float DEFAULT NULL,
  `longitude` float DEFAULT NULL,
  `temperature` float NOT NULL,
  `feels_like` float NOT NULL,
  `condition` varchar(100) NOT NULL,
  `humidity` int NOT NULL,
  `humidity_status` varchar(80) NOT NULL,
  `uv_index` float NOT NULL,
  `uv_level` varchar(50) NOT NULL,
  `is_high_uv` tinyint(1) NOT NULL DEFAULT 0,
  `air_quality_index` int DEFAULT NULL,
  `air_quality_status` varchar(80) DEFAULT NULL,
  `wind_speed` float DEFAULT NULL,
  `ai_summary` text,
  `ai_tips` json DEFAULT NULL,
  `provider` varchar(50) NOT NULL DEFAULT 'open-meteo',
  `is_fallback` tinyint(1) NOT NULL DEFAULT 0,
  `recorded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_environmental_snapshots_expires_at` (`expires_at`),
  KEY `ix_environmental_snapshots_city_name` (`city_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Catálogo de especialistas dermatológicos (RF-DER-02 al RF-DER-10)
CREATE TABLE IF NOT EXISTS `dermatologists` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `specialty` varchar(255) NOT NULL,
  `license_number` varchar(255) DEFAULT NULL,
  `clinic` varchar(255) DEFAULT NULL,
  `address` text NOT NULL,
  `city` varchar(100) NOT NULL DEFAULT 'León',
  `state` varchar(100) NOT NULL DEFAULT 'Guanajuato',
  `latitude` float NOT NULL,
  `longitude` float NOT NULL,
  `care_type` varchar(30) NOT NULL DEFAULT 'ambos',
  `care_label` varchar(80) NOT NULL DEFAULT 'Presencial y En línea',
  `rating` float NOT NULL DEFAULT 4.9,
  `reviews_count` int NOT NULL DEFAULT 0,
  `focus_areas` json DEFAULT NULL,
  `schedule` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `booking_platform` varchar(100) DEFAULT NULL,
  `booking_url` varchar(500) DEFAULT NULL,
  `map_query` varchar(255) DEFAULT NULL,
  `pin_coords` json DEFAULT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Dermatólogos favoritos del usuario (RF-DER-11)
CREATE TABLE IF NOT EXISTS `favorite_dermatologists` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `external_id` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `address` text,
  `phone` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uix_user_dermatologist` (`user_id`,`external_id`),
  CONSTRAINT `fk_fav_derma_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
