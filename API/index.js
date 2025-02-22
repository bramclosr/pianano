const WS = require('ws');
const ReconnectingWebSocket = require('reconnecting-websocket');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const SerialPort = require('serialport');
const cors = require('cors');
const multer = require('multer');
const upload = multer();
const app = express();

// Add the TEST_NANO_ADDRESS constant
const TEST_NANO_ADDRESS = 'nano_3uct7fjjxg87ccg3n6dtx51hk7ekjkz79ihd7pdsasp6qzo9pim6fcy1jh66';

// Add SerialPort setup with better error handling and logging
let serialPort = null;
const ARDUINO_PORT = '/dev/cu.usbmodem1301';

// Function to initialize serial port
function initializeSerialPort() {
    console.log('Attempting to connect to Arduino on port:', ARDUINO_PORT);
    
    try {
        serialPort = new SerialPort.SerialPort({
            path: ARDUINO_PORT,
            baudRate: 9600,
            autoOpen: false // Don't open automatically
        });

        // Setup event handlers before opening
        serialPort.on('error', (err) => {
            console.error('Serial Port Error:', err.message);
        });

        serialPort.on('open', () => {
            console.log('Serial port opened successfully');
            // Send a test message
            setTimeout(() => {
                console.log('Sending test signal...');
                serialPort.write('h', (err) => {
                    if (err) {
                        console.error('Test signal failed:', err.message);
                    } else {
                        console.log('Test signal sent successfully');
                    }
                });
            }, 1000);
        });

        serialPort.on('data', (data) => {
            console.log('Received from Arduino:', data.toString().trim());
        });

        // Now try to open the port
        serialPort.open((err) => {
            if (err) {
                console.error('Failed to open serial port:', err.message);
                // List available ports for debugging
                SerialPort.SerialPort.list().then(ports => {
                    console.log('Available ports:');
                    ports.forEach(port => {
                        console.log(port.path, port.manufacturer || 'unknown manufacturer');
                    });
                });
            } else {
                console.log('Serial port opened successfully');
            }
        });

    } catch (err) {
        console.error('Error creating serial port:', err);
    }
}

// Function to trigger the solenoid with better error handling
function triggerSolenoid() {
    if (!serialPort) {
        console.error('Serial port not initialized');
        initializeSerialPort(); // Try to initialize
        return;
    }

    if (!serialPort.isOpen) {
        console.error('Serial port not open');
        serialPort.open((err) => {
            if (err) {
                console.error('Failed to reopen serial port:', err.message);
            }
        });
        return;
    }

    console.log('Triggering solenoid...');
    serialPort.write('h', (err) => {
        if (err) {
            console.error('Error writing to serial port:', err.message);
        } else {
            console.log('Successfully sent trigger signal to Arduino');
        }
    });
}

// Initialize serial port on startup
initializeSerialPort();

// Add reconnection logic
setInterval(() => {
    if (!serialPort || !serialPort.isOpen) {
        console.log('Serial port disconnected, attempting to reconnect...');
        initializeSerialPort();
    }
}, 5000);

// Configure logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? 'https://your-frontend-domain.com'
        : 'http://localhost:3001',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
};

// Initialize database connection
const db = new sqlite3.Database('./music.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables if they don't exist
function initializeDatabase() {
    // Fixed SQL syntax by removing comment and using proper default value
    db.run(`CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        midi_data BLOB,
        nano_address TEXT UNIQUE,
        price_raw TEXT DEFAULT '100000000000000000000000000000'
    )`, (err) => {
        if (err) {
            console.error('Error creating table:', err);
        } else {
            console.log('Database table initialized successfully');
        }
    });
}

// Configure Express middleware
app.use(express.json());
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));

// Initialize WebSocket monitoring system
const monitoredAddresses = new Map();

// Add the test address to monitoring on startup
monitoredAddresses.set(TEST_NANO_ADDRESS, false);

// Create a reconnecting WebSocket to the public node
const ws = new ReconnectingWebSocket('wss://node.somenano.com/websocket', [], {
    WebSocket: WS,
    connectionTimeout: 1000,    
    maxRetries: 100000,
    maxReconnectionDelay: 2000,
    minReconnectionDelay: 10,
    reconnectionDelayGrowFactor: 1.3,
});

// WebSocket message handling
ws.onmessage = msg => {
    try {
        const data = JSON.parse(msg.data);
        console.log('WebSocket message received:', data);
        
        if (data.topic === "confirmation") {
            const block = data.message;
            console.log('Block received:', block);
            
            if (block.block && block.block.link_as_account === TEST_NANO_ADDRESS) {
                console.log('Payment received for monitored address:', block.block.link_as_account);
                console.log('Amount received:', block.amount);
                
                // Trigger the solenoid with retry logic
                console.log('Triggering solenoid for payment...');
                triggerSolenoid();
                
                // Update payment status in memory
                monitoredAddresses.set(TEST_NANO_ADDRESS, true);
                console.log('Updated payment status for address:', TEST_NANO_ADDRESS);
            }
        }
    } catch (error) {
        console.error('Error processing WebSocket message:', error);
    }
};

