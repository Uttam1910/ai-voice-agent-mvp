CREATE DATABASE IF NOT EXISTS ai_voice_mvp;
USE ai_voice_mvp;

CREATE TABLE calls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  call_sid VARCHAR(100) UNIQUE,
  phone_number VARCHAR(50),
  recording_url TEXT,
  transcript TEXT,
  interested TINYINT(1),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE whatsapp_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone_number VARCHAR(50),
  message TEXT,
  status VARCHAR(50),
  provider_message_id VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
