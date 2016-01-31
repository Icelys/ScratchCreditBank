var Scratch = require("scratch-api");
var Q = require("q");
var gotten;
var response = "Nothing";

var BANK_ID = 96076345;
var THIS_PROJ = 96096982;


function encode(text){
	var alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890!@#$%^&*()-=_+[]\\{}|;':\",./<>?`~ ";
	var next;
	var result="";

	for(var i=0;i<text.length;i++){
		next=(alpha.indexOf(text[i])+1).toString();
		if(next.length==1){
			next="0"+next;
		}
		result+=next;
	}
	return result;
}	

function decode(text){
	var alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890!@#$%^&*()-=_+[]\\{}|;':\",./<>?`~ ";
	var next;
	var result="";
	var text2 = text.toString();

	for(var i=0;i<text.toString().length;i+=2){
		next=alpha[parseInt(text2[i]+text2[i+1])-1];
		result+=next;
	}

	return result;

}




function get(id, varname, callback){

	Scratch.UserSession.load(function(err, user) {
		if(err) console.log(err);
	    user.cloudSession(id, function(err, cloud) {

	    	cloud.on("set", function(name, val) {	
	    		callback(cloud.get("☁ "+varname));	
	    	});
	    });
	});
}

function varOf(id, varname){
	var deferred = Q.defer();
	get(id, varname, function(v){
		gotten = v;
		deferred.resolve();
	});

	return deferred.promise;

}


function index(arr, item, k){
	for(var i = 0; i<arr.length; i++){
		if(arr[i][k]==item){
			return i;
			break;
		}
	}
	return -1;
}

function withdraw (username, amount, recipient) {
	var deferred = Q.defer();
	var amm = 0;

	Scratch.UserSession.load(function(err, user) {
		if(err) console.error(err);

		user.cloudSession(BANK_ID, function(err, cloud) {
			cloud.on("set", function(n, v){

				if(amm < 1){
					amm++;

					var allData = cloud.get("☁ Data");

					var idIndex = -1;
					var transIndex = -1;
					response = "Nothing";
					var newA = [];
					var newB;

					var indv = decode(allData).split("|");
					for(var i = 0; i<indv.length; i++){
						indv[i] = indv[i].split("/");
					}
					idIndex = index(indv, username, 0);
					transIndex = index(indv, recipient, 0);
					

					if(idIndex == -1 || transIndex == -1){
						throw "User doesn't exist";
					}
					
					if(indv[idIndex][1]-amount>=0) { // Can spend that many credits
						indv[idIndex][1] = parseInt(indv[idIndex][1]) - amount; //Withdraw
						indv[transIndex][1] = parseInt(indv[transIndex][1]) + parseInt(amount);
						response = amount + " credits withdrawn.";
					} else {
						response = "Sorry, you don't have that many credits.";
					}

					for(i = 0; i<indv.length; i++){

						newA.push(indv[i][0]+"/"+indv[i][1])
					}

					newB = newA.join("|");

					cloud.set("☁ Data", encode(newB));

					deferred.resolve();
				} else {

					deferred.resolve();
				}

			});
		});
	});

	return deferred.promise;

}

function doWithdraw(w, a, r){
	withdraw(w, a, r).then(function(){

		console.log("Done request; Status: %s", response);

	}).then(function(){

		Scratch.UserSession.load(function(err, user) {
			user.cloudSession(THIS_PROJ, function(err, cloud) {
				cloud.set("☁ R", encode(response));
			});
		});

	});
}

var num = 0;
var prec = 0;
var ready = "y"
var lastTransID;


function doAllStuff(cloud, n, v){
	var deferred = Q.defer();

	if(n == "☁ Listen"){

		ready = "n"
		num ++;
		console.log(num);
		if (num>1){
			prec = v;


			var rData = decode(cloud.get("☁ Listen")).split("|");

			if(rData[3]!= lastTransID){
				lastTransID = rData[3];

				doWithdraw(rData[0], rData[1], rData[2]);
			} else {
				console.log("Ditto ID!");
			}

			deferred.resolve();


		} else {
			ready = "y"
		}
	} else {
		deferred.resolve();
	}
	return deferred.promise;
}


Scratch.UserSession.load(function(err, user) {
	user.cloudSession(THIS_PROJ, function(err, cloud) {
		cloud.on("set", function(n, v) {
			if(ready == "y"){
				doAllStuff(cloud, n, v).then(function(){
					ready = "y";
				});
			}
		});
	});
})
