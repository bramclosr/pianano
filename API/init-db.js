const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Initialize database connection
const db = new sqlite3.Database('./music.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
  initializeDatabase();
});

// Initialize database tables and add sample songs
function initializeDatabase() {
  // Drop existing table if it exists
  db.run('DROP TABLE IF EXISTS songs', (err) => {
    if (err) {
      console.error('Error dropping table:', err);
      return;
    }
    
    // Create the songs table
    db.run(`CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      midi_data TEXT,
      nano_address TEXT UNIQUE,
      price_raw TEXT DEFAULT '10000000000000000000000000000000'
    )`, (err) => {
      if (err) {
        console.error('Error creating table:', err);
        return;
      }
      console.log('Database table created successfully');
      
      // Add sample songs
      const songs = [
        {
          name: 'Twinkle Twinkle Little Star',
          midi_data: '1,3/500.1,3/500.5/500.5/500.3,5/500.3,5/500.2,4/1000.1,3/500.1,3/500.5/500.5/500.3,5/500.3,5/500.2,4/1000.5/500.5/500.4,6/500.4,6/500.3/500.3/500.2,5/1000.5/500.5/500.4,6/500.4,6/500.3/500.3/500.2,5/1000',
          nano_address: 'nano_3ajgin81txeajq99mr89mthi9dswx9gsoz4fg3qo17biun545gdq41cb5mfh',
          price_raw: '100000000000000000000000000000'
        },
        {
          name: 'Ode to Joy',
          midi_data: '3/400.3/400.4/400.5/400.5/400.4/400.3/400.2/400.1/400.1/400.2/400.3/400.3,5/400.2,4/800.3/400.3/400.4/400.5/400.5/400.4/400.3/400.2/400.1/400.1/400.2/400.3/400.2,4/400.1,3/800.2/400.2/400.3/400.1/400.2/400.3,5/400.4/400.3/400.1/400.2/400.3,5/400.4/400.3/400.2/400.1/400.2/400.1,3,5/800',
          nano_address: 'nano_1t8mqatzhnungig8gmc8qd57bhjxs9yo8qad88kid11t74g1pu5udkrgio5s',
          price_raw: '100000000000000000000000000000'
        },
        {
          name: 'Fur Elise (Simplified)',
          midi_data: '3/300.2/300.3/300.2/300.3/300.1,5/300.4/300.2/300.1/300.1,3/600.1,3/300.2/300.3/300.2/300.3/300.1,5/300.4/300.2/300.1/300.3,5/600.3/300.4/300.5/300.4/300.3/300.2/300.1,3/300.2/300.3/300.1,4/300.2/300.3/300.2/300.3/300.1,5/300.4/300.2/300.1/300.1,3/600',
          nano_address: 'nano_3e5i4k6qtggbi8n18zawoorim55crowcm5a7o6gkwki55x77mjt6o6ukeetr',
          price_raw: '100000000000000000000000000000'
        }
      ];
      
      // Insert songs into database
      const stmt = db.prepare('INSERT INTO songs (name, midi_data, nano_address, price_raw) VALUES (?, ?, ?, ?)');
      
      songs.forEach((song) => {
        stmt.run(song.name, song.midi_data, song.nano_address, song.price_raw, function(err) {
          if (err) {
            console.error('Error inserting song:', err);
          } else {
            console.log(`Added song: ${song.name} with ID: ${this.lastID}`);
          }
        });
      });
      
      stmt.finalize();
      
      // Close database connection when done
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database initialized successfully');
        }
      });
    });
  });
} 