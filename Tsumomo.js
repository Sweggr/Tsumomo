	/*
						TSUMOMO IRC BOT

		Tsumomo is an IRC chat bot designed as a controller for
		a  text-based  MMORPG  with an IRC interface written in
		JavaScript for Node.js. 

		Tsumomo uses the node-irc library for connectivity and 
		communication. API available at: https://goo.gl/w9rsns
		
		-Segger 2015
	*/


var irc = require('irc');
var fs = require('fs');
var fight = require('./fight');
//var fiend = require('./fiend');

	//MAIN TSUMOMO OBJECT
Tsumomo = function(server){
	if (!server){this.server="irc.rizon.net";} else{this.server= server;}
	
	var self = this; 				//Gives local context reference to events
	this.version = "0.7";
	this.name= "Tsumomo2[Beta]";	//Nick
	this.options = { 				//IRC configuration object
		userName: "TsumomoBeta",
		realName: "TsumomoBETA",
		channels:["#momoLab"],
	};
	this.Players = {};
	this.momoMart = {};
	this.Queue = {};
	this.path = "./"+self.server+"_data.json"
	console.log("\n        \x1b[32m [Booting %s FW.%s on %s]  \x1b[0m \n",this.name,this.version,this.server);
	this.tsumomo = new irc.Client(this.server,this.name,this.options);
	



	/*
				INTERNAL UTILITY FUNCTIONS
		Provides various internally used functions
	*/

	//Saves players, mart data
	this.save = function(verbose){
		var data = {};
		data.Players = self.Players;
		data.momoMart = self.momoMart;
		var dataString = JSON.stringify(data);
		fs.writeFile(self.path,dataString);
		if (verbose){
			console.log("					[Data Saved]");
		}
	}

	//Loads save data from JSON
	this.load = function(){
		fs.readFile(self.path,"utf8",
			function(err,dataString){
				if (err){
					console.log("               ! ! ! ERROR LOADING FILE ! ! !\n");
					return;
				}else{
					console.log("                [Data Loaded Successfully]\n");
					data = JSON.parse(dataString);
					self.Players = data.Players;
					self.momoMart = data.momoMart;
				}
			}
		);
	}
	this.load();

	//Random number generator: min,max,[rounding(bool)]
	this.RNG = function(min,max,INT){
		INT = typeof INT !== "undefined" ? INT: 
		max -= min-1
		var RNG = (Math.random()*max)+min;
		RNG = Math.floor(RNG)
		return RNG;
	};

	//Concatenate args to string 'cat("woo: %s",value)'
	this.cat = function(str) {
	    var args =[].slice.call(arguments, 1),
	        i =0;
	    	return str.replace(/%s/g, function() {return args[i++];}
	    );
	};

	//Returns the current time [ALPHA]
	this.now = function(){
		var time = new Date();
		return time;		
	}

		//New player prototype, accepts object for defaults [['key',value]...]
	this.player = function(nick,defaults){
		this.nick = nick;
		this.yen = 0;
		this.yenTimer = 0;
		fightTimer = 0;
		this.level = 3;
		this.xp = 0;
		this.str = 8;
		this.def = 3;
		this.hp = 15;
		this.hpMax = this.hp;
		this.wearing = {};
		this.wielding = {};
		this.inventory = [];
		this.fiend = undefined;
	}
	



	/*			
						IRC FUNCTIONALITY
				Defines Tsumomo's IRC capabilities
	*/        
	
	//Send message to channel or nick.
	this.say = function(target,text){
		self.tsumomo.say(target,text)
		console.log("Tsumomo| "+text);
	};

	this.pm = function(nick,text){
		self.tsumomo.notice(nick,text);
		console.log("->"+nick.substring(0,10)+"<-",text);
	};

	//Request to check user status; Queue nick and command.
	this.requestStatus = function(nick,target,text){
		self.tsumomo.say("NickServ","STATUS "+nick)
		self.Queue[nick] = [target,text];
	};

	//Processes status replies and creates new players.
	this.processStatus = function(nick,text){
		var status = text.split(" ")
		var nick = status[1]
		var status = status[2]
		if (status == "3"){
			self.Players[nick] = new self.player(nick);
			console.log("Added user: ",nick);
			self.msgProcess(nick,self.Queue[nick][0],self.Queue[nick][1]) //Runs queued command if OK

		}else{
			//console.log(nick+" not identified.");
		}
		delete self.Queue[nick];
	};




	/*
						CHAT COMMANDS
		Defines actions which trigger on player input
	*/
	this.commands = ["!yen","!stats"];

	//Gives user random amount of yen.
	this.yen = function(nick,target,text){
		var yen = self.RNG(1,20);
		self.Players[nick].yen += yen;
		var wallet = self.Players[nick].yen;
		var display = self.cat("%s got ¥%s yen! You now have ¥%s!",nick,yen,wallet);
		self.say(target,display);
	};

	//Display user information
	this.stats = function(nick,target,text){
		text = text.split(" ");
		if (text.length>1){nick = text[1];}
		if (!self.Players[nick]){
			self.say(target,"Couldn't find "+nick);
			return;
		}
		var p = self.Players[nick];
		var display = cat("%s | ¥%s | LVL %s [%s XP] | %s/%sHP %s STR %s DEF | Wielding: %s | Wearing: %s |",nick,p.yen,p.level,p.xp,p.hp,p.hpMax,p.str,p.def,p.wearing,p.wielding);
		self.say(target,display);
	};

	//Fight fiends [OUTSOURCE FILE]
	this.fight = function(nick,target,text){
		fight.npc(self,target,Players[nick]);
		
	};

	//Resets a player's stats 
	this.reset = function(nick,target,text){
		text = text.split(" ");
		if (text.length>1 & (nick =="Segger"|| nick=="mobiSegger")){nick=text[1];}
		if (!self.Players[nick]){self.say(target,"Couldn't find "+nick); return;}
		self.Players[nick] = new this.player(nick);
		self.say(target,nick+"'s stats were reset!!")
	};

	this.rez = function(nick,target,text){
		self.say(target,nick+" was brought back to life!");
		Players[nick].hp = Players[nick].hpMax;
	};



	//Wildcard function for debugging.
	this.test = function(nick,target,text){
		console.log("\n Running debug function.\n");
	};




	/*
					IRC CALLBACKS
			Defines callbacks for IRC events.
	*/

	//Runs upon connection to server.
	this.connected = function(message){
		console.log("Connection to "+self.server+" successful. Got message:")
		console.log(message.args[1])
		self.tsumomo.say("nickserv","identify bacawn")
	}
	this.tsumomo.addListener("registered",this.connected);

	//Runs upon user connection to channel.
	this.join = function(channel,nick,message){
		//console.log("\nSuccessfully joined "+channel+"\n");
		//self.say(channel,self.name+" "+self.version);
	}
	this.tsumomo.addListener("join",this.join)

	//Runs when Tsumomo receives a notice.
	this.noticed = function(nick,to,text,message){
		var notice = text.split(" ")
		if (notice[0] == "STATUS"){
			self.processStatus(nick,text)
		}
	}
	this.tsumomo.addListener("notice",this.noticed);

	//Handles incoming messages.
	this.msgProcess = function(nick, target, text, message){
		console.log(nick.substring(0,10)+"| "+text) //Display chat messages
		var command = text.split(" ");

		if (!(nick in self.Players)){
			self.requestStatus(nick,target,text);
			return undefined;
		} 

		switch(command[0].toLowerCase()){
			case "!yen": self.yen(nick,target,text); break;
			case "!test": self.test(nick,target,text); break;
			case "!save": self.save(true); break;
			case "!stats": self.stats(nick,target,text); break;
			case "!fight": self.fight(nick,target,text); break;
			case "!reset": self.reset(nick,target,text); break;
			case "!rez": self.rez(nick,target,text); break;
		}
		self.save();
	}
	this.tsumomo.addListener("message",this.msgProcess);
	
	
	this.handleError = function(message){
		 console.log('Error: ', message)
	}

}

process.stdout.write('\033c'); //Clear screen

Tsumomo()