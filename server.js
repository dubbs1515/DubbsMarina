/***********************************************************************************
 Author: Christopher Dubbs
 API Name: Basic Marina API
 Date Last Modified: October 21st, 2018
 Last Modified By: Christopher Dubbs
 Hosting: Google Cloud AppEngine and Google Cloud Datastore
***********************************************************************************/

const express = require('express');
const app = express(); 
const Datastore = require('@google-cloud/datastore');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 5015;
var path = require("path");
app.use(express.static(__dirname));

const projectId = 'build-a-rest-api-dubbsc';
const datastore = new Datastore({
	projectId: projectId,
});

// Express Routing
const router = express.Router();

// Express Middleware
app.use(bodyParser.json());

// Marina Kinds (akin to RDB tables)
const SHIP = "Ship";    // Kind
const SLIP = "Slip";    // Kind

// GLOBALS
const ROOT_URL = "build-a-rest-api-dubbsc.appspot.com"
//const ROOT_URL = "localhost:5015/"

/***********************************************************************************
 * HELPER FUNCTIONS  
 **********************************************************************************/
 /***********************************************************************************
 * Name: fromDataStore
 * Description: Helper function for datastore interaction.
 **********************************************************************************/
function fromDataStore(item) {
    item.id = item[Datastore.KEY].id;
    return item;
}

 /***********************************************************************************
 * Name: getTodaysDate
 * Description: Returns the current date as a string (MM/DD/YYYY).
 **********************************************************************************/
function getTodaysDate() {
    let date = new Date();
    let Month = (date.getMonth() + 1).toString();
    let Day = date.getDate().toString();
    let Year = date.getFullYear().toString();
    let today_date = Month + '/' + Day + '/' + Year;

    return today_date;
}


 /***********************************************************************************
 * Name: addCurShipInfo
 * Description: Checks the list of slips for a ship.
 **********************************************************************************/
function addCurShipUrl(slip) {
    if(slip.current_boat != null) {
        console.log(slip.current_boat);
        slip.current_boat_url = ROOT_URL + '/ships/' + slip.current_boat;
        console.log("Added URL property: " + slip.current_boat_url);
    }
}




/***********************************************************************************
 * MARINA MODEL FUNCTIONS  (Used to interact with datastore)
 **********************************************************************************/

 /***********************************************************************************
 * Name: get_entities
 * Description: Returns the entities held in the datastore, as specified by the
 *  entity "kind" argument (i.e. SHIP or SLIP)
 **********************************************************************************/
// 
function get_entities(kind) {
    const q = datastore.createQuery(kind); // Create Query
    // Run Query
    return datastore.runQuery(q).then((entities) => {
        return entities[0].map(fromDataStore);
    });
}

 /***********************************************************************************
 * Name: get_entity
 * Description: Returns the entity held in the datastore, as specified by the
 *  entity "kind" argument (i.e. SHIP or SLIP) and the id argument
 **********************************************************************************/
function get_entity(kind, id) {
    let key = datastore.key([kind, parseInt(id, 10)]);
    const q = datastore.createQuery(kind).filter('__key__', '=', key); 
    return datastore.runQuery(q).then((entity) => {                 
        return entity[0].map(fromDataStore);
    });
}

/***********************************************************************************
 * Name: post_ship
 * Description: Adds a new ship to the datastore.
 **********************************************************************************/
function post_ship(name, type, length) {
    let key = datastore.key(SHIP); // Key creation
    const new_ship = {"name": name, "type": type, "length": length};
    return datastore.save({"key": key, "data": new_ship})
        .then(() => {return key}); // Return key of new ship
}

/***********************************************************************************
 * Name: post_slip
 * Description: Adds a new slip to the datastore.
 **********************************************************************************/
function post_slip(number) {
    let key = datastore.key(SLIP); // Key creation
    const new_slip = {"number": number, "current_boat": null, "arrival_date": null};
    return datastore.save({"key": key, "data": new_slip})
        .then(() => {return key});  // Return key of new slip
}


/***********************************************************************************
 * Name: delete_entity
 * Description: Deletes the entity specified by the entity kind and id arguments 
 *  from the datastore. 
 **********************************************************************************/
// Pass kind of entity kind (i.e. SHIP or SLIP)
function delete_entity(kind, id) {
    const key = datastore.key([kind, parseInt(id, 10)]);
    return datastore.delete(key);
}

/***********************************************************************************
 * Name: put_ship
 * Description: Add a ship to the datastore.
 **********************************************************************************/
