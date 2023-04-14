from Adafruit_BME280 import *
import RPi.GPIO as GPIO
import math

sensor = BME280(t_mode=BME280_OSAMPLE_8, p_mode=BME280_OSAMPLE_8, h_mode=BME280_OSAMPLE_8)
ledPin = 36
#Pin setup
GPIO.setmode(GPIO.BOARD)
GPIO.setup(ledPin, GPIO.OUT)

try:
    while True:
        
        print(sensor.read_temperature())
        GPIO.output(ledPin, True)
        
except KeyboardInterrupt:
    print("Program terminated")
finally:
    GPIO.cleanup()

def getTemperature():
    temperature = sensor.read_temperature()
    # convert temperature to whole number
    roundedTemperature = str(math.floor(temperature))
    return {"temp": roundedTemperature}

def toggleLed(toggle):
    if toggle:
        GPIO.output(ledPin, True)
    else:
        GPIO.output(ledPin, False)


def flickerLed():
    GPIO.output(ledPin, True)
    time.sleep(1)
    GPIO.output(ledPin, False)
    time.sleep(1)