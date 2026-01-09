CREATE DATABASE DMS;
USE DMS;
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    document_type VARCHAR(100),
    file_url VARCHAR(500) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    status ENUM('ACTIVE','PENDING_DELETE','PENDING_REPLACE') NOT NULL DEFAULT 'ACTIVE',
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_title (title),
    INDEX idx_status (status)
) ENGINE=InnoDB;
CREATE TABLE document_versions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    version INT NOT NULL,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE KEY uniq_doc_version (document_id, version)
) ENGINE=InnoDB;
CREATE TABLE permission_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT NOT NULL,
    requested_by BIGINT NOT NULL,
    action ENUM('DELETE','REPLACE') NOT NULL,
    status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    resolved_by BIGINT NULL,
    new_file_url VARCHAR(500) NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    message VARCHAR(500) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_read (user_id, is_read)
) ENGINE=InnoDB;

-- This one will be used to change user to admin, since admin cannot register
SELECT * FROM users;
UPDATE users SET role = 'ADMIN' WHERE id = 1;


