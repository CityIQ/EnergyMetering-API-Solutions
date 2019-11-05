// This file must be updated with the client and tenant's information
var tenant = {
    name:"CityName",
    service:"https://cityname.cityiq.io/api/v2",
    developer: "clientId:clientSecret",
    zones: {
        'ENERGY_TIMESERIES':'SubscriptionIdForEnergyTimeseries' 
    }
}
if (typeof module !== 'undefined') {
    module.exports = tenant
}
