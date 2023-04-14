serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    data = serial.readLine()
    if (data.includes("handshake")) {
        if (state == 0) {
            state = 1
            radio.sendString("handshake")
            handshakeStartTime = input.runningTime()
        }
    } else if (data.includes("reset")) {
        radio.sendString("reset")
    } else if (data.includes('cmd:')) {
        if (state == 2) {
            if (data.includes('cmd:sensor=')) {
                state = 3
                commandStartTime = input.runningTime()
                sensorValues = []
            }
            buffer = data.split(':')
            radio.sendString("" + buffer[1])
        }
    } else if (data.includes('resolve')) {
        if (state === 2) {
            radio.sendString('resolve')
        }
    } else if (data.includes("alarm")) {
        if (state === 2) {
            radio.sendString(data)
        }
    }
})
radio.onReceivedString(function (receivedString) {
    if (receivedString.includes('enrol=')) {
        if (state == 1) {
            buffer = receivedString.split('=')
            microbitDevices.push(buffer[1])
        }
    } else if (receivedString.includes('=')) {
        // vapaz=30-112
        if (state == 3) {
            sensorValues.push(receivedString)
        }
    }
})
let response = ""
let microbitDevices: string[] = []
let sensorValues: string[] = []
let state = 0
let commandStartTime = 0
let handshakeStartTime = 0
let data = ""
let buffer: string[] = []
handshakeStartTime = 0
commandStartTime = 0
radio.setGroup(8)
radio.setTransmitSerialNumber(true)
radio.setTransmitPower(7)
serial.redirectToUSB()
basic.showIcon(IconNames.Yes)
basic.forever(function () {
    basic.showNumber(state)
    if (state == 1) {
        if (input.runningTime() - handshakeStartTime > 10 * 1000) {
            state = 2
            response = ""
            for (let microbitDevice of microbitDevices) {
                if (response.length > 0) {
                    response = "" + response + "," + microbitDevice
                } else {
                    response = microbitDevice
                }
            }
            serial.writeLine("enrol=" + response)
        }
    } else if (state == 3) {
        if (input.runningTime() - commandStartTime > 10 * 1000) {
            response = ""
            for (let sensorValue of sensorValues) {
                if (response.length > 0) {
                    response = "" + response + "," + sensorValue
                } else {
                    response = sensorValue
                }
            }
            // vapaz=31-121,togez=32-131
            serial.writeLine("" + response)
            state = 2
        }
    }
})
