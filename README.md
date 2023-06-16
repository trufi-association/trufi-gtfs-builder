## INTRODUCTION 

Trufi’s General Transit Feed Specification (GTFS) tool allows you to create a map for your city. You can also send your route data to Google Maps, Open Trip Planner, OpenStreetMap, and other public atlases to keep navigation databases updated. 

Follow the steps below to create a public transportation map using our tool.

### Steps 

+ Step 1:  Download [Trufi’s GTFS builder repo](https://github.com/trufi-association/trufi-gtfs-builder)

+ Step 2: Download three tools: [Nodsjs](https://nodejs.org/en), [Git]( https://github.com/git-guides/install-git), and a text code editor. We recommend [Visual Studio (VS) Code]( https://code.visualstudio.com/).

+ Step 3: Click on “code” and copy the HTTPS URL. 
You may choose to download GitHub Desktop and select the “GitHub CLI”. 
There is a login required to use this method. There is no login required to use the HTTPS method.
 
+ Step 4: Type Git clone and the HTTPS URL into the Git PowerShell command line.
 
+ Step 5: Find the Trufi GFTS folder on your device. Right-click it and copy the folder.

+ Step 6: Find the VS Code folder. Paste the Trufi folder inside it.
 
+ Step 7: Type npm install in the console to install all node dependencies.

+ Step 8: Create a folder for the city you will generate a map for. This is where you will later put your completed map. 
+ Step 9: Navigate to [boundingbox](https://boundingbox.klokantech.com/). Adjust the box to capture all the routes you want to include in your map. 

+ Step 10: Select Dublincore.

+ Step 11: Notice the Northlimit, Eastlimit, Southlimit, and Westlimit. These are latitudes and longitudes.

+ Step 12: Paste the latitudes and longitudes inside VS Code in their respective spaces: North, East, South, and West spaces.

+ Step 13: Under the output files set GFTS to true.

+ Step 14: Run the application in the VS Code terminal. Type: Node - .\examples\ your folder \index\js. 

In your output folder, there is a new README file. You can copy and paste its contents into a markdown viewer to see your new map and errors. 


## Optional Steps 

### Test a sample map

There are route examples inside the folder that allow you to visualize how the application works. 

- [ ] Work inside an index, run, and type node -.\examples\the example you want to work inside\index.js
 
- [ ] Test one of the sample maps, open its README file. Copy the markdown text. 
Navigate to a markdown reader and paste the text. Examine the output. 
Here, you can see the output layout and learn how to fix errors.


### View public transportation routes in your city

- [ ] Go to ogm.org. Type in your selected city and view public transportation routes.
 
- [ ] To test one of the sample maps, open its README file. Copy the markdown text. 
Navigate to a markdown reader and paste the text. Examine the output. 
Here, you can see the output layout and learn how to fix errors.


### Customize your application
 
To specify routes, operation times, and other local options, you can change the following elements:

- [ ] Add or update the "agencytimezone" element. Use it to add your transportation agency’s name. You may also use the default calendar option to set transportation operation times.

- [ ] Every city does not have stops included in its routes. The “fakestops” option allows you to create fake stops so that your output is not empty. If you live in a place without designated bus stops, select false under "fakestops" to create fake ones. The default interval is 100 meters. However, if you would like more or fewer stops, change the interval. 
 
- [ ] To build or add streets, type and inside the “return.stops.join" element.

- [ ] You have a section in your code called “stops”. If a stop name is unknown, type unknown in this section so that the map does not output an incorrect street name. 

