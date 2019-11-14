# About this repository
Here you will find helpful scripts accessing energy metering data. To use these scripts you must first be granted access to your municipality's Energy Metering API.  

### Before you begin
AFter downloading this repository, make sure to complete the credentials.js file with your personal credentials.  While each field currently has placeholders, these must all be replaced with your client credentials.


# energyconsumption.js

energyconsumption.js is one script which:
1. Gets a token using your credentials in credentials.js
2. Uses that token to query for all the energy metering assets (sensors) for your tenant.
3. Then for each energy metering asset, the script gets the total energy consumed (in kWh) by that node for that period of time and logs it in a csv file saved locally.



### Getting started
1. Download the EnergyMetering-API-Solutions Repository 
2. Modify credentials.js with your credentials
3. Download and install [NodeJS](https://nodejs.org/en/download/)
    * [NodeJS](https://nodejs.org/en/download/) will come with a package manager called [NPM](https://www.npmjs.com/get-npm) which will enable you to install the necessary dependcies to get started.
4. Navigate via your terminal(or command line) to the EnergyMetering-API-Solutions directory and type the following command: ` npm install `
    * This will install the dependent packages documented in package.json.
5. Once the above command completes you are now ready to use energyconsumption.js



### Running energyconsumption.js
To Run energyconsumption.js you will need to obtain the Unix start and end times that you want energy metering data for. We recommend using https://www.epochconverter.com/ for start and end input parameters

*Note: *
*The maximum time span that can be used for this script is 35 days.*
*The minimum time span that can be used for this script is 3 hours.*

Once you have your two unix timestamps (in milliseconds), type the following command in the commandline of the EnergyMetering-API-Solutions Directory
```
node energyconsumption.js startTimestamp endTimestamp
```
For Example, to obtain data for 1 Nov 2019 to 5 Nov 2019 your command will look like:
```
node energyconsumption.js 1572580800000 1572930000000
```


# Contact 
support.cityiq@ge.com