function put_ship(id, name, type, length) {
    const key = datastore.key([SHIP, parseInt(id,10)]);
    const ship = {"name": name, "type": type, "length": length};
    return datastore.save({"key": key, "data": ship});
}

/***********************************************************************************
 * Name: put_slip
 * Description: Add a slip to the datastore. 
 **********************************************************************************/
function put_slip(id, number, current_boat = null, arrival_date = null) {
    const key = datastore.key([SLIP, parseInt(id,10)]);
    const slip = {"number": number, "current_boat": current_boat, "arrival_date": arrival_date};
    return datastore.upsert({"key": key, "data": slip});
}

/***********************************************************************************
 * Name: get_slip_prop
 * Description: Returns a list of entities matching the property to filter by.
 **********************************************************************************/
function get_entities_prop(kind, fil_prop, fil_val) {
    console.log("Filter property: " + fil_prop);
    console.log("Type of Property value: " + typeof fil_prop);
    console.log("Filter value: " + fil_val);
    console.log("Type of Filter value: " + typeof fil_val);
    const q = datastore.createQuery(SLIP).filter(fil_prop, '=' , fil_val); // Create Query
    // Run Query
    return datastore.runQuery(q).then((entities) => {
        return entities[0].map(fromDataStore);
    });
}

 /***********************************************************************************
 * END OF MARINA MODEL FUNCTIONS
 **********************************************************************************/





/***********************************************************************************
 * MARINA CONTROLLER FUNCTIONS (Handle routing)
 **********************************************************************************/

/***********************************************************************************
 * Route: GET /ships
 * Description: Returns a list of ships currently stored in the datastore.
 **********************************************************************************/
router.get('/ships', function(req, res) {
    const ships = get_entities(SHIP)
    .then( (ships) => {
        res.status(200).json(ships);
    });
});

/***********************************************************************************
 * Route: GET /slips
 * Description: Returns a list of slips currently stored in the datastore.
 **********************************************************************************/
router.get('/slips', function(req, res) {
    const slips = get_entities(SLIP)
    .then((slips) => {
        res.status(200).json(slips);
    });
});

/***********************************************************************************
 * Route: GET /ships/:id
 * Description: Returns the ship spcefied by the id passed in the URL.
 **********************************************************************************/
router.get('/ships/:id', function(req, res) {
    let ship = get_entity(SHIP, req.params.id)
    .then((ship) => {
        if(ship[0] == null) {
            res.status(404).send("Cannot find Ship, id: " + req.params.id + ", in the datastore.");
        } else {
            res.status(200).json(ship[0]);
        }
    });
});

/***********************************************************************************
 * Route:  GET /slips/:id
 * Description: Returns the ship spcefied by the id passed in the URL.
 **********************************************************************************/
router.get('/slips/:id', function(req, res) {
    let slip = get_entity(SLIP, req.params.id)
    .then((slip) => {
        if(slip[0] == null) {
            res.status(404).send("Cannot find Slip, id: " + req.params.id + ", in the datastore.");
        } else {
            addCurShipUrl(slip[0]);    // Add url for ship if docked
            res.status(200).json(slip[0]);
        }
    });
});

/***********************************************************************************
 * Route: POST /ships
 * Description: Add a new ship to the datastore.
 **********************************************************************************/
router.post('/ships', function(req, res) {
    if((typeof req.body.name != "string") || (typeof req.body.type != "string") || (typeof req.body.length != "number"))
    {
        res.status(400).send("Invalid Ship POST Values Received"); 
    }  
    else 
    {
        post_ship(req.body.name, req.body.type, req.body.length)
        .then( key => {
            res.status(200).send('{ "id": ' + key.id + ' }');
        });
    }
});

/***********************************************************************************
 * Route: POST /slips
 * Description: Adds a new slip to the datastore.
 **********************************************************************************/
router.post('/slips', function(req, res) {
    if(typeof req.body.number != "number") 
    {
        res.status(400).send("Invalid Slip POST Values Received"); 
    }
    else
    {
        post_slip(req.body.number)
        .then( key =>  {
            res.status(200).send('{"id": ' + key.id + ' }');
        });
    }  
});

/***********************************************************************************
 * Route: DELETE /ships/:id
 * Description: Deletes a ship by id.
 **********************************************************************************/
