let commandKey = ""
let commandValue = ""
let state = 0
let randomWaitPeriod = 0
let buffer: string[] = []
randomWaitPeriod = 0

// Radio Configuration
radio.setGroup(8)
radio.setTransmitSerialNumber(true)
radio.setTransmitPower(7)

// States required for project

const temperatureBaseReading = 0
const temperatureGap = 5
const lightLevelGap = 10
const lightLevelBaseReading = 80
let savedTemperature: number = 0
let savedLightLevel: number = 0
let maxTemperature = temperatureGap * 10
let maxLightLevel = lightLevelGap * 10
let fullFireAlarm = false
let flickFireAlarm = false

// (0,0) (1,0) (2,0) (3,0) (4,0)

// (0,1) (1,1) (2,1) (3,1) (4,1)

// (0,2) (1,2) (2,2) (3,2) (4,2)

// (0,3) (1,3) (2,3) (3,3) (4,3)

// (0,4) (1,4) (2,4) (3,4) (4,4)


radio.onReceivedString(function (receivedString) {
    if (receivedString.includes("handshake")) {
        if (state == 0) {
            state = 1
            randomWait()
            radio.sendString("enrol=" + control.deviceName())
        }
    } else if (receivedString.includes("reset")) {
        if (state == 0) {
            state = 1
        }
    } else if (receivedString.includes("resolve")) {
        resolve()
    } else if (receivedString.includes("alarm")) {
        buffer = receivedString.split('=')
        commandValue = buffer[1]
        if (commandValue === "full") {
            fullFireAlarm = true
        } else {
            flickFireAlarm = true
        }
        
    } else {
        // basic.showString("R")
        if (state == 1) {
            buffer = receivedString.split('=')
            commandKey = buffer[0]
            commandValue = buffer[1]

            if (commandKey == "sensor") {
                if (commandValue == "readings") {
                    randomWait()
                    radio.sendString("" + control.deviceName() + "=" + input.temperature() + "-" + input.lightLevel())
                }
            }
        }
    }
})

function resolve() {
    fullFireAlarm = false
    flickFireAlarm = false
    for (let i = 0; i < 5; i++) {
        for (let t = 0; t < 5; t++) {
            unPlotLed(i, t)
        }
    }
}

function triggerFullFireAlarm() {
    for (let i = 0; i < 5; i++) {
        for (let t = 0; t < 5; t++) {
            plotLed(i, t)
        }
    }
}

function triggerFlickFireAlarm() {
    for (let i = 0; i < 5; i++) {
        for (let t = 0; t < 5; t++) {
            plotLed(i, t)
        }
    }
    basic.pause(1000)
    for (let i = 0; i < 5; i++) {
        for (let t = 0; t < 5; t++) {
            unPlotLed(i, t)
        }
    }
    basic.pause(1000)
}

function randomWait() {
    randomWaitPeriod = Math.randomRange(100, 9900)
    basic.pause(randomWaitPeriod)
}

input.onButtonPressed(Button.A, function () {
    basic.showString("[" + commandKey + "=" + commandValue + "]")
})

input.onButtonPressed(Button.AB, function () {
    basic.showString("DN:" + control.deviceName())
})

function plotLed(row: number, column: number) {
    led.plot(column, row)
}
function unPlotLed(row: number, column: number) {
    led.unplot(column, row)
}

//reading functions
function ledPlotForReadings(reading: number, startColumn: number, baseReading: number, gap: number) {
    //only take up the first 2 columns
    const gapsRequired = (reading - baseReading) / gap
    const gapsShown = parseInt(`${gapsRequired}`, 10)
    const maxGaps = 9
    for (let i = 0; i < gapsShown; i++) {
        if (i > maxGaps) {
            break
        }
        let column = startColumn
        let row = 4 - (i % 5) // 5 is the number of LED on microbit in a column
        if (i > 4) {
            column = startColumn + 1
            plotLed(row, column)
        } else {
            plotLed(row, column)
        }
    }
}

function setFogConnection(state: number) {
    if (state === 1) {
        for (let i = 0; i < 5; i++) {
            led.plot(4, i)
        }
    } else {
        for (let i = 0; i < 5; i++) {
            led.unplot(4, i)
        }
    }

}


function unPlotForReadings(startColumn: number, endColumn: number, currentReading: number, savedReading: number, gap: number, maxReading: number) {
    if (savedReading && currentReading < savedReading) {
        if (savedReading > maxReading) savedReading = maxReading
        if (currentReading > maxReading) currentReading = maxReading
        const currentReadingGaps = parseInt(`${currentReading / gap}`, 10)
        const savedReadingGaps = parseInt(`${savedReading / gap}`, 10)
        let gapsToRemove = savedReadingGaps - currentReadingGaps
        if (gapsToRemove > 0) {
            for (let column = endColumn; column >= startColumn; column--) {
                if (gapsToRemove === 0) break
                for (let row = 0; row < 5; row++) {
                    if (led.point(column, row)) {
                        unPlotLed(row, column)
                        gapsToRemove--
                        if (gapsToRemove === 0) break
                    }
                }
            }
        }
    }

}


function getTemperature() {
    return input.temperature()
}

function getLightLevel() {
    return input.lightLevel()
}


basic.forever(function () {
    if (fullFireAlarm) {
        triggerFullFireAlarm()
    } else if (flickFireAlarm) {
        triggerFlickFireAlarm()
    } else {
        //temperature
        const currentTemperature = getTemperature()
        ledPlotForReadings(currentTemperature, 0, temperatureBaseReading, temperatureGap)
        unPlotForReadings(0, 1, currentTemperature, savedTemperature, temperatureGap, maxTemperature)
        savedTemperature = currentTemperature
        // light level
        const currentLightLevel = getLightLevel()
        ledPlotForReadings(currentLightLevel, 2, lightLevelBaseReading, lightLevelGap)
        unPlotForReadings(2, 3, currentLightLevel, savedLightLevel, lightLevelGap, maxLightLevel)
        savedLightLevel = currentLightLevel
        //fog connection
        setFogConnection(state)
    }

})
