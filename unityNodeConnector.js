/**
 * Connects to Qlik Sense, opens a global session and scopes the session to specificed app.
 * Returns both the global object and the app object as an array.
 * 
 * The same behaviour can be achieved with Connect() and calling openDoc() on the global object manually.
 */

const qsocks = require('qsocks');
var express = require('express');
var ExpressApp = express();
var bodyParser = require('body-parser');
var fs = require("fs");
var prompt = require('prompt');

var global, SenseApp;
var Orgs = [], 
    Countries = [],
    Locations = [],
    Capabilities = [],
    CapabilitiesSel = [],
    Types = [],
    Industries = [];


/*********** REST SERVER ***********/

// Get list of potential partners
ExpressApp.get('/listOrgs', function (req, res) {
   // console.log( Orgs );
   console.log("listing " + Orgs.length + " orgs");
   res.end(JSON.stringify(Orgs));
});

ExpressApp.get('/listCountries', function (req, res) {
   // console.log( Countries );
   console.log("listing " + Countries.length + " Countries");
   res.end(JSON.stringify(Countries));
});

ExpressApp.get('/listLocations', function (req, res) {
   console.log("listing " + Locations.length + " Locations");
   res.end(JSON.stringify(Locations));
});

ExpressApp.get('/listCapabilities', function (req, res) {
   console.log("listing " + Capabilities.length + " Capabilities");
   res.end(JSON.stringify(Capabilities));
});

ExpressApp.get('/listTypes', function (req, res) {
   console.log("listing " + Types.length + " Types");
   res.end(JSON.stringify(Types));
});

ExpressApp.get('/listIndustries', function (req, res) {
   console.log("listing " + Industries.length + " Industries");
   res.end(JSON.stringify(Industries));
});

// Select partner
var urlencodedParser = bodyParser.urlencoded({ extended: false });
ExpressApp.post('/selectOrg', urlencodedParser, function (req, res) {
    var field = req.body.fieldName;
    var value = req.body.fieldValue;
    console.log("Selecting "+value+" in "+field);
    selectField(field, value);
    // var duh = ExpressApp.get('/listOrgs');
    res.end("selected");
    // res.redirect('/listOrgs');
});

// Filter
var urlencodedParser = bodyParser.urlencoded({ extended: false });
ExpressApp.post('/filter', urlencodedParser, function (req, res) {
    var field = req.body.fieldName;
    var value = req.body.fieldValue;
    console.log("Selecting "+value+" in "+field);
    filter(field, value);
    res.end("filtered");
});

// Select partner
ExpressApp.post('/clearOrg', urlencodedParser, function (req, res) {
    var field = req.body.fieldName;
    console.log("Clearing org selection");
    // clearField(field);
    clearSelections(field);
    res.end("cleared");
});

// Start Server
var server = ExpressApp.listen(8081, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log("Example app listening at http://%s:%s", host, port);

  getInput();

});


// Start Prompt
prompt.start();

function onErr(err){
    console.log(err);
    return 1;
}

// for manual input use this format: ^^^^XXX
function getInput(){
    prompt.get(['Organization'], function(err, result) {
        if(err) { return onErr(err); }
        var inputStream = result.Organization
        console.log('Input Stream: ' + inputStream);

        var input = inputStream.split('^');

        clearAll();

        console.log('Partner Name:' + input[4]);

        recordUser(inputStream);

        selectField("Partner Name", input[4]);
        getInput();
    });
}

function recordUser(user){
    fs.appendFile("ScannedUsers.csv", user+'\n', function(err) {
        if(err) {
            return console.log(err);
        }

        console.log("User saved!");
    });
}


/******* QSOCKS **********/