router.delete('/ships/:id', function(req,res) {
    // First, free slip if applicable 
    let filterVal = req.params.id;
    let filterProperty = "current_boat";

    get_entities_prop(SLIP, filterProperty, filterVal)
    .then((currSlip) => {
        // Free ship from slip if ship was docked
        if(currSlip[0] != null) {
            console.log("Ship to be deleted was docked, freeing slip: " + currSlip[0].id);
            // Free slip
            put_slip(currSlip[0].id, currSlip[0].number);
        }
        delete_entity(SHIP, req.params.id)
        .then(res.status(200).end());
    });
}); 

/***********************************************************************************
 * Route: DELETE /slips/:id
 * Description: Deletes a slip by id.
 **********************************************************************************/
router.delete('/slips/:id', function(req, res) {
    // Ship automatically "At Sea", since state not maintained in Ship model.
    delete_entity(SLIP, req.params.id)
        .then(res.status(200).end())
        .catch(e => {
            console.log(e.message);
            res.status(400).send(e.message);
        });
});

/***********************************************************************************
 * Route: PUT /ships/:ids
 * Description: Update a ship's properties by ship id.
 **********************************************************************************/
router.put('/ships/:id', function(req, res) {

    if((typeof req.body.name != "string") || (typeof req.body.type != "string") || (typeof req.body.length != "number"))
    {
        res.status(400).send("Invalid Ship PUT Values Received"); 
    }  
    else 
    {
        put_ship(req.params.id, req.body.name, req.body.type, req.body.length)
        .then(res.status(200).end())
        .catch(e => {
            console.log(e.message);
            res.status(400).send(e.message);
        });
    }
});

/***********************************************************************************
 * Route: PUT /slips/:id
 * Description: Update a slip's properties by slip id. 
 **********************************************************************************/
router.put('/slips/:id', function(req, res) {
    if(typeof req.body.number != "number") 
    {
        res.status(400).send("Invalid Slip PUT Values Received"); 
    }
    else
    {
        put_slip(req.params.id, req.body.number, req.body.current_boat, req.body.arrival_date)
        .then(res.status(200).end())
        .catch(e => {
            console.log(e.message);
            res.status(400).send(e.message);
         });
    } 
    
});


/***********************************************************************************
 * Route: PUT /slips/:slip_id/ships/:ship_id
 * Description: This route is used to dock a ship in a slip. Arrival date is 
 *      calculated automatically for ease of use per the date of the docking. Arrival 
 *      date may be set manually via a PUT request to '/slips/:id' if desired. 
 **********************************************************************************/
router.put('/slips/:slip_id/ships/:ship_id', function(req, res) {
    // First, free current slip if already docked
    let filterVal = req.params.ship_id;
    let filterProperty = "current_boat";

    get_entities_prop(SLIP, filterProperty, filterVal)
    .then((currSlip) => {
        console.log("CURRENT SLIP INFO: " + currSlip) 
        console.log("Passed Ship Id: " + req.params.ship_id);
        console.log("Passed Slip Id: " + req.params.slip_id);
        // Free ship from slip if already docked, and not requested slip
        if(currSlip[0] != null) {
            if(currSlip[0].id != req.params.slip_id) {
                console.log("Current Slip Info: " + currSlip[0].id);
                // Free slip
                put_slip(currSlip[0].id, currSlip[0].number);
            } 
        }
        get_entity(SLIP, req.params.slip_id) // Returns a promise
        .then((slip) => {
            // If slip is available dock ship, otherwise return forbidden
            let arrival_date = getTodaysDate();
            if(slip[0].current_boat == null) {
                put_slip(req.params.slip_id, slip[0].number, req.params.ship_id, arrival_date)
                .then(res.status(200).end());
            } else {
                res.status(403).end();
            } 
        });
    });
});


 /***********************************************************************************
 * Route: DELETE /slips/:slip_id/ships/:ship_id
 * Description: Free a slip by ids.
 **********************************************************************************/
router.delete('/slips/:slip_id/ships/:ship_id', function(req, res) {
    
    console.log("Undock Ship, at Slip id: ", + req.params.slip_id);
    get_entity(SLIP, req.params.slip_id) // Retuns a promise
    .then((slip) => {
        put_slip(req.params.slip_id, slip[0].number)    // Vacate slip (i.e. slip free, ship "At Sea")
        .then(res.status(200).end());
    });
});

/***********************************************************************************
 * END OF MARINA CONTROLLER FUNCTIONS
 **********************************************************************************/

app.use(express.static("public"));
app.use('', router);       // Setup routing middleware


// Listen on App-Engine Port or 5015
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}... :)`);
});




