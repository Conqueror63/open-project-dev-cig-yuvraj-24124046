CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'photographer', 'member', 'viewer')) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  access TEXT CHECK (access IN ('public', 'private')) DEFAULT 'public',
  cover_color TEXT,
  cover_image TEXT,
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE media_items (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  name TEXT NOT NULL,
  description TEXT,
  caption TEXT,
  media_type TEXT CHECK (media_type IN ('photo', 'video')) NOT NULL,
  visibility TEXT CHECK (visibility IN ('public', 'private')) DEFAULT 'public',
  storage_provider TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  size_bytes INTEGER,
  uploaded_by TEXT REFERENCES users(id),
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE media_tags (
  media_id TEXT REFERENCES media_items(id),
  tag TEXT NOT NULL,
  confidence REAL DEFAULT 0.80,
  PRIMARY KEY (media_id, tag)
);

CREATE TABLE likes (
  media_id TEXT REFERENCES media_items(id),
  user_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (media_id, user_id)
);

CREATE TABLE favourites (
  media_id TEXT REFERENCES media_items(id),
  user_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (media_id, user_id)
);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  media_id TEXT REFERENCES media_items(id),
  user_id TEXT REFERENCES users(id),
  body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_tags (
  media_id TEXT REFERENCES media_items(id),
  tagged_user_id TEXT REFERENCES users(id),
  tagged_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (media_id, tagged_user_id)
);

CREATE TABLE face_references (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  reference_storage_key TEXT NOT NULL,
  face_embedding_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