// API Endpoints

// Get list of available songs
app.get('/songs', (req, res) => {
    console.log('Fetching all songs');
    db.all('SELECT id, name, nano_address, price_raw FROM songs ORDER BY name', [], (err, rows) => {
        if (err) {
            console.error('Error fetching songs:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Ensure we're monitoring the test address
        if (!monitoredAddresses.has(TEST_NANO_ADDRESS)) {
            monitoredAddresses.set(TEST_NANO_ADDRESS, false);
            // Subscribe to the address if needed
            if (ws.readyState === ws.OPEN) {
                const subscription = {
                    action: "subscribe",
                    topic: "confirmation",
                    options: {
                        accounts: [TEST_NANO_ADDRESS]
                    }
                };
                console.log('Subscribing to test address:', TEST_NANO_ADDRESS);
                ws.send(JSON.stringify(subscription));
            }
        }

        console.log(`Retrieved ${rows.length} songs`);
        console.log('Currently monitored addresses:', Array.from(monitoredAddresses.keys()));
        res.json(rows);
    });
});

// Get specific song details
app.get('/songs/:id', (req, res) => {
    console.log('Fetching song with ID:', req.params.id);
    db.get('SELECT id, name, nano_address, price_raw FROM songs WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            console.error('Error fetching song:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            console.log('Song not found:', req.params.id);
            res.status(404).json({ error: 'Song not found' });
            return;
        }
        console.log('Song found:', row.name);
        res.json(row);
    });
});

// Add new song with MIDI data
app.post('/songs', upload.single('midi_data'), (req, res) => {
    console.log('Received upload request:', {
        body: req.body,
        file: req.file ? {
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        } : 'No file'
    });

    // Generate default values if not provided
    const name = req.body.name;
    const nano_address = req.body.nano_address || 'nano_' + Math.random().toString(36).substr(2, 32);
    const price_raw = req.body.price_raw || '100000000000000000000000000000';
    const midi_data = req.file ? req.file.buffer : null;

    // Validate required fields
    if (!name) {
        console.error('Missing song name');
        return res.status(400).json({ error: 'Song name is required' });
    }

    if (!midi_data) {
        console.error('Missing MIDI file');
        return res.status(400).json({ error: 'MIDI file is required' });
    }

    console.log('Attempting to insert song:', {
        name,
        nano_address,
        price_raw,
        midi_data_size: midi_data.length
    });

    db.run(
        'INSERT INTO songs (name, midi_data, nano_address, price_raw) VALUES (?, ?, ?, ?)',
        [name, midi_data, nano_address, price_raw],
        function(err) {
            if (err) {
                console.error('Error adding song:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            
            console.log('Song added successfully:', {
                id: this.lastID,
                name: name
            });

            monitorPaymentForAddress(nano_address, midi_data);
            
            res.json({
                id: this.lastID,
                message: "Song added successfully",
                name: name
            });
        }
    );
});

// Monitor payment for an address and trigger MIDI playback
function monitorPaymentForAddress(address, midiData) {
    console.log('Starting payment monitoring for address:', address);
    
    // Initialize the address in our monitoring map
    monitoredAddresses.set(address, false);
    
    // Subscribe to the address
    if (ws.readyState === ws.OPEN) {
        const subscription = {
            action: "subscribe",
            topic: "confirmation",
            options: {
                accounts: [address]
            }
        };
        console.log('Subscribing to address:', address);
        ws.send(JSON.stringify(subscription));
    }
}

// Placeholder for USB MIDI output
function sendMidiToUSB(midiData) {
    console.log('Attempting to send MIDI data to USB device');
    // Implementation will depend on your specific USB MIDI device
    console.log('MIDI data:', midiData);
}

// WebSocket connection management
ws.onopen = () => {
    console.log('🟢 WebSocket connected!');
    
    // Subscribe to the test address immediately
    const subscription = {
        action: "subscribe",
        topic: "confirmation",
        options: {
            accounts: [TEST_NANO_ADDRESS]
        }
    };
    console.log('Subscribing to test address:', TEST_NANO_ADDRESS);
    ws.send(JSON.stringify(subscription));
};

ws.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
};

ws.onclose = (event) => {
    console.log('🔴 WebSocket closed:', event);
};

// Add this endpoint to check payment status
app.get('/payment-status/:address', (req, res) => {
    const address = req.params.address;
    console.log('Checking payment status for address:', address);
    console.log('Current monitored addresses:', Array.from(monitoredAddresses.entries()));
    
    // Check if we've received payment for this address
    const hasPayment = monitoredAddresses.get(address) === true;
    console.log('Payment status:', hasPayment);
    
    res.json({ paid: hasPayment });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});