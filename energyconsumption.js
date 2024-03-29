const fs = require('fs')
const tenant = require('./credentials.js')
const fetch = require('node-fetch')
var btoa = str => new Buffer.from(str).toString('base64')
const uaaUrl = 'https://auth.aa.cityiq.io/oauth/token?grant_type=client_credentials'

let dates = []
let token
process.argv.forEach((val, i) => {
    if (i >= 2) dates.push(val)
});

// function to make api requests
var fetchJSON = (url, options = {}) => {
    return fetch(url, options).then(result => {
        if (result.status >= 400) throw result.statusText
        else return result.text().then(txt => {
            try { return JSON.parse(txt) }
            catch (err) { return txt }
        })
    })
}

async function getToken(user) {
    return fetchJSON(uaaUrl, { headers: { authorization: 'Basic ' + btoa(user) } })
        .then(result => result.access_token)
}

// makes metadata paginated requests, returns an array of pages of assets
async function getListOfAssets(type, bbox, pageSize = 1000) {
    if (bbox == undefined) bbox = { north: 90, west: -180, south: -90, east: 180 }
    let headers = { authorization: 'Bearer ' + token, 'predix-zone-id': Object.values(tenant.zones)[0] }
    let query = '/metadata/assets/search?bbox=' + bbox.north + ':' + bbox.west + ',' + bbox.south + ':' + bbox.east + '&size=' + pageSize

    if (Object.keys(tenant.zones).includes(type)) query += '&q=eventTypes:' + type
    else if (['IMAGE', 'VIDEO'].includes(type)) query += '&q=mediaType:' + type
    else if (['CAMERA', 'ENV_SENSOR', 'NODE', 'EM_SENSOR'].includes(type)) query += '&q=assetType:' + type

    let i = 0
    let maxPages = 2
    let result = []
    do {
        let data = await fetchJSON(tenant.service + query + '&page=' + i, { headers })
        if ((data.content.length > 0) && (data.content !== undefined)) {
            result.push(data.content)
            maxPages = data.totalPages
        }
        i++
    } while (i < maxPages);
    return result
}

async function getEventsByAssetUID(evType, assetUID, start, end = '9999999999999', pageSize = 1000) {
    let headers = { authorization: 'Bearer ' + token, 'predix-zone-id': tenant.zones[evType] }
    let query = '/events?eventType=' + evType + '&pageSize=' + pageSize + '&startTime=' + start + '&endTime=' + end
    return fetchJSON(tenant.service + '/event/assets/' + assetUID + query, { headers })
}

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
  }

function findDataPoint(event,timestamp) {
    let value = {}
    let diff = Math.round((event.timestamp - timestamp)/event.properties.deltaBaseTimeInMilliseconds)
    if (diff > 0 && Object.keys(event.measures).length > diff ) {
        value.value  = event.measures['value'+diff]
        value.timestamp = event.timestamp +(diff * event.properties.deltaBaseTimeInMilliseconds)
    } else {
        value.value = (event.measures.value !== undefined) ?  event.measures.value : event.measures.value1 
        value.timestamp = event.timestamp
    } 
    return value
}

async function init() {
    if (dates.length < 0 && dates === undefined) console.log("please enter timestamps")
    else if ((dates.length == 2) && (dates[1] - dates[0] > (35 * 24 * 60 * 60000))) console.log("please enter a time range less than 35 days")
    else if ((dates.length == 2) && (dates[0] > dates[1])) console.log("Please reverse the order of timestamps")
    else {
        token = await getToken(tenant.developer)

        let startTs = parseInt(dates[0])
        let endTs = parseInt(dates[1])
        let start = new Date(startTs)
        let end = new Date(endTs)

        start = `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`
        end = `${end.getFullYear()}-${end.getMonth() + 1}-${end.getDate()}`

        console.log(`Getting total energy consumed from ${start} to ${end}`)

        let tsHeading = `Asset,Coordinates,Start Day Of the Week,Start Date Time (UTC),Start Timestamp,End Day Of the Week,End Date Time (UTC),End Timestamp,deltaTime(hours),CIQ EventType,unit,total energy consumption for this deltaTime  \n`
        fs.writeFileSync(`${tenant.name}_${start}_To_${end}_ENERGY_TIMESERIES.csv`, tsHeading)

        getListOfAssets('EM_SENSOR')
            .then(pagesOfAssets => {
                pagesOfAssets.forEach(async (sensors) => {
                    for (let sensor of sensors) {
                        sleep(2000)
                        let allEvents = (await getEventsByAssetUID('ENERGY_TIMESERIES', sensor.assetUid, startTs, endTs )).content
                        if ((allEvents !== undefined) && (allEvents.length > 1)) {
                            let firstDataPoint = findDataPoint(allEvents[0],startTs)
                            let lastDataPoint = findDataPoint(allEvents[allEvents.length - 1], endTs)

                            let deltaTime = (lastDataPoint.timestamp - firstDataPoint.timestamp) / 3600000

                            let tsResult = `${sensor.assetUid},"${sensor.coordinates}",${(new Date(firstDataPoint.timestamp)).toUTCString()},${firstDataPoint.timestamp},`
                                + `${(new Date(lastDataPoint.timestamp)).toUTCString()},${lastDataPoint.timestamp},${deltaTime},ENERGY_TIMESERIES,kWh,`

                            let peaks = []
                            for (let i = 0; i < (allEvents.length - 1); i++) {
                                let keys = Object.keys(allEvents[i].measures)
                                let eventValue = (allEvents[i].measures.value !== undefined) ? allEvents[i].measures.value : allEvents[i].measures['value' + keys.length]
                                let nextEventValue = (allEvents[i + 1].measures.value !== undefined) ? allEvents[i + 1].measures.value : allEvents[i + 1].measures.value1
                                if ((eventValue !== undefined) && (nextEventValue !== undefined) && (eventValue > nextEventValue)) {
                                    peaks.push(eventValue)
                                }

                            }

                            if ((peaks.length > 0) && (peaks !== undefined)) {
                                tsResult += `${(parseFloat((peaks.reduce((aggr, val) => aggr + val, 0) + lastDataPoint.value - firstDataPoint.value) * 0.0001)).toFixed(4)}\n`
                            } else {
                                tsResult += `${(parseFloat((lastDataPoint.value - firstDataPoint.value) * 0.0001)).toFixed(4)}\n`
                            }
                            fs.appendFileSync(`${tenant.name}_${start}_To_${end}_ENERGY_TIMESERIES.csv`, tsResult)
                            console.log(`${sensor.assetUid} - success`)
                        } else {
                            console.log(`${sensor.assetUid} - insufficient events`)
                        }
                    }
                })
            })
            .catch(err => console.log(err))
    }
}

init()


