// Define pins for each note (C through A)
const int NOTE_C = 2;  // Note 1
const int NOTE_D = 3;  // Note 2
const int NOTE_E = 4;  // Note 3
const int NOTE_F = 5;  // Note 4
const int NOTE_G = 6;  // Note 5
const int NOTE_A = 7;  // Note 6

String inputString = "";         // String to hold incoming data
boolean stringComplete = false;  // Whether the string is complete
boolean debugMode = true;       // Enable debug output

void setup() {
  Serial.begin(9600);
  while (!Serial) {
    ; // Wait for serial port to connect
  }
  
  // Configure all note pins
  pinMode(NOTE_C, OUTPUT);
  pinMode(NOTE_D, OUTPUT);
  pinMode(NOTE_E, OUTPUT);
  pinMode(NOTE_F, OUTPUT);
  pinMode(NOTE_G, OUTPUT);
  pinMode(NOTE_A, OUTPUT);

  // Initialize all pins to LOW
  digitalWrite(NOTE_C, LOW);
  digitalWrite(NOTE_D, LOW);
  digitalWrite(NOTE_E, LOW);
  digitalWrite(NOTE_F, LOW);
  digitalWrite(NOTE_G, LOW);
  digitalWrite(NOTE_A, LOW);

  Serial.println("Arduino initialized");
  inputString.reserve(200);
}

void loop() {
  if (stringComplete) {
    if (debugMode) {
      Serial.print("Received data: ");
      Serial.println(inputString);
    }

    // Process the received data
    if (inputString.length() > 0) {
      if (inputString.indexOf('/') != -1) {
        playSong(inputString);
      }
    }

    // Clear the string
    inputString = "";
    stringComplete = false;
  }
}

void serialEvent() {
  while (Serial.available()) {
    char inChar = (char)Serial.read();
    
    // Add character to input string
    if (inChar != '\n' && inChar != '\r') {
      inputString += inChar;
    }
    
    // If newline, set the complete flag
    if (inChar == '\n') {
      stringComplete = true;
    }
  }
}

// Get the corresponding pin for a note number
int getNotePin(int note) {
  switch(note) {
    case 1: return NOTE_C;
    case 2: return NOTE_D;
    case 3: return NOTE_E;
    case 4: return NOTE_F;
    case 5: return NOTE_G;
    case 6: return NOTE_A;
    default: return -1;
  }
}

void playSong(String song) {
  if (debugMode) {
    Serial.println("Starting song playback");
  }

  int index = 0;
  while (index < song.length()) {
    // Find delimiters
    int slashIndex = song.indexOf('/', index);
    if (slashIndex == -1) break;
    
    int dotIndex = song.indexOf('.', slashIndex);
    if (dotIndex == -1) dotIndex = song.length();
    
    // Extract notes and duration
    String notesStr = song.substring(index, slashIndex);
    String durationStr = song.substring(slashIndex + 1, dotIndex);
    
    // Convert duration to integer
    int duration = durationStr.toInt();

    // Parse multiple notes (comma-separated)
    int commaIndex = 0;
    int startPos = 0;
    
    // Activate all notes simultaneously
    while (true) {
      commaIndex = notesStr.indexOf(',', startPos);
      
      // Extract the note number
      String singleNoteStr;
      if (commaIndex == -1) {
        // Last or only note
        singleNoteStr = notesStr.substring(startPos);
      } else {
        // More notes to come
        singleNoteStr = notesStr.substring(startPos, commaIndex);
      }
      
      // Convert to integer and get pin
      int note = singleNoteStr.toInt();
      int pin = getNotePin(note);
      
      if (pin != -1) {
        if (debugMode) {
          Serial.print("Playing note ");
          Serial.print(note);
          Serial.print(" on pin ");
          Serial.print(pin);
        }
        
        // Activate this solenoid
        digitalWrite(pin, HIGH);
      }
      
      // Move to next note or exit loop
      if (commaIndex == -1) break;
      startPos = commaIndex + 1;
    }
    
    // Hold all notes for strike time
    delay(100);
    
    // Deactivate all notes
    for (int i = 1; i <= 6; i++) {
      digitalWrite(getNotePin(i), LOW);
    }
    
    // Wait for the remaining duration
    if (duration > 100) {
      delay(duration - 100);  // Subtract the strike time
    }
    
    if (debugMode) {
      Serial.print(" for ");
      Serial.print(duration);
      Serial.println("ms");
    }
    
    // Move to next note
    index = dotIndex + 1;
  }

  if (debugMode) {
    Serial.println("Song finished");
  }
}
