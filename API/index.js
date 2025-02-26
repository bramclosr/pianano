const WS = require('ws');
const ReconnectingWebSocket = require('reconnecting-websocket');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const SerialPort = require('serialport');
const cors = require('cors');
const multer = require('multer');
const upload = multer();
const app = express();

// Add SerialPort setup with better error handling and logging
let serialPort = null;
const ARDUINO_PORT = '/dev/tty.usbmodem11301';

// Function to find and connect to Arduino port
async function findAndConnectArduino() {
    console.log('Searching for Arduino ports...');
    
    try {
        const ports = await SerialPort.SerialPort.list();
        console.log('Available ports:', ports);
        
        // Find the Arduino port (looking for both usbmodem and Arduino in manufacturer)
        const arduinoPort = ports.find(port => 
            port.path.toLowerCase().includes('usbmodem') || 
            (port.manufacturer && port.manufacturer.toLowerCase().includes('arduino'))
        );
        
        if (arduinoPort) {
            console.log('Found Arduino port:', arduinoPort.path);
            initializeSerialPort(arduinoPort.path);
        } else {
            console.error('No Arduino port found');
        }
    } catch (err) {
        console.error('Error listing serial ports:', err);
    }
}

// Update the initializeSerialPort function to accept a port parameter
function initializeSerialPort(port = ARDUINO_PORT) {
    console.log('Attempting to connect to Arduino on port:', port);
    
    try {
        serialPort = new SerialPort.SerialPort({
            path: port,
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

// Call findAndConnectArduino instead of initializeSerialPort on startup
findAndConnectArduino();

// Update the reconnection logic
setInterval(() => {
    if (!serialPort || !serialPort.isOpen) {
        console.log('Serial port disconnected, attempting to reconnect...');
        findAndConnectArduino();
    }
}, 5000);

// Configure logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Configure CORS
const corsOptions = {
    origin: [
        'http://localhost:3001',
        'https://pianano.vercel.app', // Add your Vercel domain here
        /\.vercel\.app$/ // This allows all Vercel subdomains
    ],
    methods: ['GET', 'POST'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Initialize monitored addresses Map
const monitoredAddresses = new Map();

// Update the database initialization to set up monitoring
const db = new sqlite3.Database('./music.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to SQLite database');
        // Initialize monitoring for all song addresses
        db.all('SELECT nano_address FROM songs', [], (err, rows) => {
            if (err) {
                console.error('Error fetching addresses:', err);
                return;
            }
            
            console.log('Initializing address monitoring...');
            rows.forEach(row => {
                monitoredAddresses.set(row.nano_address, false);
                // Subscribe to each address if WebSocket is ready
                if (ws.readyState === ws.OPEN) {
                    const subscription = {
                        action: "subscribe",
                        topic: "confirmation",
                        options: {
                            accounts: [row.nano_address]
                        }
                    };
                    console.log('Subscribing to address:', row.nano_address);
                    ws.send(JSON.stringify(subscription));
                }
            });
            console.log('Monitoring addresses:', Array.from(monitoredAddresses.keys()));
        });
    }
});

// Configure Express middleware
app.use(express.json());
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));

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
ws.onmessage = (message) => {
    try {
        const data = JSON.parse(message.data);
        
        if (data.topic === 'confirmation') {
            const block = data.message;
            
            // The sending account
            const senderAccount = block.account;
            
            // For 'send' operations, the recipient is in the link_as_account field
            const recipientAccount = block.block?.link_as_account;
            
            const amount = block.amount;
            
            console.log(`🔔 Transaction detected from ${senderAccount}`);
            console.log(`   Amount: ${amount} raw`);
            
            if (recipientAccount && monitoredAddresses.has(recipientAccount)) {
                console.log(`✅ Payment received to monitored address: ${recipientAccount}`);
                monitoredAddresses.set(recipientAccount, true);
                
                // Record the payment in the database
                db.run('INSERT INTO payments (nano_address, amount) VALUES (?, ?)', 
                    [recipientAccount, amount], 
                    function(err) {
                        if (err) {
                            console.error('Error recording payment:', err);
                        } else {
                            console.log('Payment recorded with ID:', this.lastID);
                        }
                    }
                );
                
                // Find the song associated with this address
                db.get('SELECT midi_data FROM songs WHERE nano_address = ?', [recipientAccount], (err, row) => {
                    if (err) {
                        console.error('Error finding song:', err);
                        return;
                    }
                    
                    if (row) {
                        console.log('Found song, sending to Arduino');
                        sendSongToArduino(row.midi_data);
                    } else {
                        console.error('No song found for address:', recipientAccount);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error processing WebSocket message:', error);
    }
};

// Function to send song data to Arduino
function sendSongToArduino(midiData) {
    if (!serialPort || !serialPort.isOpen) {
        console.error('Serial port not available, cannot send song');
        return;
    }

    console.log('========================');
    console.log('🎹 SENDING SONG TO ARDUINO');
    console.log('Song data:', midiData);
    console.log('========================');
    
    // Add newline character to ensure Arduino receives complete command
    const dataToSend = midiData + '\n';
    
    // Write data with explicit encoding
    serialPort.write(dataToSend, 'utf8', (err) => {
        if (err) {
            console.error('❌ ERROR writing to serial port:', err.message);
        } else {
            console.log('✅ Song data sent successfully to Arduino');
            // Ensure data is flushed to the device
            serialPort.drain((err) => {
                if (err) {
                    console.error('❌ ERROR draining serial port:', err.message);
                } else {
                    console.log('✅ Data successfully flushed to Arduino');
                }
            });
        }
    });
}

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
        
        // Add all song addresses to monitoring
        rows.forEach(song => {
            if (!monitoredAddresses.has(song.nano_address)) {
                monitoredAddresses.set(song.nano_address, false);
                // Subscribe to the address if needed
                if (ws.readyState === ws.OPEN) {
                    const subscription = {
                        action: "subscribe",
                        topic: "confirmation",
                        options: {
                            accounts: [song.nano_address]
                        }
                    };
                    console.log('Subscribing to address:', song.nano_address);
                    ws.send(JSON.stringify(subscription));
                }
            }
        });

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

// Update WebSocket connection handler
ws.onopen = () => {
    console.log('🟢 WebSocket connected!');
    // We'll subscribe to addresses only when needed, not all at once
};

ws.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
};

ws.onclose = (event) => {
    console.log('🔴 WebSocket closed:', event);
};

// Add these new endpoints to the API

// Start monitoring a specific address
app.post('/start-monitoring/:address', (req, res) => {
    const address = req.params.address;
    console.log('Starting monitoring for address:', address);
    
    // Reset payment status to false
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
    
    res.json({ success: true, message: `Started monitoring address: ${address}` });
});

// Stop monitoring a specific address
app.post('/stop-monitoring/:address', (req, res) => {
    const address = req.params.address;
    console.log('Stopping monitoring for address:', address);
    
    // We don't actually unsubscribe from the WebSocket, just mark it as not being actively monitored
    // This is because other users might be monitoring the same address
    
    res.json({ success: true, message: `Stopped active monitoring for address: ${address}` });
});

// Update the payment-status endpoint to be more accurate
app.get('/payment-status/:address', (req, res) => {
    const address = req.params.address;
    console.log('Checking payment status for address:', address);
    
    // Check if we've received payment for this address
    const hasPayment = monitoredAddresses.get(address) === true;
    console.log('Payment status for', address, ':', hasPayment);
    
    res.json({ paid: hasPayment });
});

// Add a new endpoint to get total donations
app.get('/total-donations', (req, res) => {
    // Query the database to count successful payments
    db.all('SELECT COUNT(*) as count FROM payments', [], (err, rows) => {
        if (err) {
            console.error('Error counting payments:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const count = rows[0].count || 0;
        // Each payment is 0.1 Nano
        const totalNano = count * 0.1;
        
        res.json({ 
            total: totalNano,
            count: count
        });
    });
});

// Create a payments table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nano_address TEXT NOT NULL,
    amount TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`, (err) => {
    if (err) {
        console.error('Error creating payments table:', err);
    } else {
        console.log('Payments table ready');
    }
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