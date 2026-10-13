CREATE DATABASE IF NOT EXISTS pulse;
USE pulse;

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  woo_id BIGINT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  phone VARCHAR(50),
  total_spent DECIMAL(12,2) DEFAULT 0,
  order_count INT DEFAULT 0,
  last_order_at DATETIME NULL,
  segment VARCHAR(20) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  woo_id BIGINT NOT NULL UNIQUE,
  customer_id INT NOT NULL,
  status VARCHAR(30) NOT NULL,
  total DECIMAL(12,2),
  currency VARCHAR(10),
  items JSON,
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS order_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL,
  at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  order_id INT NULL,
  channel VARCHAR(20) DEFAULT 'email',
  trigger_type VARCHAR(50),
  subject VARCHAR(255),
  body TEXT,
  reason VARCHAR(500),
  ai_generated BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
