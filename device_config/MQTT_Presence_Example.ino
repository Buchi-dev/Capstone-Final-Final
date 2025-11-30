/*
 * MQTT Presence Detection Example for ESP32/Water Quality Monitors
 * This shows how devices should respond to presence queries
 *
 * Topics used:
 * - presence/query (server asks "who is online?")
 * - presence/response (devices respond "I'm online")
 * - devices/{deviceId}/presence (retained presence status)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// MQTT Configuration
#define MQTT_BROKER "your-mqtt-broker.com"
#define MQTT_PORT 8883
#define DEVICE_ID "esp32_device_001"

// MQTT Topics
#define PRESENCE_QUERY_TOPIC "presence/query"
#define PRESENCE_RESPONSE_TOPIC "presence/response"
#define DEVICE_PRESENCE_TOPIC "devices/" DEVICE_ID "/presence"

// Presence detection variables
bool presenceQueryActive = false;
unsigned long lastPresenceQuery = 0;
const unsigned long PRESENCE_TIMEOUT = 30000; // 30 seconds

WiFiClientSecure espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);

  // Connect to WiFi
  setupWiFi();

  // Setup MQTT
  client.setServer(MQTT_BROKER, MQTT_PORT);
  client.setCallback(mqttCallback);

  // Connect to MQTT
  reconnectMQTT();

  // Set up Last Will and Testament
  setupLWT();
}

void loop() {
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();

  // Check for presence query timeout
  if (presenceQueryActive && (millis() - lastPresenceQuery) > PRESENCE_TIMEOUT) {
    presenceQueryActive = false;
    Serial.println("Presence query timeout");
  }

  // Your existing sensor reading and transmission logic here
  // ...
}

/**
 * Set up MQTT Last Will and Testament
 * This ensures the device is marked offline when it disconnects unexpectedly
 */
void setupLWT() {
  // Create LWT payload
  StaticJsonDocument<200> lwtDoc;
  lwtDoc["deviceId"] = DEVICE_ID;
  lwtDoc["status"] = "offline";
  lwtDoc["timestamp"] = "disconnected";
  lwtDoc["reason"] = "unexpected_disconnect";

  String lwtPayload;
  serializeJson(lwtDoc, lwtPayload);

  // Set LWT on device presence topic
  client.setWill(DEVICE_PRESENCE_TOPIC, lwtPayload.c_str(), true, 1);

  Serial.println("LWT configured for device presence");
}

/**
 * MQTT Message Callback
 * Handles incoming messages including presence queries
 */
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("MQTT Message arrived [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(message);

  // Handle presence query
  if (topicStr == PRESENCE_QUERY_TOPIC) {
    handlePresenceQuery(message);
  }

  // Handle other MQTT messages (commands, etc.)
  // Your existing message handling logic here
}

/**
 * Handle presence query from server
 */
void handlePresenceQuery(String message) {
  // Parse the query message
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.println("Failed to parse presence query");
    return;
  }

  // Check if it's a "who is online?" query
  if (doc["query"] == "who_is_online") {
    presenceQueryActive = true;
    lastPresenceQuery = millis();

    Serial.println("Received presence query, responding...");

    // Respond that we're online
    StaticJsonDocument<200> responseDoc;
    responseDoc["response"] = "i_am_online";
    responseDoc["deviceId"] = DEVICE_ID;
    responseDoc["timestamp"] = getCurrentTimestamp();
    responseDoc["firmwareVersion"] = "1.0.0";
    responseDoc["uptime"] = millis() / 1000; // seconds

    String responsePayload;
    serializeJson(responseDoc, responsePayload);

    // Publish response
    client.publish(PRESENCE_RESPONSE_TOPIC, responsePayload.c_str(), true);

    // Also publish retained presence status
    StaticJsonDocument<200> presenceDoc;
    presenceDoc["deviceId"] = DEVICE_ID;
    presenceDoc["status"] = "online";
    presenceDoc["timestamp"] = getCurrentTimestamp();
    presenceDoc["lastResponse"] = millis();

    String presencePayload;
    serializeJson(presenceDoc, presencePayload);

    client.publish(DEVICE_PRESENCE_TOPIC, presencePayload.c_str(), true);

    Serial.println("Presence response sent");
  }
}

/**
 * Connect to MQTT broker
 */
void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");

    if (client.connect(DEVICE_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
      Serial.println("connected");

      // Subscribe to presence query topic
      client.subscribe(PRESENCE_QUERY_TOPIC, 1);

      // Subscribe to device-specific command topic
      String commandTopic = "devices/" + String(DEVICE_ID) + "/commands";
      client.subscribe(commandTopic.c_str(), 1);

      // Publish initial online status (retained)
      StaticJsonDocument<200> onlineDoc;
      onlineDoc["deviceId"] = DEVICE_ID;
      onlineDoc["status"] = "online";
      onlineDoc["timestamp"] = getCurrentTimestamp();
      onlineDoc["connectionTime"] = millis();

      String onlinePayload;
      serializeJson(onlineDoc, onlinePayload);

      client.publish(DEVICE_PRESENCE_TOPIC, onlinePayload.c_str(), true);

      Serial.println("Device presence published as online");

    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

/**
 * Get current timestamp (simplified)
 */
String getCurrentTimestamp() {
  // In a real implementation, you'd use NTP or RTC for accurate timestamps
  // For this example, we'll use a simple counter
  static unsigned long startTime = millis();
  unsigned long currentTime = millis();

  // Format as ISO-like string
  char timestamp[25];
  sprintf(timestamp, "%lu", currentTime);
  return String(timestamp);
}

void setupWiFi() {
  // Your WiFi setup code here
  Serial.println("Setting up WiFi...");
  // ...
}