qsocks.ConnectOpenApp({
    host:'localhost',
    port:4848,
    appname: 'Partner Portal VR Demo (3).qvf'
})
.then(function(connections) {
    global = connections[0];
    SenseApp = connections[1];
    
    // Access to the global object.
    // global.getDocList().then(function(doclist) {
    //     console.log(doclist);
    // });
    
    // Access to the app object.
    // SenseApp.getAppLayout().then(function(applayout) {
    //     console.log(applayout);
    // });

    // Access the sheet list.
    SenseApp.createSessionObject({
        qInfo: {
            qType: 'myOrgCube'
        },
        qHyperCubeDef: {
            qStateName: "Alt1",
            qDimensions: [{
                qDef: {
                    qFieldDefs: ['Partner Name'],
                    qSortCriterias: [{
                        qSortByAscii: 1
                    }]
                },
                qNullSuppression: true
            }],
            qMeasures: [
                {
                    qDef: {
                        qLabel: 'Org Names',
                        qDef: '=count({Alt1} DISTINCT [OrgID])'
                    },
                    qSortBy: {qSortByNumeric: -1}
                },{
                    qDef: {
                        qLabel: 'Filtered Names',
                        qDef: '=count({$ - Alt1} DISTINCT [OrgID])'
                    },
                    qSortBy: {qSortByNumeric: 1}
                }
            ],
            qInterColumnSortOrder: [1,0,2],
            qInitialDataFetch: [{
                qWidth: 4,
                qHeight: 2000,
                qTop: 0,
                qLeft: 0
            }]
        }
    })
    .then(function(orgModel) {
        orgModel.getLayout().then(function(layout) {
            // console.log(layout)
            var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
            // console.log("data",JSON.stringify(qMatrix));
            for(var key in qMatrix){
                Orgs.push(qMatrix[key][0].qText);
            }
            //console.log(Orgs);
        });

        // When the server notifies us that there has been a change to the orgModel on the server
        // Run the getlayout / getlistobjectdata cycle again.
        orgModel.on('change', function() {
            orgModel.getLayout().then(function(layout) {
                var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
                Orgs = [];
                // console.log("data",JSON.stringify(qMatrix));
                // console.log("orgObject changed");
                for(var key in qMatrix){
                    var obj = {org: qMatrix[key][0].qText, s: qMatrix[key][1].qText, t: qMatrix[key][2].qText};
                    Orgs.push(obj);
                }
                // console.log("Orgs",Orgs);
                console.log("OrgsLen",Orgs.length);
            })
        });
    });

    // Create a Generic Session Object for Counties
    SenseApp.createSessionObject({   
        qInfo: {
            qType: 'myCountryCube'
        },
        qHyperCubeDef: {
            qDimensions: [{
                qDef: {
                    qFieldDefs: ['Country'],
                    qSortCriterias: [{
                        qSortByAscii: 1
                    }]
                },
                qNullSuppression: true
            }],
            qMeasures: [
                {
                    qDef: {
                        qLabel: 'Org Locations',
                        qDef: '=count({Alt1} DISTINCT [OrgID])'
                    },
                    qSortBy: {qSortByNumeric: -1}
                },{
                    qDef: {
                        qLabel: 'Filtered Locations',
                        qDef: '=count({$ - Alt1} DISTINCT [OrgID])'
                    },
                    qSortBy: {qSortByNumeric: 1}
                },{
                    qDef: {
                        qLabel: 'All Locations',
                        qDef: '=count({1} DISTINCT [OrgID])'
                    },
                    qSortBy: {qSortByNumeric: 1}
                }
            ],
            qInterColumnSortOrder: [1,0,2],
            qInitialDataFetch: [{
                qWidth: 4,
                qHeight: 2000,
                qTop: 0,
                qLeft: 0
            }]
        }
        
    }).then(function(cube) {
        
        // We have created a generic object, see docs for the full list of available methods
        // Docs: http://help.qlik.com/en-US/sense-developer/2.2/Subsystems/EngineAPI/Content/Classes/GenericObjectClass/GenericObject-class.htm

        cube.getLayout().then(function(layout) {
            var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
            for(var key in qMatrix){
                Countries.push(qMatrix[key][0].qText);
            }
            // console.log(Countries);
        });


        // If cube changes on server 
        cube.on('change', function() {
            console.log('Cube changed');
            cube.getLayout().then(function(layout) {
                // console.log("new data",layout);
                var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
                // console.log("new Location data",JSON.stringify(qMatrix));
                // console.log("data",JSON.stringify(layout));
                Countries = [];
                for(var key in qMatrix){
                    var obj = {c: qMatrix[key][0].qText, s: qMatrix[key][1].qText, t: qMatrix[key][2].qText, a: qMatrix[key][3].qText};
                    Countries.push(obj);
                }
                // console.log("new Countries",Countries);
            })
        });
    })
    .catch(function(err) { console.log(err) })

    // Create a Generic Session Object for Locations
    SenseApp.createSessionObject({   
        qInfo: {
            qType: 'myLocationCube'
        },
        qHyperCubeDef: {
            qDimensions: [{
                qDef: {
                    qFieldDefs: ['Partner Name'],
                    qSortCriterias: [{
                        qSortByAscii: 1
                    }]
                },
                qNullSuppression: true
              },
              {
                qDef: { qFieldDefs: ['Latitude'] },
                qNullSuppression: true
              },
              {
                qDef: { qFieldDefs: ['Longitude'] },
                qNullSuppression: true
              }
            ],
            qMeasures: [
                {
                    qDef: {
                        qLabel: 'All Locations',
                        qDef: '=count({1} DISTINCT OrgID)'
                    },
                    qSortBy: {qSortByNumeric: 1}
                }
            ],
            qInterColumnSortOrder: [0,1,2],
            qInitialDataFetch: [{
                qWidth: 3,
                qHeight: 1,
                qTop: 0,
                qLeft: 0
            }]
        }
        
    }).then(function(cube) {
        
        cube.getLayout().then(function(layout) {
            var rowsPerCube = 3333;
            var numPages = Math.ceil(layout.qHyperCube.qSize.qcy/rowsPerCube);
            Locations = [];
            for(i=0; i<numPages; i++){
                cube.getHyperCubeData("/qHyperCubeDef",[
                {
                    qWidth: 3,
                    qHeight: rowsPerCube,
                    qTop: rowsPerCube*i,
                    qLeft: 0
                }]).then(function(qDataPages){
                    var qMatrix = qDataPages[0].qMatrix;
                    // console.log("qDataPages",qMatrix);
                    for(var key in qMatrix){
                        // console.log(".");
                        var obj = {org: qMatrix[key][0].qText, lat: qMatrix[key][1].qNum, lon: qMatrix[key][2].qNum};
                        // var obj = {lat: qMatrix[key][1].qText, lon: qMatrix[key][2].qText};
                        Locations.push(obj);
                    }
                    // Locations.splice(100,9800);
                    console.log("num locations: " + Locations.length);
                });
            }
        });


        // If cube changes on server 
        // cube.on('change', function() {
        //     console.log('Cube changed');
        //     cube.getLayout().then(function(layout) {
        //         // console.log("new data",layout);
        //         var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
        //         // console.log("new Location data",JSON.stringify(qMatrix));
        //         // console.log("data",JSON.stringify(layout));
        //         Locations = [];
        //         for(var key in qMatrix){
        //             var obj = {org: qMatrix[key][0].qText, lat: qMatrix[key][1].qText, lon: qMatrix[key][2].qText};
        //             Locations.push(obj);
        //         }
        //         console.log("new Locations",Locations);
        //     })
        // });
    })
    .catch(function(err) { console.log(err) })


    // Create a Generic Session Object for Capabilities
    SenseApp.createSessionObject({   
        qInfo: {
            qType: 'myCapabilitiesCube'
        },
        qHyperCubeDef: {
            qDimensions: [{
                qDef: {
                    qFieldDefs: ['Organization Capability'],
                    qSortCriterias: [{
                        qSortByAscii: 1
                    }]
                },
                qNullSuppression: true
            }],
            qMeasures: [{
                    qDef: {
                        qLabel: 'Sel Capabilities',
                        qDef: '=count({Alt1} DISTINCT [OrgID])'
                    },
                    qSortBy: {qSortByNumeric: -1}
                },{
                    qDef: {
                        qLabel: 'Filtered Capabilities',
                        qDef: '=count({$ - Alt1} DISTINCT [OrgID])'
                    },
                    qSortBy: {qSortByNumeric: 1}
                },{
                    qDef: {
                        qLabel: 'All Capabilities',
                        qDef: '=count({1} DISTINCT [OrgID])'
                    },
                    qSortBy: {qSortByNumeric: 1}
                }
            ],
            qInterColumnSortOrder: [1,0,2],
            qInitialDataFetch: [{
                qWidth: 4,
                qHeight: 2000,
                qTop: 0,
                qLeft: 0
            }]
        }
        
    }).then(function(cube) {

        cube.getLayout().then(function(layout) {
            var qMatrix = layout.qListObject.qDataPages[0].qMatrix;
            for(var key in qMatrix){
                Capabilities.push(qMatrix[key][0].qText);
            }
            console.log(Capabilities);
        });


        // If cube changes on server 
        cube.on('change', function() {
            console.log('Capability Cube changed');
            cube.getLayout().then(function(layout) {
                var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
                // console.log("new Capability data",JSON.stringify(qMatrix));
                // console.log("data",JSON.stringify(layout));
                Capabilities = [];
                for(var key in qMatrix){
                    var obj = {c: qMatrix[key][0].qText, s: qMatrix[key][1].qText, t: qMatrix[key][2].qText};
                    Capabilities.push(obj);
                }
                // console.log("new Capabilities",Capabilities);
            })
        });
    })
    .catch(function(err) { console.log(err) })


    // Create a Generic Session Object for Types
    SenseApp.createSessionObject({   
        qInfo: {
            qType: 'myTypeCube'
        },
        qHyperCubeDef: {
            qDimensions: [{
                qDef: {
                    qFieldDefs: ['Organization Type'],
                    qSortCriterias: [{
                        qSortByAscii: 1
                    }]
                },
                qNullSuppression: true
            }],
            qMeasures: [{
                    qDef: {
                        qLabel: 'Sel Type',
                        qDef: '=count({Alt1} DISTINCT [OrgID])'
                    },
                    qSortBy: {qSortByNumeric: -1}
                },{
                    qDef: {
                        qLabel: 'Filtered Type',
                        qDef: '=count({$ - Alt1} DISTINCT [OrgID])'
                    },
                    qSortBy: {qSortByNumeric: 1}
                },{
                    qDef: {
                        qLabel: 'All Type',
                        qDef: '=count({1} DISTINCT [OrgID])'
                    },
                    qSortBy: {qSortByNumeric: 1}
                }
            ],
            qInterColumnSortOrder: [1,0,2],
            qInitialDataFetch: [{
                qWidth: 4,
                qHeight: 2000,
                qTop: 0,
                qLeft: 0
            }]
        }
        
    }).then(function(cube) {
        cube.getLayout().then(function(layout) {
            var qMatrix = layout.qListObject.qDataPages[0].qMatrix;
            for(var key in qMatrix){
                Types.push(qMatrix[key][0].qText);
            }
            console.log(Types);
        });

        // If cube changes on server 
        cube.on('change', function() {
            console.log('Type Cube changed');
            cube.getLayout().then(function(layout) {
                var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
                // console.log("new Type data",JSON.stringify(qMatrix));
                // console.log("data",JSON.stringify(layout));
                Types = [];
                for(var key in qMatrix){
                    var obj = {c: qMatrix[key][0].qText, s: qMatrix[key][1].qText, t: qMatrix[key][2].qText};
                    Types.push(obj);
                }
                // console.log("new Type",Types);
            })
        });
    })
    .catch(function(err) { console.log(err) })

    // Create a Generic Session Object for Industries
    SenseApp.createSessionObject({   
        qInfo: {
            qType: 'myIndustryCube'
        },
        qHyperCubeDef: {
            qDimensions: [{
                qDef: {
                    qFieldDefs: ['Organization Industry'],
                    qSortCriterias: [{
                        qSortByAscii: 1
                    }]
                },
                qNullSuppression: true
            }],
            qMeasures: [{
                    qDef: {
                        qLabel: 'Sel Industry',
                        qDef: '=count({Alt1} DISTINCT [OrgID])'
                    },
                    qSortBy: {qSortByNumeric: -1}
                },{
                    qDef: {
                        qLabel: 'Filtered Industry',
                        qDef: '=count({$ - Alt1} DISTINCT [OrgID])'
                    },
                    qSortBy: {qSortByNumeric: 1}
                },{
                    qDef: {
                        qLabel: 'All Industry',
                        qDef: '=count({1} DISTINCT [OrgID])'
                    },
                    qSortBy: {qSortByNumeric: 1}
                }
            ],
            qInterColumnSortOrder: [1,0,2],
            qInitialDataFetch: [{
                qWidth: 4,
                qHeight: 2000,
                qTop: 0,
                qLeft: 0
            }]
        }
        
    }).then(function(cube) {
        cube.getLayout().then(function(layout) {
            var qMatrix = layout.qListObject.qDataPages[0].qMatrix;
            for(var key in qMatrix){
                Industries.push(qMatrix[key][0].qText);
            }
            console.log(Industries);
        });

        // If cube changes on server 
        cube.on('change', function() {
            console.log('Type Cube changed');
            cube.getLayout().then(function(layout) {
                var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
                // console.log("new Type data",JSON.stringify(qMatrix));
                // console.log("data",JSON.stringify(layout));
                Industries = [];
                for(var key in qMatrix){
                    var obj = {c: qMatrix[key][0].qText, s: qMatrix[key][1].qText, t: qMatrix[key][2].qText};
                    Industries.push(obj);
                }
                // console.log("new Type",Industries);
            })
        });
    })
    .catch(function(err) { console.log(err) })

})
.catch(function(err) {
    // Will throw if connection failed or missing appname property.
    console.log(err);
})


// Fetch a field
function selectField(fieldName, fieldValue){
    // SenseApp.getField("'['"+fieldName+"']'").then(function(field) {
    SenseApp.getField("["+fieldName+"]","Alt1").then(function(field) {
        // If field changes on server 
        field.on('change', function() {
            console.log('Field changed');
        });
        
        // Issue a selection on the field handle.
        field.select(fieldValue).then(console.log, console.log); 

    });
}

// Fetch a field
function filter(fieldName, fieldValue){
    SenseApp.getField("["+fieldName+"]").then(function(field) {
        // Issue a selection on the field handle.
        field.select(fieldValue).then(console.log, console.log); 
    });
}

// Clear a field
function clearField(fieldName){
    SenseApp.getField("["+fieldName+"]","Alt1").then(function(field) {
        
        // Issue a selection on the field handle.
        field.clear().then(console.log, console.log);

    });
}

// Clear all fields
function clearAll(){
    SenseApp.clearAll().then(console.log, console.log);
}

// Clear all selections
function clearSelections(fieldName){
    SenseApp.clearAll(true,"$").then(console.log, console.log);
    // SenseApp.getField("["+fieldName+"]","Alt1").then(function(field) {
    //     field.clearAllButThis().then(console.log, console.log);
    // });
}
