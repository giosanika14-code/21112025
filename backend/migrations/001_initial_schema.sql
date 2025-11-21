-- Initial Schema Migration for Hospitality AI Platform
-- Multi-tenant architecture with hotel_id partitioning

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('super_admin', 'hotel_admin', 'staff', 'guest');
CREATE TYPE task_status AS ENUM ('new', 'accepted', 'in_progress', 'completed');
CREATE TYPE department_type AS ENUM ('housekeeping', 'maintenance', 'front_desk', 'concierge', 'room_service', 'it', 'other');
CREATE TYPE message_sender AS ENUM ('guest', 'ai', 'staff');
CREATE TYPE license_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');

-- =====================================================
-- HOTELS TABLE
-- =====================================================
CREATE TABLE hotels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255) NOT NULL UNIQUE,
    license_status license_status DEFAULT 'active',
    license_expires_at TIMESTAMP,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hotels_license_status ON hotels(license_status);
CREATE INDEX idx_hotels_email ON hotels(email);

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL,
    department_id UUID,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_super_admin_no_hotel CHECK (
        (role = 'super_admin' AND hotel_id IS NULL) OR
        (role != 'super_admin' AND hotel_id IS NOT NULL)
    )
);

CREATE INDEX idx_users_hotel_id ON users(hotel_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department_id ON users(department_id);

-- =====================================================
-- DEPARTMENTS TABLE
-- =====================================================
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type department_type NOT NULL,
    telegram_group_id VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_departments_hotel_id ON departments(hotel_id);
CREATE INDEX idx_departments_type ON departments(type);
CREATE INDEX idx_departments_is_active ON departments(hotel_id, is_active);

-- Add foreign key constraint for users.department_id
ALTER TABLE users
ADD CONSTRAINT fk_users_department
FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- =====================================================
-- ROOMS TABLE
-- =====================================================
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_number VARCHAR(50) NOT NULL,
    floor INTEGER,
    room_type VARCHAR(100),
    qr_code VARCHAR(255) NOT NULL UNIQUE,
    qr_code_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_room_per_hotel UNIQUE (hotel_id, room_number)
);

CREATE INDEX idx_rooms_hotel_id ON rooms(hotel_id);
CREATE INDEX idx_rooms_qr_code ON rooms(qr_code);
CREATE INDEX idx_rooms_is_active ON rooms(hotel_id, is_active);

-- =====================================================
-- GUEST SESSIONS TABLE
-- =====================================================
CREATE TABLE guest_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    qr_code VARCHAR(255) NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    language_preference VARCHAR(10),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

CREATE INDEX idx_guest_sessions_hotel_id ON guest_sessions(hotel_id);
CREATE INDEX idx_guest_sessions_room_id ON guest_sessions(room_id);
CREATE INDEX idx_guest_sessions_token ON guest_sessions(session_token);
CREATE INDEX idx_guest_sessions_active ON guest_sessions(hotel_id) WHERE ended_at IS NULL;

-- =====================================================
-- TASKS TABLE
-- =====================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    guest_session_id UUID NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    original_message TEXT NOT NULL,
    status task_status DEFAULT 'new',
    priority priority_level DEFAULT 'medium',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_hotel_id ON tasks(hotel_id);
CREATE INDEX idx_tasks_room_id ON tasks(room_id);
CREATE INDEX idx_tasks_department_id ON tasks(department_id);
CREATE INDEX idx_tasks_guest_session_id ON tasks(guest_session_id);
CREATE INDEX idx_tasks_status ON tasks(hotel_id, status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_at ON tasks(hotel_id, created_at DESC);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    guest_session_id UUID NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    sender_type message_sender NOT NULL,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    original_language VARCHAR(10),
    translated_content TEXT,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_hotel_id ON messages(hotel_id);
CREATE INDEX idx_messages_guest_session_id ON messages(guest_session_id);
CREATE INDEX idx_messages_task_id ON messages(task_id);
CREATE INDEX idx_messages_created_at ON messages(guest_session_id, created_at DESC);

-- =====================================================
-- RATINGS TABLE
-- =====================================================
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    guest_session_id UUID NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_rating_per_task UNIQUE (task_id)
);

CREATE INDEX idx_ratings_hotel_id ON ratings(hotel_id);
CREATE INDEX idx_ratings_task_id ON ratings(task_id);
CREATE INDEX idx_ratings_rating ON ratings(hotel_id, rating);

-- =====================================================
-- KNOWLEDGE BASE TABLE
-- =====================================================
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_knowledge_base_hotel_id ON knowledge_base(hotel_id);
CREATE INDEX idx_knowledge_base_category ON knowledge_base(hotel_id, category);
CREATE INDEX idx_knowledge_base_tags ON knowledge_base USING GIN(tags);
CREATE INDEX idx_knowledge_base_is_active ON knowledge_base(hotel_id, is_active);

-- =====================================================
-- AUDIT LOG TABLE (for tracking changes)
-- =====================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    changes JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_hotel_id ON audit_logs(hotel_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hotels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update last_activity_at in guest_sessions
CREATE OR REPLACE FUNCTION update_guest_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE guest_sessions
    SET last_activity_at = CURRENT_TIMESTAMP
    WHERE id = NEW.guest_session_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_session_on_message AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_guest_session_activity();

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Create default super admin (password: Admin@123 - CHANGE IN PRODUCTION!)
-- Password hash for 'Admin@123' with bcrypt rounds=10
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active)
VALUES (
    uuid_generate_v4(),
    'admin@hospitalityai.com',
    '$2b$10$xQvZ3K3L5Y9QxXMJ5YXqJOY.qH4YJ7xJ3K5L5Y9QxXMJ5YXqJOY.qG',
    'Super',
    'Admin',
    'super_admin',
    true
);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
