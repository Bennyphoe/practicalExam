import serial
import time
import sqlite3
import bme280
from datetime import datetime
import subscriber

fogName = "fogProcessor1"
fireTemperature = 40
fireLightLevel = 0.8
localFireAlarm = False
globalFullFireAlarm = False
globalFlickFireAlarm = False
bme280.toggleLed(False)
predefinedNodes = ['togez']

def sendCommand(command):
		
	command = command + '\n'
	ser.write(str.encode(command))

def reconnect():
	sendCommand("reset")

def receivedMessageFromBroker(payload):
	global localFireAlarm
	global globalFullFireAlarm
	global globalFlickFireAlarm
	print(payload)
	if payload == "resolve":
		localFireAlarm = False
		globalFullFireAlarm = False
		globalFlickFireAlarm = False
		time.sleep(1)
		sendCommand("resolve")
		bme280.toggleLed(False)
		
	elif "global" in payload:
		source = payload.split(":")[1]
		localFireAlarm = False
		if source in predefinedNodes or source == fogName:
			globalFullFireAlarm = True
		else:
			globalFlickFireAlarm = True

def doHandShake():
	strMicrobitDevices = ''
	# Handshaking
	sendCommand("handshake")

	while strMicrobitDevices == None or len(strMicrobitDevices) <= 0:
		strMicrobitDevices = waitResponse()
		time.sleep(0.1)
	strMicrobitDevices = strMicrobitDevices.split('=')
	print(strMicrobitDevices)
	
	if len(strMicrobitDevices[1]) > 0:
		listMicrobitDevices = strMicrobitDevices[1].split(',')
		if len(listMicrobitDevices) > 0:
			for mb in listMicrobitDevices:
				print('Connected to micro:bit device {}...'.format(mb))
    

def sendCommandToNodes():
	global predefinedNodes
	while True:
		print('Sending command to all micro:bit devices...')
		commandToTx = 'sensor=readings'				
		sendCommand('cmd:' + commandToTx)
		print('Finished sending command to all micro:bit devices...')
		
		if commandToTx.startswith('sensor='):
			
			strSensorValues = ''

			while strSensorValues == None or len(strSensorValues) <= 0:
				
				strSensorValues = waitResponse()
				time.sleep(0.1)
		sensorValues = strSensorValues.split(',')
		if (len(sensorValues) == len(predefinedNodes)):
			return strSensorValues.split(',')
		else:
			reconnect()
			time.sleep(3) # allow enough time to reconnect
			print("Didnt receive all nodes values, trying again")
			
		

def waitResponse():
	
	response = ser.readline()
	response = response.decode('utf-8').strip()
	return response

def checkForFire(readings):
	for reading in readings:
		data = reading.split('=')
		dataReadings = data[1].split("-")
		temp = int(dataReadings[0])
		lightLevel = dataReadings[1]
		if ("fogProcessor" not in data[0]):
			intLightLevel = int(lightLevel)
			roundedLightLevel = round((intLightLevel / 255), 3)
			if (temp > fireTemperature and roundedLightLevel > fireLightLevel):
				return data[0]
		else:
			if (temp > fireTemperature and float(lightLevel) > fireLightLevel):
				return data[0]
	return False

def saveData(readings):
	c = conn.cursor()
	
	for reading in readings:
		data = reading.split('=')
		dataReadings = data[1].split("-")
		temp = dataReadings[0]
		lightLevel = dataReadings[1]
		if ("fogProcessor" not in data[0]):
			intLightLevel = int(lightLevel)
			roundedLightLevel = round((intLightLevel / 255), 3)
			stringLightLevel = str(roundedLightLevel)
			sql = "INSERT INTO readings (devicename, temp, lightlevel, timestamp) VALUES('" + data[0] + "', " + temp + ", " + stringLightLevel + ", datetime('now', 'localtime'))"
			
		else:
			sql = "INSERT INTO readings (devicename, temp, lightlevel, timestamp) VALUES('{}','{}','{}',datetime('now', 'localtime'))".format(data[0], temp, lightLevel)
		c.execute(sql)
	conn.commit()
	
	readings.clear()
		
def saveOutbreak(source):
	c = conn.cursor()
	sql = "INSERT INTO outbreaks (source, timestamp) VALUES ('{}',datetime('now', 'localtime'))".format(source)
	c.execute(sql)
	conn.commit()
	
def triggerAlarmFull():
	bme280.toggleLed(True)
	
def triggerAlarmFlick():
    bme280.flickerLed()
    


try:

	print("Listening on /dev/ttyACM0... Press CTRL+C to exit")	
	ser = serial.Serial(port='/dev/ttyACM0', baudrate=115200, timeout=1)
	conn = sqlite3.connect('readings.db')	
	subscriber.run(receivedMessageFromBroker)
	doHandShake()
	while True:
		time.sleep(5)
		listSensorValues = []
		if not localFireAlarm and not globalFullFireAlarm and not globalFlickFireAlarm:
			if (len(predefinedNodes) > 0):
				# ["vapaz=30-121", "togez=31-121"]
				listSensorValues = sendCommandToNodes()
			# together with sensor values we also have to persist data coming from rpi
			fogReadings = bme280.getTemperature()
			# REMOVE the placeholder light level
			listSensorValues.append("{}={}-{}".format(fogName, fogReadings["temp"], 0.5))

			for sensorValue in listSensorValues:
				print(sensorValue)      
			source = checkForFire(listSensorValues) 
			if source:
				saveOutbreak(source)
				localFireAlarm = True
			else:               
				saveData(listSensorValues)
		else:
			print("pending deactivation")
			if (localFireAlarm or globalFullFireAlarm):
				while(localFireAlarm or globalFullFireAlarm):
					triggerAlarmFull()
					sendCommand("alarm=full")
					time.sleep(2)
			elif(globalFlickFireAlarm):
				while(globalFlickFireAlarm):
					triggerAlarmFlick()
					sendCommand("alarm=flick")
					time.sleep(2)
			
			
			

except KeyboardInterrupt:
		
	print("Program terminated!")

except:

	print('********** UNKNOWN ERROR')

finally:
	
	if ser.is_open:
		ser.close()
		
	conn.close()


